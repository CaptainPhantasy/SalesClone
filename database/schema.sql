-- ============================================================================
-- LegacyAI Voice Agent System - Database Schema
-- ============================================================================
-- Purpose: Complete database schema for voice agent system with Supabase
-- Version: 1.0.0
-- Created: 2025-10-01T00:00:00Z
-- Author: LegacyAI Database Agent
--
-- Description:
-- This schema defines all tables, indexes, and security policies for the
-- voice agent system. It includes conversation tracking, customer management,
-- message history, analytics, agent configurations, and scheduled tasks.
-- ============================================================================

-- ============================================================================
-- TABLE: customers
-- Purpose: Store customer information and profiles
-- ============================================================================
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    company VARCHAR(255),
    tags TEXT[], -- Array of string tags for categorization
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    lifetime_value DECIMAL(10,2) DEFAULT 0,
    preferences JSONB, -- Customer preferences (communication, language, etc.)
    notes TEXT, -- Free-form notes about the customer
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Stores customer profiles and contact information';
COMMENT ON COLUMN customers.phone_number IS 'Unique phone number in E.164 format';
COMMENT ON COLUMN customers.lead_score IS 'Lead quality score from 0 to 100';
COMMENT ON COLUMN customers.lifetime_value IS 'Total customer lifetime value in USD';

-- ============================================================================
-- TABLE: conversations
-- Purpose: Track all voice conversations and their state
-- ============================================================================
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sid VARCHAR(255) UNIQUE NOT NULL, -- Twilio call SID
    phone_number VARCHAR(20) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_type VARCHAR(50) DEFAULT 'voice',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'escalated')),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    transcript JSONB, -- Full conversation transcript with timestamps
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    escalated BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Additional call metadata (recording URL, quality metrics, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE conversations IS 'Tracks all voice conversations and their lifecycle';
COMMENT ON COLUMN conversations.call_sid IS 'Unique Twilio call session identifier';
COMMENT ON COLUMN conversations.status IS 'Current conversation state: active, ended, or escalated';
COMMENT ON COLUMN conversations.sentiment_score IS 'Overall sentiment from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN conversations.transcript IS 'JSONB array of conversation turns with timestamps';

-- ============================================================================
-- TABLE: messages
-- Purpose: Store individual messages within conversations
-- ============================================================================
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB -- Additional message metadata (confidence score, audio URL, etc.)
);

COMMENT ON TABLE messages IS 'Individual messages within a conversation';
COMMENT ON COLUMN messages.role IS 'Message sender: user (customer), assistant (AI), or system';
COMMENT ON COLUMN messages.metadata IS 'Additional data like speech confidence, audio recordings';

-- ============================================================================
-- TABLE: call_analytics
-- Purpose: Aggregate daily call metrics and analytics
-- ============================================================================
CREATE TABLE call_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    successful_resolutions INTEGER DEFAULT 0,
    escalations INTEGER DEFAULT 0,
    avg_duration_seconds DECIMAL(10,2),
    avg_sentiment DECIMAL(3,2),
    unique_callers INTEGER DEFAULT 0,
    metadata JSONB, -- Additional metrics (peak times, common topics, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date) -- One record per day
);

COMMENT ON TABLE call_analytics IS 'Daily aggregated metrics for call analytics';
COMMENT ON COLUMN call_analytics.date IS 'Date for this analytics record (one per day)';
COMMENT ON COLUMN call_analytics.successful_resolutions IS 'Calls resolved without escalation';

-- ============================================================================
-- TABLE: agent_configs
-- Purpose: Store AI agent configurations and prompts
-- ============================================================================
CREATE TABLE agent_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    system_prompt TEXT NOT NULL,
    voice_settings JSONB, -- Voice configuration (speed, pitch, model, etc.)
    escalation_rules JSONB, -- Rules for when to escalate to human
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE agent_configs IS 'AI agent configurations and system prompts';
COMMENT ON COLUMN agent_configs.name IS 'Unique identifier for this agent configuration';
COMMENT ON COLUMN agent_configs.system_prompt IS 'System prompt that defines agent behavior';
COMMENT ON COLUMN agent_configs.escalation_rules IS 'Conditions that trigger escalation to human';

-- ============================================================================
-- TABLE: scheduled_tasks
-- Purpose: Track scheduled follow-ups and automated tasks
-- ============================================================================
CREATE TABLE scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payload JSONB, -- Task-specific data
    completed_at TIMESTAMP,
    result JSONB, -- Task execution result
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE scheduled_tasks IS 'Scheduled tasks for follow-ups and automation';
COMMENT ON COLUMN scheduled_tasks.task_type IS 'Type of task (follow_up_call, send_email, etc.)';
COMMENT ON COLUMN scheduled_tasks.status IS 'Current task execution status';
COMMENT ON COLUMN scheduled_tasks.payload IS 'Task-specific data and parameters';

-- ============================================================================
-- INDEXES: Performance optimization
-- ============================================================================

-- Customer indexes
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_created ON customers(created_at DESC);

-- Conversation indexes
CREATE INDEX idx_conversations_phone ON conversations(phone_number);
CREATE INDEX idx_conversations_customer ON conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);
CREATE INDEX idx_conversations_call_sid ON conversations(call_sid);

-- Message indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_role ON messages(role);

-- Analytics indexes
CREATE INDEX idx_analytics_date ON call_analytics(date DESC);

-- Scheduled task indexes
CREATE INDEX idx_scheduled_tasks_status ON scheduled_tasks(status, scheduled_for);
CREATE INDEX idx_scheduled_tasks_customer ON scheduled_tasks(customer_id);
CREATE INDEX idx_scheduled_tasks_type ON scheduled_tasks(task_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Purpose: Enable RLS for secure multi-tenant access
-- Note: Policies should be defined based on authentication requirements
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Default policy: Service role has full access (for backend operations)
-- Additional policies should be added based on user authentication needs

-- ============================================================================
-- TRIGGERS: Automatic timestamp updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA: Default agent configuration
-- ============================================================================

INSERT INTO agent_configs (name, type, system_prompt, voice_settings, escalation_rules, active)
VALUES (
    'default_voice_agent',
    'voice',
    'You are a helpful AI voice assistant for LegacyAI. Your goal is to assist customers with their inquiries in a professional and friendly manner. Listen carefully, provide accurate information, and escalate to a human agent when necessary.',
    '{"voice": "alloy", "speed": 1.0, "model": "gpt-4-1106-preview"}'::jsonb,
    '{"keywords": ["speak to human", "transfer", "manager"], "sentiment_threshold": -0.5, "max_turns": 20}'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
