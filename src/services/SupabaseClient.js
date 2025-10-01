/**
 * @fileoverview Supabase client wrapper with singleton pattern and health checks
 * @author LegacyAI Database Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Singleton Supabase client instance
 * @type {Object|null}
 */
let supabaseInstance = null;

/**
 * Initialize Supabase client with configuration
 * This function implements a singleton pattern to ensure only one client instance exists.
 *
 * @param {Object} config - Supabase configuration
 * @param {string} config.url - Supabase project URL
 * @param {string} config.serviceKey - Supabase service role key (for backend operations)
 * @returns {Object} Supabase client instance
 * @throws {Error} If configuration is invalid
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * @example
 * const supabase = initSupabaseClient({
 *   url: process.env.SUPABASE_URL,
 *   serviceKey: process.env.SUPABASE_SERVICE_KEY
 * });
 */
function initSupabaseClient(config) {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Initializing Supabase client`);

    // Validate configuration
    if (!config || !config.url || !config.serviceKey) {
      const error = new Error('Invalid Supabase configuration: url and serviceKey are required');
      console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Configuration validation failed`, error);
      throw error;
    }

    // Return existing instance if already initialized (singleton pattern)
    if (supabaseInstance) {
      console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Returning existing client instance`);
      return supabaseInstance;
    }

    // Create new Supabase client with service role key
    // Service role key is used for backend operations that bypass RLS policies
    supabaseInstance = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const initTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Client initialized successfully in ${initTime}ms`);

    return supabaseInstance;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Failed to initialize client`, error);
    throw error;
  }
}

/**
 * Get existing Supabase client instance
 *
 * @returns {Object|null} Supabase client instance or null if not initialized
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * @example
 * const supabase = getSupabaseClient();
 * if (supabase) {
 *   // Use client
 * }
 */
function getSupabaseClient() {
  if (!supabaseInstance) {
    console.warn(`[${new Date().toISOString()}] [WARN] [SupabaseClient] Client not initialized, call initSupabaseClient first`);
    return null;
  }
  return supabaseInstance;
}

/**
 * Perform health check on Supabase connection
 * Executes a simple query to verify database connectivity.
 *
 * @returns {Promise<{healthy: boolean, latencyMs: number, timestamp: string, error?: string}>} Health check result
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * @example
 * const health = await healthCheck();
 * if (health.healthy) {
 *   console.log(`Database is healthy (latency: ${health.latencyMs}ms)`);
 * }
 */
async function healthCheck() {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Starting health check`);

    if (!supabaseInstance) {
      const error = 'Supabase client not initialized';
      console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Health check failed: ${error}`);
      return {
        healthy: false,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
        error
      };
    }

    // Execute a simple query to test connectivity
    // Query the agent_configs table as it should always exist
    const { data, error } = await supabaseInstance
      .from('agent_configs')
      .select('count')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Health check query failed`, error);
      return {
        healthy: false,
        latencyMs,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }

    console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Health check passed (latency: ${latencyMs}ms)`);

    return {
      healthy: true,
      latencyMs,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Health check exception`, error);

    return {
      healthy: false,
      latencyMs,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Close Supabase client connection (for cleanup)
 * Note: Supabase JS client doesn't require explicit connection closing,
 * but this function is provided for consistency and future compatibility.
 *
 * @returns {void}
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * @example
 * // On application shutdown
 * closeSupabaseClient();
 */
function closeSupabaseClient() {
  try {
    console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Closing Supabase client`);

    if (supabaseInstance) {
      // Supabase JS client doesn't require explicit closing
      // But we reset the singleton instance for clean state
      supabaseInstance = null;
      console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Client closed successfully`);
    } else {
      console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] No active client to close`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [SupabaseClient] Error closing client`, error);
  }
}

/**
 * Reset client instance (primarily for testing)
 * Forces a new client to be created on next initialization.
 *
 * @returns {void}
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * @example
 * // In tests
 * resetSupabaseClient();
 */
function resetSupabaseClient() {
  console.log(`[${new Date().toISOString()}] [INFO] [SupabaseClient] Resetting client instance`);
  supabaseInstance = null;
}

module.exports = {
  initSupabaseClient,
  getSupabaseClient,
  healthCheck,
  closeSupabaseClient,
  resetSupabaseClient
};
