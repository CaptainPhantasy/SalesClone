/**
 * @fileoverview Twilio webhook handlers for voice call processing
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This module provides webhook endpoints for:
 * - Incoming call handling (generates TwiML)
 * - Speech processing (transcription and AI response)
 * - Call status updates (tracking lifecycle)
 * - Outbound call initiation (generates TwiML)
 *
 * All endpoints return TwiML (text/xml) for Twilio
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { VoiceResponse } = twilio.twiml;

/**
 * Generate unique request ID for tracking
 * @returns {string} UUID v4 string
 * @created 2025-10-01T18:00:00Z
 */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create router with dependencies injected
 * @param {Object} deps - Dependencies
 * @param {Object} deps.agents - AI agents (voice, conversation, analytics, integration)
 * @param {Object} deps.queueManager - Queue manager for async job processing
 * @returns {express.Router} Configured Express router
 * @created 2025-10-01T18:00:00Z
 */
function createWebhookRouter(deps) {
  const { agents, queueManager } = deps;

  /**
   * POST /webhooks/voice - Handle incoming call
   * Generates TwiML response for initial call handling
   *
   * @param {Object} req.body - Twilio request payload
   * @param {string} req.body.CallSid - Unique call identifier
   * @param {string} req.body.From - Caller phone number
   * @param {string} req.body.To - Called phone number
   * @param {string} req.body.CallStatus - Current call status
   * @returns {string} TwiML response (text/xml)
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/voice', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [webhooks/voice] Incoming call webhook - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [INFO] [webhooks/voice] CallSid: ${req.body.CallSid}, From: ${req.body.From}, To: ${req.body.To}`);

    try {
      // Validate required fields
      if (!req.body.CallSid || !req.body.From) {
        console.error(`[${timestamp}] [ERROR] [webhooks/voice] Missing required fields in webhook payload`);

        // Return error TwiML
        const twiml = new VoiceResponse();
        twiml.say('An error occurred. Missing required call information.');
        twiml.hangup();

        res.type('text/xml');
        return res.send(twiml.toString());
      }

      // Use VoiceGatewayAgent to handle incoming call
      console.log(`[${timestamp}] [INFO] [webhooks/voice] Calling VoiceGatewayAgent.handleIncomingCall...`);
      const result = await agents.voice.handleIncomingCall(req.body);

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [webhooks/voice] Successfully generated TwiML response`);

        // Queue async job for call analytics (fire-and-forget)
        try {
          await queueManager.addJob('voice-analytics', 'call-started', {
            callSid: req.body.CallSid,
            from: req.body.From,
            to: req.body.To,
            timestamp: timestamp,
          });
          console.log(`[${timestamp}] [INFO] [webhooks/voice] Queued analytics job for call ${req.body.CallSid}`);
        } catch (queueError) {
          // Don't fail the request if queue fails
          console.error(`[${timestamp}] [ERROR] [webhooks/voice] Failed to queue analytics job:`, queueError);
        }

        // Return TwiML response
        res.type('text/xml');
        return res.send(result.data.twiml);
      } else {
        console.error(`[${timestamp}] [ERROR] [webhooks/voice] VoiceGatewayAgent returned error: ${result.error}`);

        // Return error TwiML
        const twiml = new VoiceResponse();
        twiml.say('An error occurred processing your call. Please try again.');
        twiml.hangup();

        res.type('text/xml');
        return res.send(twiml.toString());
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [webhooks/voice] Unhandled error in voice webhook:`, error);

      // Return generic error TwiML
      const twiml = new VoiceResponse();
      twiml.say('A system error occurred. Please try again later.');
      twiml.hangup();

      res.type('text/xml');
      return res.status(500).send(twiml.toString());
    }
  });

  /**
   * POST /webhooks/process-speech - Process speech from caller
   * Handles speech recognition results and generates AI response
   *
   * @param {Object} req.body - Twilio request payload
   * @param {string} req.body.CallSid - Unique call identifier
   * @param {string} req.body.SpeechResult - Transcribed speech text
   * @param {string} req.body.Confidence - Speech recognition confidence (0-1)
   * @returns {string} TwiML response with AI-generated speech (text/xml)
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/process-speech', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [webhooks/process-speech] Speech processing webhook - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [INFO] [webhooks/process-speech] CallSid: ${req.body.CallSid}`);
    console.log(`[${timestamp}] [DEBUG] [webhooks/process-speech] SpeechResult: ${req.body.SpeechResult}`);
    console.log(`[${timestamp}] [DEBUG] [webhooks/process-speech] Confidence: ${req.body.Confidence}`);

    try {
      // Validate required fields
      if (!req.body.CallSid || !req.body.SpeechResult) {
        console.error(`[${timestamp}] [ERROR] [webhooks/process-speech] Missing required fields`);

        // Return error TwiML
        const twiml = new VoiceResponse();
        twiml.say('I did not understand that. Please try again.');
        twiml.redirect('/webhooks/voice');

        res.type('text/xml');
        return res.send(twiml.toString());
      }

      // Use ConversationAgent to process speech and generate response
      console.log(`[${timestamp}] [INFO] [webhooks/process-speech] Calling ConversationAgent.processSpeech...`);
      const result = await agents.conversation.processSpeech({
        callSid: req.body.CallSid,
        speechResult: req.body.SpeechResult,
        confidence: parseFloat(req.body.Confidence) || 0,
        from: req.body.From,
      });

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [webhooks/process-speech] Successfully generated AI response`);

        // Queue async job for conversation analytics
        try {
          await queueManager.addJob('voice-analytics', 'conversation-turn', {
            callSid: req.body.CallSid,
            userInput: req.body.SpeechResult,
            aiResponse: result.data.response,
            confidence: req.body.Confidence,
            timestamp: timestamp,
          });
          console.log(`[${timestamp}] [INFO] [webhooks/process-speech] Queued conversation analytics job`);
        } catch (queueError) {
          console.error(`[${timestamp}] [ERROR] [webhooks/process-speech] Failed to queue analytics:`, queueError);
        }

        // Return TwiML with AI response
        res.type('text/xml');
        return res.send(result.data.twiml);
      } else {
        console.error(`[${timestamp}] [ERROR] [webhooks/process-speech] ConversationAgent error: ${result.error}`);

        // Return error TwiML
        const twiml = new VoiceResponse();
        twiml.say('I encountered an error processing your request. Please try again.');
        twiml.redirect('/webhooks/voice');

        res.type('text/xml');
        return res.send(twiml.toString());
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [webhooks/process-speech] Unhandled error:`, error);

      // Return error TwiML
      const twiml = new VoiceResponse();
      twiml.say('A system error occurred. Returning to main menu.');
      twiml.redirect('/webhooks/voice');

      res.type('text/xml');
      return res.status(500).send(twiml.toString());
    }
  });

  /**
   * POST /webhooks/status - Handle call status updates
   * Receives status callbacks from Twilio (completed, failed, busy, etc.)
   *
   * @param {Object} req.body - Twilio request payload
   * @param {string} req.body.CallSid - Unique call identifier
   * @param {string} req.body.CallStatus - Current call status
   * @param {string} req.body.CallDuration - Call duration in seconds
   * @returns {string} Empty TwiML response (text/xml)
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/status', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [webhooks/status] Call status update - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [INFO] [webhooks/status] CallSid: ${req.body.CallSid}, Status: ${req.body.CallStatus}`);

    try {
      // Validate required fields
      if (!req.body.CallSid || !req.body.CallStatus) {
        console.error(`[${timestamp}] [ERROR] [webhooks/status] Missing required fields`);
        res.type('text/xml');
        return res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // Queue async job for status update processing
      // This is fire-and-forget - we don't wait for completion
      try {
        await queueManager.addJob('voice-calls', 'status-update', {
          callSid: req.body.CallSid,
          callStatus: req.body.CallStatus,
          callDuration: req.body.CallDuration,
          timestamp: timestamp,
          rawPayload: req.body,
        });
        console.log(`[${timestamp}] [INFO] [webhooks/status] Queued status update job for call ${req.body.CallSid}`);
      } catch (queueError) {
        console.error(`[${timestamp}] [ERROR] [webhooks/status] Failed to queue status update:`, queueError);
      }

      // If call is completed, trigger analytics processing
      if (req.body.CallStatus === 'completed') {
        console.log(`[${timestamp}] [INFO] [webhooks/status] Call completed, triggering final analytics`);

        try {
          await queueManager.addJob('voice-analytics', 'call-completed', {
            callSid: req.body.CallSid,
            duration: req.body.CallDuration,
            timestamp: timestamp,
          });
          console.log(`[${timestamp}] [INFO] [webhooks/status] Queued call completion analytics`);
        } catch (queueError) {
          console.error(`[${timestamp}] [ERROR] [webhooks/status] Failed to queue completion analytics:`, queueError);
        }
      }

      // Return empty TwiML response
      res.type('text/xml');
      return res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [webhooks/status] Unhandled error:`, error);

      // Return empty TwiML even on error (status callbacks should not fail)
      res.type('text/xml');
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  /**
   * POST /webhooks/outbound - Generate TwiML for outbound calls
   * Used when initiating outbound calls via API
   *
   * @param {Object} req.body - Twilio request payload
   * @param {string} req.body.CallSid - Unique call identifier
   * @param {string} req.body.To - Recipient phone number
   * @param {string} req.body.message - Optional custom message to speak
   * @returns {string} TwiML response for outbound call (text/xml)
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/outbound', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [webhooks/outbound] Outbound call webhook - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [INFO] [webhooks/outbound] CallSid: ${req.body.CallSid}, To: ${req.body.To}`);

    try {
      // Use VoiceGatewayAgent to generate outbound TwiML
      const result = await agents.voice.generateOutboundTwiML({
        callSid: req.body.CallSid,
        to: req.body.To,
        from: req.body.From,
        message: req.body.message,
      });

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [webhooks/outbound] Successfully generated outbound TwiML`);

        // Queue analytics job
        try {
          await queueManager.addJob('voice-analytics', 'outbound-call-started', {
            callSid: req.body.CallSid,
            to: req.body.To,
            timestamp: timestamp,
          });
          console.log(`[${timestamp}] [INFO] [webhooks/outbound] Queued outbound call analytics`);
        } catch (queueError) {
          console.error(`[${timestamp}] [ERROR] [webhooks/outbound] Failed to queue analytics:`, queueError);
        }

        res.type('text/xml');
        return res.send(result.data.twiml);
      } else {
        console.error(`[${timestamp}] [ERROR] [webhooks/outbound] VoiceGatewayAgent error: ${result.error}`);

        // Return error TwiML
        const twiml = new VoiceResponse();
        twiml.say('An error occurred initiating this call. Please try again.');
        twiml.hangup();

        res.type('text/xml');
        return res.send(twiml.toString());
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [webhooks/outbound] Unhandled error:`, error);

      // Return error TwiML
      const twiml = new VoiceResponse();
      twiml.say('A system error occurred. Please contact support.');
      twiml.hangup();

      res.type('text/xml');
      return res.status(500).send(twiml.toString());
    }
  });

  return router;
}

/**
 * Export router factory function
 * Must be called with dependencies before mounting
 *
 * @example
 * const webhooksRouter = require('./routes/webhooks');
 * app.use('/webhooks', webhooksRouter({ agents, queueManager }));
 */
module.exports = createWebhookRouter;
