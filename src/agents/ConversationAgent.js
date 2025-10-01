/**
 * @fileoverview Main conversation orchestrator for AI-powered voice interactions
 * @author LegacyAI Subagent Fleet - Conversation Agent Builder
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This agent orchestrates conversational AI interactions including:
 * - Speech processing and transcription
 * - Context-aware response generation using Claude
 * - Conversation history management
 * - Sentiment analysis
 * - Message persistence to database
 * - TwiML response generation for Twilio
 */

const { BaseAgent } = require('../utils/BaseAgent');
const OpenAIService = require('../services/OpenAIService');
const AnthropicService = require('../services/AnthropicService');
const DatabaseService = require('../services/DatabaseService');

/**
 * System prompt for voice assistant
 * Guides Claude to provide concise, conversational responses suitable for voice interaction
 */
const VOICE_ASSISTANT_SYSTEM_PROMPT = `You are a helpful AI voice assistant. Keep responses concise and conversational for voice interaction.
Maximum 2-3 sentences per response.
Be natural, friendly, and professional.
If asked complex questions requiring detailed answers, summarize the key points.
Always acknowledge the customer's concern and provide value.`;

/**
 * Maximum number of messages to include in conversation context
 */
const MAX_CONTEXT_MESSAGES = 10;

/**
 * Maximum tokens for voice responses (ensures responses are brief)
 */
const MAX_VOICE_RESPONSE_TOKENS = 150;

/**
 * Minimum confidence score for speech recognition (0-1)
 */
const MIN_SPEECH_CONFIDENCE = 0.5;

