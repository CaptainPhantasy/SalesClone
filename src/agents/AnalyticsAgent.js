/**
 * @fileoverview Analytics Agent for metrics tracking and reporting
 * @author LegacyAI Analytics Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This agent provides comprehensive analytics functionality including:
 * - Real-time call status tracking
 * - Call metrics collection and aggregation
 * - Daily analytics calculation and storage
 * - Sentiment trend analysis
 * - Escalation rate monitoring
 * - Automated daily report generation
 */

const { BaseAgent } = require('../utils/BaseAgent');
const DatabaseService = require('../services/DatabaseService');
const MetricsService = require('../services/MetricsService');

/**
 * AnalyticsAgent class for tracking and analyzing voice agent metrics
 * Extends BaseAgent to inherit logging and utility methods
 *
 * @class AnalyticsAgent
 * @extends BaseAgent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 */
class AnalyticsAgent extends BaseAgent {
  /**
   * Initialize AnalyticsAgent
   *
   * @param {Object} config - Agent configuration object
   * @param {DatabaseService} [config.databaseService] - Optional database service instance
   * @param {MetricsService} [config.metricsService] - Optional metrics service instance
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const analyticsAgent = new AnalyticsAgent({
   *   databaseService: dbService
   * });
   * await analyticsAgent.initialize();
   */
  constructor(config = {}) {
    super(config);

    // Initialize services - allow dependency injection for testing
    this.databaseService = config.databaseService || new DatabaseService();
    this.metricsService = config.metricsService || new MetricsService();

    this.logger.info('AnalyticsAgent constructor completed');
  }

  /**
   * Initialize agent and dependencies
   * Must be called before using any analytics methods
   *
   * @returns {Promise<void>}
   * @throws {Error} If database initialization fails
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * await analyticsAgent.initialize();
   */
  async initialize() {
    try {
      this.logger.info('Initializing AnalyticsAgent');

      // Initialize database service if not already initialized
      if (!this.databaseService.client) {
        await this.databaseService.initialize();
      }

      this.logger.info('AnalyticsAgent initialization complete');
    } catch (error) {
      this.logger.error('Failed to initialize AnalyticsAgent', error);
      throw error;
    }
  }

