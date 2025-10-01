/**
 * @fileoverview Data access layer for all database operations
 * @author LegacyAI Database Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * This service provides a comprehensive interface for all database operations
 * including CRUD operations for conversations, customers, messages, analytics,
 * agent configs, and scheduled tasks. All methods include proper error handling,
 * logging, and return standardized response formats.
 */

const { getSupabaseClient } = require('./SupabaseClient');

/**
 * Standard API response format
 * @typedef {Object} APIResponse
 * @property {boolean} success - Operation success status
 * @property {*} data - Response data
 * @property {string|null} error - Error message if failed
 * @property {string} timestamp - ISO-8601 timestamp
 * @property {string} requestId - Unique request ID
 */

class DatabaseService {
  /**
   * Initialize DatabaseService
   *
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  constructor() {
    this.client = null;
    console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] DatabaseService instance created`);
  }

  /**
   * Initialize database connection
   * Must be called before using any database operations.
   *
   * @returns {Promise<void>}
   * @throws {Error} If Supabase client is not initialized
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async initialize() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Initializing database service`);

      this.client = getSupabaseClient();

      if (!this.client) {
        throw new Error('Supabase client not initialized. Call initSupabaseClient first.');
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Database service initialized successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Initialization failed`, error);
      throw error;
    }
  }

  /**
   * Generate unique request ID for tracking
   *
   * @returns {string} UUID v4
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  generateRequestId() {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Create standard API response
   *
   * @param {boolean} success - Operation success status
   * @param {*} data - Response data
   * @param {string|null} error - Error message
   * @returns {APIResponse}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  createResponse(success, data, error = null) {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }

  // ============================================================================
  // CONVERSATION OPERATIONS
  // ============================================================================

  /**
   * Create a new conversation record
   *
   * @param {Object} conversationData - Conversation data
   * @param {string} conversationData.call_sid - Twilio call SID
   * @param {string} conversationData.phone_number - Customer phone number
   * @param {string} [conversationData.customer_id] - Customer UUID
   * @param {string} [conversationData.agent_type='voice'] - Agent type
   * @param {Object} [conversationData.metadata] - Additional metadata
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.createConversation({
   *   call_sid: 'CA123456',
   *   phone_number: '+1234567890'
   * });
   */
  async createConversation(conversationData) {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Creating conversation`, {
        call_sid: conversationData.call_sid,
        phone_number: conversationData.phone_number
      });

      // Validate required fields
      if (!conversationData.call_sid || !conversationData.phone_number) {
        throw new Error('call_sid and phone_number are required');
      }

      const { data, error } = await this.client
        .from('conversations')
        .insert([{
          call_sid: conversationData.call_sid,
          phone_number: conversationData.phone_number,
          customer_id: conversationData.customer_id || null,
          agent_type: conversationData.agent_type || 'voice',
          status: 'active',
          metadata: conversationData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to create conversation`, error);
        return this.createResponse(false, null, error.message);
      }

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Conversation created successfully in ${duration}ms`, {
        id: data.id
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in createConversation`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get conversation by ID
   *
   * @param {string} conversationId - Conversation UUID
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getConversation('uuid-here');
   */
  async getConversation(conversationId) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching conversation`, { conversationId });

      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch conversation`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Conversation fetched successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getConversation`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get conversation by Twilio call SID
   *
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getConversationByCallSid('CA123456');
   */
  async getConversationByCallSid(callSid) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching conversation by call_sid`, { callSid });

      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .eq('call_sid', callSid)
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch conversation by call_sid`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Conversation fetched successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getConversationByCallSid`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Update conversation record
   *
   * @param {string} conversationId - Conversation UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.updateConversation('uuid', {
   *   status: 'ended',
   *   duration_seconds: 120
   * });
   */
  async updateConversation(conversationId, updateData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Updating conversation`, {
        conversationId,
        fields: Object.keys(updateData)
      });

      const { data, error } = await this.client
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to update conversation`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Conversation updated successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in updateConversation`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================

  /**
   * Create a new customer record
   *
   * @param {Object} customerData - Customer data
   * @param {string} customerData.phone_number - Customer phone number
   * @param {string} [customerData.email] - Email address
   * @param {string} [customerData.name] - Customer name
   * @param {string} [customerData.company] - Company name
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.createCustomer({
   *   phone_number: '+1234567890',
   *   name: 'John Doe'
   * });
   */
  async createCustomer(customerData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Creating customer`, {
        phone_number: customerData.phone_number
      });

      // Validate required fields - do not log sensitive data like email
      if (!customerData.phone_number) {
        throw new Error('phone_number is required');
      }

      const { data, error } = await this.client
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to create customer`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Customer created successfully`, {
        id: data.id
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in createCustomer`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get customer by phone number
   *
   * @param {string} phoneNumber - Customer phone number
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getCustomerByPhone('+1234567890');
   */
  async getCustomerByPhone(phoneNumber) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching customer by phone`);

      const { data, error } = await this.client
        .from('customers')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        // Not found is not necessarily an error - return empty result
        if (error.code === 'PGRST116') {
          console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Customer not found`);
          return this.createResponse(true, null, null);
        }

        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch customer`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Customer fetched successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getCustomerByPhone`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Update customer record
   *
   * @param {string} customerId - Customer UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.updateCustomer('uuid', {
   *   lead_score: 85
   * });
   */
  async updateCustomer(customerId, updateData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Updating customer`, {
        customerId,
        fields: Object.keys(updateData)
      });

      const { data, error } = await this.client
        .from('customers')
        .update(updateData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to update customer`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Customer updated successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in updateCustomer`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  /**
   * Create a new message in a conversation
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} role - Message role ('user', 'assistant', 'system')
   * @param {string} content - Message content
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.createMessage(
   *   'conv-uuid',
   *   'user',
   *   'Hello, I need help'
   * );
   */
  async createMessage(conversationId, role, content, metadata = {}) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Creating message`, {
        conversationId,
        role,
        contentLength: content.length
      });

      // Validate required fields
      if (!conversationId || !role || !content) {
        throw new Error('conversationId, role, and content are required');
      }

      // Validate role
      const validRoles = ['user', 'assistant', 'system'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      const { data, error } = await this.client
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role,
          content,
          metadata
        }])
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to create message`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Message created successfully`, {
        id: data.id
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in createMessage`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get all messages for a conversation
   *
   * @param {string} conversationId - Conversation UUID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of messages
   * @param {string} [options.order='asc'] - Sort order ('asc' or 'desc')
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getConversationMessages('uuid', {
   *   limit: 50,
   *   order: 'asc'
   * });
   */
  async getConversationMessages(conversationId, options = {}) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching conversation messages`, {
        conversationId,
        options
      });

      let query = this.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Apply ordering (default to ascending by timestamp)
      const order = options.order === 'desc' ? 'desc' : 'asc';
      query = query.order('timestamp', { ascending: order === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch messages`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Messages fetched successfully`, {
        count: data.length
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getConversationMessages`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  /**
   * Log call analytics data
   * Updates or creates daily analytics record.
   *
   * @param {Object} analyticsData - Analytics data
   * @param {Date} [analyticsData.date] - Date for analytics (defaults to today)
   * @param {number} analyticsData.total_calls - Total calls
   * @param {number} analyticsData.successful_resolutions - Successful resolutions
   * @param {number} analyticsData.escalations - Escalations
   * @param {number} analyticsData.avg_duration_seconds - Average duration
   * @param {number} analyticsData.avg_sentiment - Average sentiment
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.logCallAnalytics({
   *   total_calls: 10,
   *   successful_resolutions: 8,
   *   escalations: 2,
   *   avg_duration_seconds: 120.5,
   *   avg_sentiment: 0.75
   * });
   */
  async logCallAnalytics(analyticsData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Logging call analytics`, analyticsData);

      // Use provided date or default to today
      const date = analyticsData.date || new Date().toISOString().split('T')[0];

      // Use upsert (insert or update) for daily analytics
      const { data, error } = await this.client
        .from('call_analytics')
        .upsert([{
          date,
          total_calls: analyticsData.total_calls || 0,
          successful_resolutions: analyticsData.successful_resolutions || 0,
          escalations: analyticsData.escalations || 0,
          avg_duration_seconds: analyticsData.avg_duration_seconds || 0,
          avg_sentiment: analyticsData.avg_sentiment || 0,
          unique_callers: analyticsData.unique_callers || 0,
          metadata: analyticsData.metadata || {}
        }], {
          onConflict: 'date'
        })
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to log analytics`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Analytics logged successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in logCallAnalytics`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get analytics for a date range
   *
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getAnalytics('2025-10-01', '2025-10-07');
   */
  async getAnalytics(startDate, endDate) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching analytics`, {
        startDate,
        endDate
      });

      const { data, error } = await this.client
        .from('call_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch analytics`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Analytics fetched successfully`, {
        count: data.length
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getAnalytics`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  // ============================================================================
  // AGENT CONFIG OPERATIONS
  // ============================================================================

  /**
   * Get agent configuration by name
   *
   * @param {string} name - Agent configuration name
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getAgentConfig('default_voice_agent');
   */
  async getAgentConfig(name) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching agent config`, { name });

      const { data, error } = await this.client
        .from('agent_configs')
        .select('*')
        .eq('name', name)
        .eq('active', true)
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch agent config`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Agent config fetched successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getAgentConfig`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get all active agent configurations
   *
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getAllAgentConfigs();
   */
  async getAllAgentConfigs() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching all agent configs`);

      const { data, error } = await this.client
        .from('agent_configs')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch agent configs`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Agent configs fetched successfully`, {
        count: data.length
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getAllAgentConfigs`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  // ============================================================================
  // SCHEDULED TASK OPERATIONS
  // ============================================================================

  /**
   * Create a scheduled task
   *
   * @param {Object} taskData - Task data
   * @param {string} taskData.customer_id - Customer UUID
   * @param {string} taskData.task_type - Task type
   * @param {Date|string} taskData.scheduled_for - Scheduled time
   * @param {Object} [taskData.payload] - Task payload
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.createScheduledTask({
   *   customer_id: 'uuid',
   *   task_type: 'follow_up_call',
   *   scheduled_for: new Date('2025-10-02T10:00:00Z'),
   *   payload: { reason: 'product_inquiry' }
   * });
   */
  async createScheduledTask(taskData) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Creating scheduled task`, {
        task_type: taskData.task_type,
        scheduled_for: taskData.scheduled_for
      });

      // Validate required fields
      if (!taskData.customer_id || !taskData.task_type || !taskData.scheduled_for) {
        throw new Error('customer_id, task_type, and scheduled_for are required');
      }

      const { data, error } = await this.client
        .from('scheduled_tasks')
        .insert([{
          customer_id: taskData.customer_id,
          task_type: taskData.task_type,
          scheduled_for: taskData.scheduled_for,
          payload: taskData.payload || {},
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to create scheduled task`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Scheduled task created successfully`, {
        id: data.id
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in createScheduledTask`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Get pending scheduled tasks
   *
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=100] - Maximum number of tasks
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.getPendingTasks({ limit: 50 });
   */
  async getPendingTasks(options = {}) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Fetching pending tasks`);

      const limit = options.limit || 100;
      const now = new Date().toISOString();

      const { data, error } = await this.client
        .from('scheduled_tasks')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to fetch pending tasks`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Pending tasks fetched successfully`, {
        count: data.length
      });

      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in getPendingTasks`, error);
      return this.createResponse(false, null, error.message);
    }
  }

  /**
   * Update scheduled task status
   *
   * @param {string} taskId - Task UUID
   * @param {string} status - New status
   * @param {Object} [result] - Task result
   * @returns {Promise<APIResponse>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await dbService.updateTaskStatus('uuid', 'completed', {
   *   success: true
   * });
   */
  async updateTaskStatus(taskId, status, result = null) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Updating task status`, {
        taskId,
        status
      });

      const updateData = { status };

      // Add completed_at timestamp if status is completed or failed
      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      // Add result if provided
      if (result) {
        updateData.result = result;
      }

      const { data, error } = await this.client
        .from('scheduled_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Failed to update task status`, error);
        return this.createResponse(false, null, error.message);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [DatabaseService] Task status updated successfully`);
      return this.createResponse(true, data, null);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [DatabaseService] Exception in updateTaskStatus`, error);
      return this.createResponse(false, null, error.message);
    }
  }
}

module.exports = DatabaseService;