class ConversationAgent extends BaseAgent {
  /**
   * Initialize ConversationAgent
   * @param {Object} config - Agent configuration from config module
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config) {
    super(config);

    console.log(`[${new Date().toISOString()}] [INFO] [ConversationAgent] Initializing ConversationAgent`);

    // Initialize AI services
    this.openaiService = new OpenAIService(config.openai);
    this.anthropicService = new AnthropicService(config.anthropic);

    // Initialize database service
    this.dbService = new DatabaseService();

    // Track conversation sessions in memory for quick access
    this.activeSessions = new Map();

    console.log(`[${new Date().toISOString()}] [INFO] [ConversationAgent] ConversationAgent initialized successfully`);
  }

  /**
   * Initialize agent and dependencies
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async initialize() {
    try {
      this.logger.info('Initializing ConversationAgent and dependencies');

      // Initialize database service
      await this.dbService.initialize();

      // Verify AI services are healthy
      const openaiHealth = await this.openaiService.healthCheck();
      const anthropicHealth = await this.anthropicService.healthCheck();

      if (!openaiHealth.healthy) {
        throw new Error('OpenAI service health check failed');
      }

      if (!anthropicHealth.healthy) {
        throw new Error('Anthropic service health check failed');
      }

      this.logger.info('ConversationAgent initialization complete - All services healthy');

    } catch (error) {
      this.logger.error('Failed to initialize ConversationAgent', error);
      throw error;
    }
  }

  /**
   * Process incoming speech from Twilio and generate AI response
   * @param {Object} speechData - Speech data from Twilio webhook
   * @param {string} speechData.CallSid - Twilio call SID
   * @param {string} speechData.SpeechResult - Transcribed speech text
   * @param {number} speechData.Confidence - Speech recognition confidence (0-1)
   * @param {string} [speechData.From] - Caller phone number
   * @returns {Promise<Object>} APIResponse with TwiML
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const response = await agent.processSpeech({
   *   CallSid: 'CA123456',
   *   SpeechResult: 'I need help with my order',
   *   Confidence: 0.95
   * });
   */
  async processSpeech(speechData) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`[${requestId}] Processing speech - CallSid: ${speechData.CallSid}, Confidence: ${speechData.Confidence}`);

      const { CallSid, SpeechResult, Confidence, From } = speechData;

      // Validate required fields
      if (!CallSid || !SpeechResult) {
        throw new Error('CallSid and SpeechResult are required');
      }

      // Check confidence threshold
      if (Confidence && Confidence < MIN_SPEECH_CONFIDENCE) {
        this.logger.warn(`[${requestId}] Low speech confidence: ${Confidence}`);

        // Ask user to repeat
        return {
          success: true,
          data: {
            twiml: this.generateRepeatRequestTwiML(),
            needsRepeat: true,
          },
          error: null,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }

      // Get conversation context from database
      const context = await this.getConversationContext(CallSid);

      // Generate AI response using Claude
      const aiResponse = await this.generateResponse(SpeechResult, context);

      // Log user message to database
      const conversationId = context.conversationId || CallSid;
      await this.logMessage(conversationId, 'user', SpeechResult, {
        confidence: Confidence,
        phoneNumber: From,
      });

      // Log assistant response to database
      await this.logMessage(conversationId, 'assistant', aiResponse.text, {
        model: aiResponse.model,
        tokensUsed: aiResponse.totalTokens,
        latencyMs: aiResponse.latencyMs,
      });

      // Analyze sentiment of user message
      const sentiment = await this.analyzeSentiment(SpeechResult);

      // Update conversation metadata with sentiment
      if (context.conversationId) {
        await this.updateConversationSentiment(context.conversationId, sentiment);
      }

      // Generate TwiML response
      const twiml = this.generateConversationTwiML(aiResponse.text);

      const totalLatency = Date.now() - startTime;

      this.logger.info(`[${requestId}] Speech processed successfully in ${totalLatency}ms - Sentiment: ${sentiment.score.toFixed(2)}`);

      return {
        success: true,
        data: {
          twiml,
          aiResponse: aiResponse.text,
          sentiment: sentiment,
          latencyMs: totalLatency,
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId,
      };

    } catch (error) {
      this.logger.error(`[${requestId}] Failed to process speech`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Generate AI response based on user input and conversation context
   * Uses Claude (Anthropic) for better reasoning and conversational quality
   * @param {string} userInput - User's message
   * @param {Object} context - Conversation context with message history
   * @returns {Promise<Object>} AI response object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const response = await agent.generateResponse('Hello', { messages: [] });
   */
  async generateResponse(userInput, context) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`[${requestId}] Generating AI response - Context messages: ${context.messages?.length || 0}`);

      // Build message array from context
      const messages = [...(context.messages || [])];

      // Add current user message
      messages.push({
        role: 'user',
        content: userInput,
      });

      // Use Claude for response generation (better reasoning)
      const response = await this.anthropicService.generateResponse(
        messages,
        VOICE_ASSISTANT_SYSTEM_PROMPT,
        {
          maxTokens: MAX_VOICE_RESPONSE_TOKENS,
          temperature: 0.7,
        }
      );

      this.logger.info(`[${requestId}] AI response generated - Tokens: ${response.totalTokens}, Latency: ${response.latencyMs}ms`);

      return response;

    } catch (error) {
      this.logger.error(`[${requestId}] Failed to generate AI response`, error);

      // Fallback response on error
      return {
        text: "I apologize, but I'm having trouble processing that right now. Could you please try again?",
        model: 'fallback',
        totalTokens: 0,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get conversation context including message history from database
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} Conversation context
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const context = await agent.getConversationContext('CA123456');
   */
  async getConversationContext(callSid) {
    try {
      this.logger.info(`Getting conversation context for call: ${callSid}`);

      // Check if we have cached session
      if (this.activeSessions.has(callSid)) {
        const cached = this.activeSessions.get(callSid);
        this.logger.debug(`Using cached session for call: ${callSid}`);
        return cached;
      }

      // Fetch conversation from database
      const conversationResult = await this.dbService.getConversationByCallSid(callSid);

      if (!conversationResult.success || !conversationResult.data) {
        this.logger.warn(`No conversation found for call: ${callSid}, returning empty context`);
        return {
          conversationId: null,
          callSid,
          messages: [],
          metadata: {},
        };
      }

      const conversation = conversationResult.data;

      // Fetch recent messages from database
      const messagesResult = await this.dbService.getConversationMessages(
        conversation.id,
        { limit: MAX_CONTEXT_MESSAGES, order: 'asc' }
      );

      // Transform messages to Claude format
      const messages = (messagesResult.data || []).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const context = {
        conversationId: conversation.id,
        callSid: conversation.call_sid,
        phoneNumber: conversation.phone_number,
        customerId: conversation.customer_id,
        messages,
        metadata: conversation.metadata || {},
        startedAt: conversation.started_at,
      };

      // Cache the session
      this.activeSessions.set(callSid, context);

      this.logger.info(`Context retrieved - Messages: ${messages.length}`);

      return context;

    } catch (error) {
      this.logger.error('Failed to get conversation context', error);

      // Return empty context on error
      return {
        conversationId: null,
        callSid,
        messages: [],
        metadata: {},
      };
    }
  }

  /**
   * Log message to database
   * @param {string} conversationId - Conversation UUID
   * @param {string} role - Message role ('user', 'assistant', 'system')
   * @param {string} content - Message content
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<Object>} APIResponse from database
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * await agent.logMessage('uuid', 'user', 'Hello', { confidence: 0.95 });
   */
  async logMessage(conversationId, role, content, metadata = {}) {
    try {
      this.logger.info(`Logging ${role} message to conversation: ${conversationId}`);

      const result = await this.dbService.createMessage(
        conversationId,
        role,
        content,
        metadata
      );

      if (!result.success) {
        this.logger.error('Failed to log message to database', result.error);
      }

      return result;

    } catch (error) {
      this.logger.error('Exception while logging message', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Analyze sentiment of text using simple heuristic approach
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const sentiment = await agent.analyzeSentiment('I love this service!');
   * console.log(sentiment.score); // 0.8
   */
  async analyzeSentiment(text) {
    try {
      this.logger.debug('Analyzing sentiment of text');

      // Simple sentiment analysis using keyword matching
      // In production, you could use a dedicated sentiment analysis API

      const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'fantastic', 'pleased', 'satisfied', 'thank'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'upset', 'disappointed', 'poor', 'worst'];
      const escalationWords = ['speak', 'manager', 'supervisor', 'escalate', 'complaint', 'lawyer', 'sue', 'cancel'];

      const lowerText = text.toLowerCase();
      const words = lowerText.split(/\s+/);

      let positiveCount = 0;
      let negativeCount = 0;
      let escalationCount = 0;

      // Count keyword matches
      for (const word of words) {
        if (positiveWords.some(pw => word.includes(pw))) {
          positiveCount++;
        }
        if (negativeWords.some(nw => word.includes(nw))) {
          negativeCount++;
        }
        if (escalationWords.some(ew => word.includes(ew))) {
          escalationCount++;
        }
      }

      // Calculate sentiment score (-1 to 1)
      const totalSentimentWords = positiveCount + negativeCount;
      let score = 0;

      if (totalSentimentWords > 0) {
        score = (positiveCount - negativeCount) / totalSentimentWords;
      }

      // Determine if escalation is needed
      const needsEscalation = escalationCount > 0 || (negativeCount > 2 && positiveCount === 0);

      const sentiment = {
        score,
        label: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
        needsEscalation,
        confidence: Math.min((totalSentimentWords + escalationCount) / 5, 1.0),
        details: {
          positiveCount,
          negativeCount,
          escalationCount,
        },
      };

      this.logger.debug(`Sentiment analysis complete - Score: ${score.toFixed(2)}, Label: ${sentiment.label}, Escalation: ${needsEscalation}`);

      return sentiment;

    } catch (error) {
      this.logger.error('Failed to analyze sentiment', error);

      // Return neutral sentiment on error
      return {
        score: 0,
        label: 'neutral',
        needsEscalation: false,
        confidence: 0,
        details: {},
      };
    }
  }

  /**
   * Update conversation sentiment score in database
   * @param {string} conversationId - Conversation UUID
   * @param {Object} sentiment - Sentiment analysis result
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  async updateConversationSentiment(conversationId, sentiment) {
    try {
      // Update conversation with sentiment and escalation flag
      await this.dbService.updateConversation(conversationId, {
        sentiment_score: sentiment.score,
        escalated: sentiment.needsEscalation,
      });

      if (sentiment.needsEscalation) {
        this.logger.warn(`Conversation ${conversationId} flagged for escalation`);
      }

    } catch (error) {
      this.logger.error('Failed to update conversation sentiment', error);
    }
  }

  /**
   * Generate TwiML response for continuing the conversation
   * @param {string} responseText - AI-generated response text
   * @returns {string} TwiML XML string
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  generateConversationTwiML(responseText) {
    // Generate TwiML for Twilio voice response
    // Uses <Say> to speak the response and <Gather> to collect next input
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${this.escapeXml(responseText)}</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate TwiML response requesting user to repeat
   * @returns {string} TwiML XML string
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  generateRepeatRequestTwiML() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I didn't quite catch that. Could you please repeat?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST"/>
  <Say voice="alice">I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Escape XML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Health check for ConversationAgent
   * @returns {Promise<Object>} Health check result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async healthCheck() {
    try {
      this.logger.info('Running ConversationAgent health check');

      // Check all dependent services
      const openaiHealth = await this.openaiService.healthCheck();
      const anthropicHealth = await this.anthropicService.healthCheck();

      const healthy = openaiHealth.healthy && anthropicHealth.healthy;

      return {
        healthy,
        details: {
          openai: openaiHealth,
          anthropic: anthropicHealth,
          activeSessions: this.activeSessions.size,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Health check failed', error);

      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Graceful shutdown
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down ConversationAgent');

      // Clear active sessions
      this.activeSessions.clear();

      this.logger.info('ConversationAgent shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

module.exports = ConversationAgent;
