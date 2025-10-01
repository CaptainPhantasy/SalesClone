/**
 * @fileoverview Email notification service using Mailgun API
 * @author LegacyAI Subagent Fleet - Integration Agent Builder
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * The EmailService handles:
 * - Sending individual emails via Mailgun
 * - Sending daily reports with analytics data
 * - Sending escalation alerts for urgent matters
 * - HTML and plain text email support
 * - Email template management
 * - Retry logic for failed deliveries
 */

/**
 * @typedef {Object} EmailResult
 * @property {boolean} success - Whether email was sent successfully
 * @property {string} messageId - Mailgun message ID
 * @property {string} timestamp - ISO-8601 timestamp
 */

/**
 * @typedef {Object} EmailTemplate
 * @property {string} subject - Email subject
 * @property {string} html - HTML email body
 * @property {string} text - Plain text email body
 */

/**
 * EmailService - Manages email notifications via Mailgun
 * Provides email sending, templates, and delivery tracking.
 *
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
class EmailService {
  /**
   * Initialize EmailService with Mailgun configuration
   * @param {Object} mailgunConfig - Mailgun configuration
   * @param {string} mailgunConfig.apiKey - Mailgun API key
   * @param {string} mailgunConfig.domain - Mailgun sending domain
   * @param {string} mailgunConfig.from - Default from address
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const emailService = new EmailService({
   *   apiKey: 'key-xxx',
   *   domain: 'mg.example.com',
   *   from: 'LegacyAI <noreply@example.com>'
   * });
   * await emailService.initialize();
   */
  constructor(mailgunConfig) {
    console.log(`[${new Date().toISOString()}] [INFO] [EmailService] EmailService constructor called`);

    if (!mailgunConfig) {
      throw new Error('Mailgun configuration is required');
    }

    this.config = mailgunConfig;
    this.mailgunClient = null;

    // Email retry configuration
    this.retryConfig = {
      maxRetries: 3,
      retryDelayMs: 2000,
    };

    console.log(`[${new Date().toISOString()}] [INFO] [EmailService] EmailService instance created - Domain: ${this.config.domain}`);
  }

  /**
   * Initialize email service and Mailgun client
   * Sets up Mailgun API client for sending emails.
   *
   * @returns {Promise<void>}
   * @throws {Error} If Mailgun configuration is invalid
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * await emailService.initialize();
   */
  async initialize() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Initializing EmailService`);

      // Validate configuration
      if (!this.config.apiKey || !this.config.domain) {
        throw new Error('Mailgun API key and domain are required');
      }

      // Initialize Mailgun client
      // Using form-data package for Mailgun API requests
      try {
        const formData = require('form-data');
        const Mailgun = require('mailgun.js');
        const mailgun = new Mailgun(formData);

        // Create Mailgun client instance
        this.mailgunClient = mailgun.client({
          username: 'api',
          key: this.config.apiKey,
        });

        console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Mailgun client initialized successfully`);
      } catch (error) {
        // If Mailgun package not available, log warning but continue
        // This allows testing without actual Mailgun dependency
        console.warn(`[${new Date().toISOString()}] [WARN] [EmailService] Mailgun package not available, using mock client:`, error.message);
        this.mailgunClient = this._createMockClient();
      }

      this.initialized = true;
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] EmailService initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [EmailService] Initialization failed`, error);
      throw error;
    }
  }

  /**
   * Send email to recipient
   * Sends email with subject and body, supports both HTML and text.
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body (HTML or text)
   * @param {Object} [options] - Additional email options
   * @param {string} [options.from] - Custom from address
   * @param {boolean} [options.isHtml=true] - Whether body is HTML
   * @returns {Promise<EmailResult>} Send result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await service.sendEmail(
   *   'user@example.com',
   *   'Welcome to LegacyAI',
   *   '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
   * );
   */
  async sendEmail(to, subject, body, options = {}) {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Sending email - To: ${to}, Subject: ${subject}`);

      // Validate inputs
      if (!to || !subject || !body) {
        throw new Error('to, subject, and body are required');
      }

      // Validate email format
      if (!this._isValidEmail(to)) {
        throw new Error(`Invalid email address: ${to}`);
      }

      // Prepare email data
      const from = options.from || this.config.from;
      const isHtml = options.isHtml !== false; // Default to true

      const emailData = {
        from,
        to,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
      };

      // Add plain text version if HTML is provided
      if (isHtml) {
        emailData.text = this._stripHtml(body);
      }

      // Send email via Mailgun
      const result = await this._sendViaMailgun(emailData);

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Email sent successfully - Duration: ${duration}ms, Message ID: ${result.id}`);

      return {
        success: true,
        messageId: result.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [ERROR] [EmailService] Failed to send email - Duration: ${duration}ms, To: ${to}`, error);

      return {
        success: false,
        messageId: null,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send daily report email with analytics data
   * Generates formatted report from analytics data.
   *
   * @param {Array<string>} recipients - Array of recipient email addresses
   * @param {Object} reportData - Report data
   * @param {number} reportData.totalCalls - Total calls for the day
   * @param {number} reportData.successfulResolutions - Successful resolutions
   * @param {number} reportData.escalations - Escalation count
   * @param {number} reportData.avgDuration - Average call duration
   * @param {number} reportData.avgSentiment - Average sentiment score
   * @returns {Promise<Array<EmailResult>>} Array of send results
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const results = await service.sendDailyReport(
   *   ['manager@example.com'],
   *   { totalCalls: 45, successfulResolutions: 38, escalations: 7 }
   * );
   */
  async sendDailyReport(recipients, reportData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Sending daily report to ${recipients.length} recipients`);

      // Validate inputs
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('recipients must be a non-empty array');
      }

      if (!reportData) {
        throw new Error('reportData is required');
      }

      // Generate report email from template
      const email = this._generateDailyReportEmail(reportData);

      // Send to all recipients
      const results = await Promise.all(
        recipients.map(recipient =>
          this.sendEmail(recipient, email.subject, email.html, { isHtml: true })
        )
      );

      const successCount = results.filter(r => r.success).length;
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Daily report sent - Success: ${successCount}/${recipients.length}`);

      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [EmailService] Failed to send daily report`, error);
      throw error;
    }
  }

  /**
   * Send escalation alert email
   * Sends urgent alert for calls requiring human intervention.
   *
   * @param {string} recipient - Alert recipient email
   * @param {Object} callData - Call data for alert
   * @param {string} callData.callSid - Call SID
   * @param {string} callData.phoneNumber - Customer phone number
   * @param {string} callData.reason - Escalation reason
   * @param {number} [callData.sentimentScore] - Sentiment score
   * @returns {Promise<EmailResult>} Send result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await service.sendEscalationAlert(
   *   'support@example.com',
   *   { callSid: 'CA123', phoneNumber: '+1234567890', reason: 'Customer frustrated' }
   * );
   */
  async sendEscalationAlert(recipient, callData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Sending escalation alert - Recipient: ${recipient}, Call SID: ${callData.callSid}`);

      // Validate inputs
      if (!recipient || !callData) {
        throw new Error('recipient and callData are required');
      }

      // Generate escalation email from template
      const email = this._generateEscalationAlertEmail(callData);

      // Send high-priority alert
      const result = await this.sendEmail(recipient, email.subject, email.html, {
        isHtml: true,
      });

      console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Escalation alert sent - Success: ${result.success}`);

      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [EmailService] Failed to send escalation alert`, error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async shutdown() {
    console.log(`[${new Date().toISOString()}] [INFO] [EmailService] Shutting down EmailService`);
    this.initialized = false;
    console.log(`[${new Date().toISOString()}] [INFO] [EmailService] EmailService shutdown complete`);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Send email via Mailgun API
   * Handles actual API call with retry logic.
   *
   * @private
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Mailgun response
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async _sendViaMailgun(emailData) {
    let lastError;

    // Retry logic for reliability
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`[${new Date().toISOString()}] [DEBUG] [EmailService] Sending via Mailgun - Attempt ${attempt}/${this.retryConfig.maxRetries}`);

        // Send via Mailgun messages API
        const response = await this.mailgunClient.messages.create(
          this.config.domain,
          emailData
        );

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`[${new Date().toISOString()}] [WARN] [EmailService] Mailgun send attempt ${attempt} failed: ${error.message}`);

        // Wait before retry (except on last attempt)
        if (attempt < this.retryConfig.maxRetries) {
          await this._sleep(this.retryConfig.retryDelayMs);
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to send email after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Create mock Mailgun client for testing
   * Used when Mailgun package is not available.
   *
   * @private
   * @returns {Object} Mock Mailgun client
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _createMockClient() {
    return {
      messages: {
        create: async (domain, data) => {
          console.log(`[${new Date().toISOString()}] [DEBUG] [EmailService] Mock email send - To: ${data.to}, Subject: ${data.subject}`);
          return {
            id: `mock-${Date.now()}`,
            message: 'Queued. Thank you.',
          };
        },
      },
    };
  }

  /**
   * Validate email address format
   * Basic email validation using regex.
   *
   * @private
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Strip HTML tags from text
   * Creates plain text version from HTML.
   *
   * @private
   * @param {string} html - HTML content
   * @returns {string} Plain text
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Generate daily report email template
   * Creates formatted HTML email with analytics data.
   *
   * @private
   * @param {Object} reportData - Report data
   * @returns {EmailTemplate} Email template
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _generateDailyReportEmail(reportData) {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `LegacyAI Daily Report - ${date}`;

    // Format duration in minutes
    const avgDurationMin = reportData.avgDuration
      ? (reportData.avgDuration / 60).toFixed(1)
      : '0.0';

    // Format sentiment as percentage
    const sentimentPercent = reportData.avgSentiment
      ? ((reportData.avgSentiment + 1) * 50).toFixed(0)
      : '50';

    // Calculate success rate
    const successRate = reportData.totalCalls
      ? ((reportData.successfulResolutions / reportData.totalCalls) * 100).toFixed(1)
      : '0.0';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .metric { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4F46E5; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LegacyAI Daily Report</h1>
      <p>${date}</p>
    </div>
    <div class="content">
      <h2>Call Performance Summary</h2>

      <div class="metric">
        <div class="metric-label">Total Calls</div>
        <div class="metric-value">${reportData.totalCalls || 0}</div>
      </div>

      <div class="metric">
        <div class="metric-label">Successful Resolutions</div>
        <div class="metric-value">${reportData.successfulResolutions || 0} (${successRate}%)</div>
      </div>

      <div class="metric">
        <div class="metric-label">Escalations</div>
        <div class="metric-value">${reportData.escalations || 0}</div>
      </div>

      <div class="metric">
        <div class="metric-label">Average Call Duration</div>
        <div class="metric-value">${avgDurationMin} minutes</div>
      </div>

      <div class="metric">
        <div class="metric-label">Customer Sentiment</div>
        <div class="metric-value">${sentimentPercent}%</div>
      </div>
    </div>
    <div class="footer">
      <p>Generated by LegacyAI Voice Agent System</p>
      <p>This is an automated report. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { subject, html };
  }

  /**
   * Generate escalation alert email template
   * Creates urgent alert email with call details.
   *
   * @private
   * @param {Object} callData - Call data
   * @returns {EmailTemplate} Email template
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _generateEscalationAlertEmail(callData) {
    const subject = `URGENT: Call Escalation Required - ${callData.callSid}`;

    const sentimentIndicator = callData.sentimentScore < 0
      ? '🔴 Negative'
      : callData.sentimentScore > 0
        ? '🟢 Positive'
        : '🟡 Neutral';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #FEF2F2; border: 2px solid #DC2626; }
    .detail { padding: 10px; margin: 10px 0; background-color: white; border-radius: 5px; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #1f2937; }
    .alert { background-color: #FEE2E2; padding: 15px; margin: 15px 0; border-left: 4px solid #DC2626; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ CALL ESCALATION ALERT</h1>
      <p>Immediate attention required</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>A call requires immediate human intervention.</strong>
      </div>

      <h2>Call Details</h2>

      <div class="detail">
        <span class="label">Call SID:</span>
        <span class="value">${callData.callSid}</span>
      </div>

      <div class="detail">
        <span class="label">Phone Number:</span>
        <span class="value">${callData.phoneNumber}</span>
      </div>

      <div class="detail">
        <span class="label">Escalation Reason:</span>
        <span class="value">${callData.reason}</span>
      </div>

      ${callData.sentimentScore !== undefined ? `
      <div class="detail">
        <span class="label">Sentiment:</span>
        <span class="value">${sentimentIndicator}</span>
      </div>
      ` : ''}

      <div class="detail">
        <span class="label">Timestamp:</span>
        <span class="value">${new Date().toISOString()}</span>
      </div>
    </div>
    <div class="footer">
      <p>Generated by LegacyAI Voice Agent System</p>
      <p>Please respond to this escalation promptly.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { subject, html };
  }

  /**
   * Sleep for specified milliseconds
   * Used for retry delays.
   *
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmailService;
