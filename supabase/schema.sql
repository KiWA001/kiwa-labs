-- KiWA Labs Chat System - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main table for chat sessions
CREATE TABLE chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    contact_info JSONB,
    status TEXT DEFAULT 'active',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_ip TEXT,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_last_updated ON chat_sessions(last_updated DESC);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- Table for admin messages (real-time messaging)
CREATE TABLE admin_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_admin_messages_session_id ON admin_messages(session_id);
CREATE INDEX idx_admin_messages_timestamp ON admin_messages(timestamp DESC);
CREATE INDEX idx_admin_messages_unread ON admin_messages(session_id, is_read) WHERE is_read = FALSE;

-- Table for conversation summaries (for long conversations > 50 messages)
CREATE TABLE conversation_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_session_id ON conversation_summaries(session_id);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for public insert (from website)
CREATE POLICY "Allow public insert on chat_sessions" 
    ON chat_sessions FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update on chat_sessions" 
    ON chat_sessions FOR UPDATE 
    USING (true);

CREATE POLICY "Allow public insert on admin_messages" 
    ON admin_messages FOR INSERT 
    WITH CHECK (true);

-- Create policy for admin read access (authenticated users only)
CREATE POLICY "Allow admin read all chat_sessions" 
    ON chat_sessions FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin read all admin_messages" 
    ON admin_messages FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin update admin_messages" 
    ON admin_messages FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin read all conversation_summaries" 
    ON conversation_summaries FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_updated
CREATE TRIGGER update_chat_sessions_last_updated
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated();

-- Create view for admin dashboard
CREATE VIEW admin_chat_overview AS
SELECT 
    cs.session_id,
    cs.status,
    cs.last_updated,
    cs.created_at,
    cs.contact_info,
    jsonb_array_length(cs.messages) as message_count,
    CASE 
        WHEN cs.contact_info IS NOT NULL THEN true 
        ELSE false 
    END as has_contact_info,
    (
        SELECT COUNT(*) 
        FROM admin_messages am 
        WHERE am.session_id = cs.session_id AND am.role = 'admin' AND am.is_read = FALSE
    ) as unread_admin_messages
FROM chat_sessions cs
ORDER BY cs.last_updated DESC;

-- Comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat conversations between users and AI/admin';
COMMENT ON TABLE admin_messages IS 'Stores real-time messages from admin to users';
COMMENT ON TABLE conversation_summaries IS 'Stores summaries of long conversations for context management';
COMMENT ON COLUMN chat_sessions.session_id IS 'Unique session identifier generated on client side';
COMMENT ON COLUMN chat_sessions.contact_info IS 'JSON object containing user contact preferences';
COMMENT ON COLUMN chat_sessions.status IS 'Current status: active, handoff_requested, closed';