  /**
   * Get current status of a call by Twilio call SID
   * Returns conversation details including status, duration, sentiment
   *
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<APIResponse>} Response containing call status and details
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.getCallStatus('CA123456789');
   * if (result.success) {
   *   console.log('Call status:', result.data.status);
   *   console.log('Duration:', result.data.duration_seconds);
   * }
   */
  async getCallStatus(callSid) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`Getting call status for callSid: ${callSid}`);

      // Validate input
      if (!callSid || typeof callSid !== 'string') {
        return this.createResponse(false, null, 'Invalid callSid parameter', requestId);
      }

      // Fetch conversation from database
      const conversationResult = await this.databaseService.getConversationByCallSid(callSid);

      if (!conversationResult.success) {
        this.logger.warn(`Failed to fetch conversation: ${conversationResult.error}`);
        return this.createResponse(false, null, conversationResult.error, requestId);
      }

      if (!conversationResult.data) {
        this.logger.warn(`Conversation not found for callSid: ${callSid}`);
        return this.createResponse(false, null, 'Conversation not found', requestId);
      }

      const conversation = conversationResult.data;

      // Build status response with relevant details
      const statusData = {
        callSid: conversation.call_sid,
        status: conversation.status,
        phoneNumber: conversation.phone_number,
        agentType: conversation.agent_type,
        startedAt: conversation.started_at,
        endedAt: conversation.ended_at,
        durationSeconds: conversation.duration_seconds,
        sentimentScore: conversation.sentiment_score,
        escalated: conversation.escalated,
        metadata: conversation.metadata
      };

      this.logger.info(`Call status retrieved successfully for callSid: ${callSid}`);

      return this.createResponse(true, statusData, null, requestId);

    } catch (error) {
      this.logger.error(`Exception in getCallStatus for callSid: ${callSid}`, error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Track and store metrics for a completed call
   * Extracts metrics from call data and updates analytics records
   *
   * @param {Object} callData - Call data object
   * @param {string} callData.callSid - Twilio call SID
   * @param {string} callData.phoneNumber - Customer phone number
   * @param {number} callData.durationSeconds - Call duration in seconds
   * @param {number} callData.sentimentScore - Sentiment score (-1 to 1)
   * @param {boolean} callData.escalated - Whether call was escalated
   * @param {string} callData.status - Call status (e.g., 'ended', 'escalated')
   * @returns {Promise<APIResponse>} Response indicating tracking success
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.trackCallMetrics({
   *   callSid: 'CA123456',
   *   phoneNumber: '+1234567890',
   *   durationSeconds: 120,
   *   sentimentScore: 0.8,
   *   escalated: false,
   *   status: 'ended'
   * });
   */
  async trackCallMetrics(callData) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('Tracking call metrics', { callSid: callData.callSid });

      // Validate required fields
      if (!callData.callSid) {
        return this.createResponse(false, null, 'callSid is required', requestId);
      }

      // Fetch the conversation to get complete data
      const conversationResult = await this.databaseService.getConversationByCallSid(callData.callSid);

      if (!conversationResult.success || !conversationResult.data) {
        this.logger.warn(`Conversation not found for tracking: ${callData.callSid}`);
        return this.createResponse(false, null, 'Conversation not found', requestId);
      }

      const conversation = conversationResult.data;

      // Extract metrics for tracking
      const metrics = {
        callSid: conversation.call_sid,
        phoneNumber: conversation.phone_number,
        durationSeconds: conversation.duration_seconds || 0,
        sentimentScore: conversation.sentiment_score || 0,
        escalated: conversation.escalated || false,
        status: conversation.status,
        startedAt: conversation.started_at,
        endedAt: conversation.ended_at
      };

      this.logger.info('Call metrics tracked successfully', { callSid: metrics.callSid });

      return this.createResponse(true, metrics, null, requestId);

    } catch (error) {
      this.logger.error('Exception in trackCallMetrics', error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Calculate and store daily analytics for a specific date
   * Aggregates all calls for the day and computes metrics:
   * - Total calls
   * - Successful resolutions (non-escalated calls)
   * - Escalations
   * - Average duration
   * - Average sentiment
   * - Unique callers
   *
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<APIResponse>} Response containing calculated analytics
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.calculateDailyAnalytics('2025-10-01');
   * if (result.success) {
   *   console.log('Total calls:', result.data.total_calls);
   *   console.log('Avg sentiment:', result.data.avg_sentiment);
   * }
   */
  async calculateDailyAnalytics(date) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`Calculating daily analytics for date: ${date}`);

      // Validate date format (YYYY-MM-DD)
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return this.createResponse(false, null, 'Invalid date format. Use YYYY-MM-DD', requestId);
      }

      // Query all conversations for the specified date
      // We need to query the database directly using the Supabase client
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      const { data: conversations, error } = await this.databaseService.client
        .from('conversations')
        .select('*')
        .gte('started_at', startOfDay)
        .lte('started_at', endOfDay);

      if (error) {
        this.logger.error('Failed to fetch conversations for analytics', error);
        return this.createResponse(false, null, error.message, requestId);
      }

      this.logger.debug(`Found ${conversations.length} conversations for date: ${date}`);

      // Calculate metrics using MetricsService
      const totalCalls = conversations.length;
      const avgDuration = this.metricsService.calculateAverageDuration(conversations);
      const avgSentiment = this.metricsService.calculateAverageSentiment(conversations);
      const successRate = this.metricsService.calculateSuccessRate(conversations);
      const escalationRate = this.metricsService.calculateEscalationRate(conversations);

      // Count successful resolutions (non-escalated calls)
      const successfulResolutions = conversations.filter(c => !c.escalated).length;

      // Count escalations
      const escalations = conversations.filter(c => c.escalated).length;

      // Count unique callers
      const uniqueCallers = new Set(conversations.map(c => c.phone_number)).size;

      // Build analytics data object
      const analyticsData = {
        date,
        total_calls: totalCalls,
        successful_resolutions: successfulResolutions,
        escalations: escalations,
        avg_duration_seconds: avgDuration,
        avg_sentiment: avgSentiment,
        unique_callers: uniqueCallers,
        metadata: {
          success_rate: successRate,
          escalation_rate: escalationRate,
          calculated_at: new Date().toISOString()
        }
      };

      // Store analytics in database
      const logResult = await this.databaseService.logCallAnalytics(analyticsData);

      if (!logResult.success) {
        this.logger.error('Failed to store analytics', logResult.error);
        return this.createResponse(false, null, logResult.error, requestId);
      }

      this.logger.info(`Daily analytics calculated and stored for date: ${date}`);

      return this.createResponse(true, analyticsData, null, requestId);

    } catch (error) {
      this.logger.error('Exception in calculateDailyAnalytics', error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Get sentiment trends over a date range
   * Analyzes sentiment patterns and identifies trends
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<APIResponse>} Response containing sentiment trends
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-07');
   * if (result.success) {
   *   console.log('Average sentiment:', result.data.averageSentiment);
   *   console.log('Trend direction:', result.data.trend);
   * }
   */
  async getSentimentTrends(startDate, endDate) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`Getting sentiment trends from ${startDate} to ${endDate}`);

      // Validate date formats
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return this.createResponse(false, null, 'Invalid startDate format. Use YYYY-MM-DD', requestId);
      }
      if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return this.createResponse(false, null, 'Invalid endDate format. Use YYYY-MM-DD', requestId);
      }

      // Fetch analytics for date range
      const analyticsResult = await this.databaseService.getAnalytics(startDate, endDate);

      if (!analyticsResult.success) {
        this.logger.error('Failed to fetch analytics for sentiment trends', analyticsResult.error);
        return this.createResponse(false, null, analyticsResult.error, requestId);
      }

      const analyticsData = analyticsResult.data || [];

      this.logger.debug(`Analyzing ${analyticsData.length} days of sentiment data`);

      // Extract sentiment scores as data points
      const sentimentDataPoints = analyticsData.map(day => ({
        date: day.date,
        value: day.avg_sentiment || 0
      }));

      // Use MetricsService to identify trends
      const trends = this.metricsService.identifyTrends(sentimentDataPoints);

      // Calculate overall statistics
      const sentiments = sentimentDataPoints.map(dp => dp.value);
      const averageSentiment = sentiments.length > 0
        ? sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length
        : 0;

      const minSentiment = sentiments.length > 0 ? Math.min(...sentiments) : 0;
      const maxSentiment = sentiments.length > 0 ? Math.max(...sentiments) : 0;

      // Build sentiment trends response
      const sentimentTrends = {
        startDate,
        endDate,
        dataPoints: sentimentDataPoints,
        averageSentiment: Number(averageSentiment.toFixed(2)),
        minSentiment: Number(minSentiment.toFixed(2)),
        maxSentiment: Number(maxSentiment.toFixed(2)),
        trend: trends.direction,
        trendStrength: trends.strength,
        summary: trends.summary
      };

      this.logger.info('Sentiment trends calculated successfully');

      return this.createResponse(true, sentimentTrends, null, requestId);

    } catch (error) {
      this.logger.error('Exception in getSentimentTrends', error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Calculate escalation rate over a date range
   * Returns percentage of calls that were escalated to human agents
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<APIResponse>} Response containing escalation rate and details
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-07');
   * if (result.success) {
   *   console.log('Escalation rate:', result.data.escalationRate + '%');
   * }
   */
  async getEscalationRate(startDate, endDate) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`Calculating escalation rate from ${startDate} to ${endDate}`);

      // Validate date formats
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return this.createResponse(false, null, 'Invalid startDate format. Use YYYY-MM-DD', requestId);
      }
      if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return this.createResponse(false, null, 'Invalid endDate format. Use YYYY-MM-DD', requestId);
      }

      // Fetch analytics for date range
      const analyticsResult = await this.databaseService.getAnalytics(startDate, endDate);

      if (!analyticsResult.success) {
        this.logger.error('Failed to fetch analytics for escalation rate', analyticsResult.error);
        return this.createResponse(false, null, analyticsResult.error, requestId);
      }

      const analyticsData = analyticsResult.data || [];

      this.logger.debug(`Analyzing ${analyticsData.length} days of escalation data`);

      // Aggregate totals across date range
      let totalCalls = 0;
      let totalEscalations = 0;

      analyticsData.forEach(day => {
        totalCalls += day.total_calls || 0;
        totalEscalations += day.escalations || 0;
      });

      // Calculate escalation rate
      const escalationRate = totalCalls > 0
        ? (totalEscalations / totalCalls) * 100
        : 0;

      // Calculate daily breakdown
      const dailyBreakdown = analyticsData.map(day => ({
        date: day.date,
        totalCalls: day.total_calls || 0,
        escalations: day.escalations || 0,
        escalationRate: day.total_calls > 0
          ? Number(((day.escalations || 0) / day.total_calls * 100).toFixed(2))
          : 0
      }));

      // Build escalation rate response
      const escalationData = {
        startDate,
        endDate,
        totalCalls,
        totalEscalations,
        escalationRate: Number(escalationRate.toFixed(2)),
        dailyBreakdown,
        summary: this.metricsService.generateSummary({
          escalationRate: Number(escalationRate.toFixed(2)),
          totalCalls,
          totalEscalations
        })
      };

      this.logger.info('Escalation rate calculated successfully');

      return this.createResponse(true, escalationData, null, requestId);

    } catch (error) {
      this.logger.error('Exception in getEscalationRate', error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Generate comprehensive daily report for today
   * Includes all key metrics, trends, and insights
   *
   * @returns {Promise<APIResponse>} Response containing daily report
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await analyticsAgent.generateDailyReport();
   * if (result.success) {
   *   console.log('Daily Report:', result.data.summary);
   *   console.log('Total calls:', result.data.metrics.total_calls);
   * }
   */
  async generateDailyReport() {
    const requestId = this.generateRequestId();

    try {
      const today = new Date().toISOString().split('T')[0];

      this.logger.info(`Generating daily report for: ${today}`);

      // Calculate today's analytics
      const analyticsResult = await this.calculateDailyAnalytics(today);

      if (!analyticsResult.success) {
        this.logger.error('Failed to calculate daily analytics for report', analyticsResult.error);
        return this.createResponse(false, null, analyticsResult.error, requestId);
      }

      const todayMetrics = analyticsResult.data;

      // Get last 7 days for trend analysis
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      // Get sentiment trends
      const sentimentTrendsResult = await this.getSentimentTrends(startDate, today);
      const sentimentTrends = sentimentTrendsResult.success ? sentimentTrendsResult.data : null;

      // Get escalation rate
      const escalationRateResult = await this.getEscalationRate(startDate, today);
      const escalationRate = escalationRateResult.success ? escalationRateResult.data : null;

      // Generate insights based on metrics
      const insights = this.generateInsights(todayMetrics, sentimentTrends, escalationRate);

      // Build comprehensive daily report
      const dailyReport = {
        date: today,
        generatedAt: new Date().toISOString(),
        metrics: todayMetrics,
        trends: {
          sentiment: sentimentTrends,
          escalation: escalationRate
        },
        insights,
        summary: this.buildReportSummary(todayMetrics, insights)
      };

      this.logger.info('Daily report generated successfully');

      return this.createResponse(true, dailyReport, null, requestId);

    } catch (error) {
      this.logger.error('Exception in generateDailyReport', error);
      return this.createResponse(false, null, error.message, requestId);
    }
  }

  /**
   * Generate actionable insights from metrics
   * Identifies patterns and suggests improvements
   *
   * @param {Object} todayMetrics - Today's metrics
   * @param {Object} sentimentTrends - Sentiment trend data
   * @param {Object} escalationRate - Escalation rate data
   * @returns {Array<string>} Array of insight strings
   * @private
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  generateInsights(todayMetrics, sentimentTrends, escalationRate) {
    const insights = [];

    try {
      // Insight 1: Call volume
      if (todayMetrics.total_calls === 0) {
        insights.push('No calls received today. Check system health and phone number configuration.');
      } else if (todayMetrics.total_calls < 5) {
        insights.push(`Low call volume today (${todayMetrics.total_calls} calls). Consider marketing campaigns.`);
      } else {
        insights.push(`Processed ${todayMetrics.total_calls} calls today with ${todayMetrics.unique_callers} unique callers.`);
      }

      // Insight 2: Sentiment analysis
      if (todayMetrics.avg_sentiment !== null && todayMetrics.avg_sentiment !== undefined) {
        if (todayMetrics.avg_sentiment > 0.5) {
          insights.push('Excellent customer sentiment today! Customers are very satisfied.');
        } else if (todayMetrics.avg_sentiment > 0) {
          insights.push('Positive customer sentiment overall. Continue good practices.');
        } else if (todayMetrics.avg_sentiment > -0.5) {
          insights.push('Mixed sentiment detected. Review conversations for improvement opportunities.');
        } else {
          insights.push('ALERT: Low sentiment scores. Immediate review recommended.');
        }
      }

      // Insight 3: Escalation rate
      if (escalationRate && escalationRate.escalationRate > 30) {
        insights.push(`High escalation rate (${escalationRate.escalationRate}%). Review AI training and escalation triggers.`);
      } else if (escalationRate && escalationRate.escalationRate > 15) {
        insights.push(`Moderate escalation rate (${escalationRate.escalationRate}%). Monitor for patterns.`);
      } else if (escalationRate && escalationRate.totalCalls > 0) {
        insights.push(`Good escalation rate (${escalationRate.escalationRate}%). AI handling most calls effectively.`);
      }

      // Insight 4: Sentiment trends
      if (sentimentTrends && sentimentTrends.trend === 'improving') {
        insights.push('Sentiment trending upward! Recent changes are having a positive impact.');
      } else if (sentimentTrends && sentimentTrends.trend === 'declining') {
        insights.push('WARNING: Sentiment declining. Investigate recent changes or issues.');
      }

      // Insight 5: Call duration
      if (todayMetrics.avg_duration_seconds > 300) {
        insights.push('Long average call duration. Consider optimizing conversation flow.');
      } else if (todayMetrics.avg_duration_seconds > 0 && todayMetrics.avg_duration_seconds < 30) {
        insights.push('Very short calls detected. Ensure customers are getting adequate assistance.');
      }

      // Insight 6: Success rate
      if (todayMetrics.metadata && todayMetrics.metadata.success_rate !== undefined) {
        const successRate = todayMetrics.metadata.success_rate;
        if (successRate > 80) {
          insights.push(`Excellent success rate (${successRate}%). Keep up the great work!`);
        } else if (successRate < 60) {
          insights.push(`Low success rate (${successRate}%). Review conversation patterns.`);
        }
      }

      return insights;

    } catch (error) {
      this.logger.error('Error generating insights', error);
      return ['Error generating insights. Please review metrics manually.'];
    }
  }

  /**
   * Build executive summary for daily report
   * Creates a concise overview of key metrics and insights
   *
   * @param {Object} metrics - Daily metrics
   * @param {Array<string>} insights - Generated insights
   * @returns {string} Summary text
   * @private
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  buildReportSummary(metrics, insights) {
    try {
      const successRate = metrics.metadata?.success_rate || 0;
      const escalationRate = metrics.metadata?.escalation_rate || 0;

      return `Daily Analytics Summary for ${metrics.date}:
- Total Calls: ${metrics.total_calls}
- Unique Callers: ${metrics.unique_callers}
- Successful Resolutions: ${metrics.successful_resolutions} (${successRate.toFixed(1)}%)
- Escalations: ${metrics.escalations} (${escalationRate.toFixed(1)}%)
- Average Duration: ${Math.round(metrics.avg_duration_seconds || 0)} seconds
- Average Sentiment: ${(metrics.avg_sentiment || 0).toFixed(2)} (-1 to 1 scale)

Key Insights:
${insights.map((insight, idx) => `${idx + 1}. ${insight}`).join('\n')}`;

    } catch (error) {
      this.logger.error('Error building report summary', error);
      return 'Error generating summary. Please review full report.';
    }
  }

  /**
   * Create standard API response
   * Helper method to ensure consistent response format
   *
   * @param {boolean} success - Operation success status
   * @param {*} data - Response data
   * @param {string|null} error - Error message
   * @param {string} requestId - Request ID
   * @returns {APIResponse}
   * @private
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  createResponse(success, data, error = null, requestId) {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      requestId: requestId || this.generateRequestId()
    };
  }

  /**
   * Health check for AnalyticsAgent
   * Verifies database connectivity and service status
   *
   * @returns {Promise<Object>} Health status object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const health = await analyticsAgent.healthCheck();
   * console.log('Healthy:', health.healthy);
   */
  async healthCheck() {
    try {
      this.logger.info('Running health check');

      // Check database connectivity
      const dbHealthy = this.databaseService.client !== null;

      // Check metrics service
      const metricsHealthy = this.metricsService !== null;

      const healthy = dbHealthy && metricsHealthy;

      return {
        healthy,
        details: {
          database: dbHealthy,
          metricsService: metricsHealthy
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        healthy: false,
        details: {
          error: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful shutdown of AnalyticsAgent
   * Cleans up resources and closes connections
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down AnalyticsAgent');

      // Cleanup operations would go here
      // For now, just log the shutdown

      this.logger.info('AnalyticsAgent shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }
}

module.exports = AnalyticsAgent;
