-- BIAI CRM Supabase Schema
-- Run this in Supabase SQL Editor if setting up a fresh database

CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL DEFAULT 'WhatsApp',
    received_at TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    message TEXT DEFAULT '',
    messages JSONB DEFAULT '[]'::jsonb,
    repeat_count INTEGER DEFAULT 1,
    lead_type TEXT DEFAULT 'Sales',
    interest TEXT DEFAULT 'Unknown',
    status TEXT DEFAULT 'New',
    urgency TEXT DEFAULT 'normal',
    language TEXT DEFAULT 'English',
    reply_language TEXT DEFAULT 'Auto',
    team_size INTEGER,
    flags JSONB DEFAULT '[]'::jsonb,
    owner TEXT DEFAULT 'Unassigned',
    next_follow_up_at TEXT,
    last_contacted_at TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TEXT,
    ai_summary TEXT DEFAULT '',
    next_action TEXT DEFAULT '',
    suggested_reply TEXT DEFAULT '',
    missing_facts JSONB DEFAULT '[]'::jsonb,
    ai_source TEXT DEFAULT 'rules',
    edited_fields JSONB DEFAULT '[]'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo usage
DROP POLICY IF EXISTS "Allow anon read/write leads" ON public.leads;
CREATE POLICY "Allow anon read/write leads" ON public.leads
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read/write app_settings" ON public.app_settings;
CREATE POLICY "Allow anon read/write app_settings" ON public.app_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

