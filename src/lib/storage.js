// Enterprise Supabase Client & Dual-Sync Realtime Storage Adapter for BIAI CRM
// Persists leads and Knowledge Base to cloud Postgres with automatic fallback to localStorage.

import { createClient } from '@supabase/supabase-js';
import { DEFAULT_KNOWLEDGE_BASE } from '../data/defaultKnowledgeBase.js';

const LEADS_STORAGE_KEY = 'biai_crm_leads_v6';
const KB_STORAGE_KEY = 'biai_crm_knowledge_base_v1';
const TEAM_STORAGE_KEY = 'biai_crm_team_members_v1';

export const DEFAULT_TEAM_MEMBERS = [
  'Unassigned',
  'Nadia (Admissions)',
  'Tanvir (Corporate B2B)',
  'Farhan (Student Success)'
];

const supabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL || ''
    : '';
const supabaseAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

export function getStorageMode() {
  return isSupabaseConfigured ? 'supabase' : 'local';
}

// Convert camelCase Lead object to snake_case DB row
export function leadToDbRow(lead) {
  return {
    id: lead.id,
    channel: lead.channel || 'WhatsApp',
    received_at: lead.receivedAt || new Date().toISOString(),
    sender_name: lead.senderName || 'New Enquiry',
    phone: lead.phone || '',
    message: lead.message || '',
    messages: Array.isArray(lead.messages) ? lead.messages : [],
    repeat_count: Number(lead.repeatCount) || 1,
    lead_type: lead.leadType || 'Sales',
    interest: lead.interest || 'Unknown',
    status: lead.status || 'New',
    urgency: lead.urgency || 'normal',
    language: lead.language || 'English',
    reply_language: lead.replyLanguage || 'Auto',
    team_size: lead.teamSize !== undefined && lead.teamSize !== null ? Number(lead.teamSize) : null,
    flags: Array.isArray(lead.flags) ? lead.flags : [],
    owner: lead.owner || 'Unassigned',
    next_follow_up_at: lead.nextFollowUpAt || null,
    last_contacted_at: lead.lastContactedAt || null,
    is_resolved: Boolean(lead.isResolved),
    resolved_at: lead.resolvedAt || null,
    ai_summary: lead.aiSummary || '',
    next_action: lead.nextAction || '',
    suggested_reply: lead.suggestedReply || '',
    missing_facts: Array.isArray(lead.missingFacts) ? lead.missingFacts : [],
    ai_source: lead.aiSource || 'rules',
    edited_fields: Array.isArray(lead.editedFields) ? lead.editedFields : [],
    notes: Array.isArray(lead.notes) ? lead.notes : [],
    updated_at: new Date().toISOString()
  };
}

// Convert snake_case DB row to camelCase Lead object
export function dbRowToLead(row) {
  return {
    id: row.id,
    channel: row.channel,
    receivedAt: row.received_at,
    senderName: row.sender_name,
    phone: row.phone || '',
    message: row.message,
    messages: Array.isArray(row.messages) ? row.messages : [],
    repeatCount: Number(row.repeat_count) || 1,
    leadType: row.lead_type || 'Sales',
    interest: row.interest || 'Unknown',
    status: row.status || 'New',
    urgency: row.urgency || 'normal',
    language: row.language || 'English',
    replyLanguage: row.reply_language || 'Auto',
    teamSize: row.team_size !== null ? Number(row.team_size) : null,
    flags: Array.isArray(row.flags) ? row.flags : [],
    owner: row.owner || 'Unassigned',
    nextFollowUpAt: row.next_follow_up_at || '',
    lastContactedAt: row.last_contacted_at || '',
    isResolved: Boolean(row.is_resolved),
    resolvedAt: row.resolved_at || null,
    aiSummary: row.ai_summary || '',
    nextAction: row.next_action || '',
    suggestedReply: row.suggested_reply || '',
    missingFacts: Array.isArray(row.missing_facts) ? row.missing_facts : [],
    aiSource: row.ai_source || 'rules',
    editedFields: Array.isArray(row.edited_fields) ? row.edited_fields : [],
    notes: Array.isArray(row.notes) ? row.notes : []
  };
}

// ==========================================
// Cloud Operations with Local Fallback
// ==========================================

export async function fetchLeadsFromCloud() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('received_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, using local fallback:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(dbRowToLead);
    }
    return [];
  } catch (err) {
    console.warn('Network error reaching Supabase:', err);
    return null;
  }
}

export async function upsertLeadToCloud(lead) {
  if (!supabase || !lead?.id) return false;
  try {
    const row = leadToDbRow(lead);
    const { error } = await supabase.from('leads').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase lead upsert error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Network failure upserting lead to Supabase:', e);
    return false;
  }
}

export async function batchUpsertLeadsToCloud(leadList = []) {
  if (!supabase || leadList.length === 0) return false;
  try {
    const rows = leadList.map(leadToDbRow);
    const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase batch upsert error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Network failure batch upserting leads to Supabase:', e);
    return false;
  }
}

export async function deleteLeadFromCloud(id) {
  if (!supabase || !id) return false;
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Network failure deleting lead from Supabase:', e);
    return false;
  }
}

export async function fetchAppSettingFromCloud(key) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}

export async function saveAppSettingToCloud(key, value) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

// Setup Realtime Subscription
export function subscribeToCloudChanges({ onLeadsChange, onStatusChange }) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('crm_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        if (onLeadsChange) {
          onLeadsChange(payload);
        }
      }
    )
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Local Storage Read/Write (Offline Backup)
// ==========================================

export function loadStoredLeads(fallback = null) {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredLeads(leads = []) {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Failed to persist leads to localStorage:', e);
  }
}

export function clearStoredLeads() {
  try {
    localStorage.removeItem(LEADS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadKnowledgeBase() {
  try {
    const raw = localStorage.getItem(KB_STORAGE_KEY);
    if (!raw) return DEFAULT_KNOWLEDGE_BASE;
    const parsed = JSON.parse(raw);
    return {
      bootcamp: { ...DEFAULT_KNOWLEDGE_BASE.bootcamp, ...(parsed.bootcamp || {}) },
      fellowship: { ...DEFAULT_KNOWLEDGE_BASE.fellowship, ...(parsed.fellowship || {}) },
      corporate: { ...DEFAULT_KNOWLEDGE_BASE.corporate, ...(parsed.corporate || {}) },
      policies: { ...DEFAULT_KNOWLEDGE_BASE.policies, ...(parsed.policies || {}) }
    };
  } catch {
    return DEFAULT_KNOWLEDGE_BASE;
  }
}

export function saveKnowledgeBase(kb) {
  try {
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kb));
  } catch (e) {
    console.error('Failed to save Knowledge Base:', e);
  }
}

export function resetKnowledgeBase() {
  try {
    localStorage.removeItem(KB_STORAGE_KEY);
  } catch {
    // ignore
  }
  return DEFAULT_KNOWLEDGE_BASE;
}

export function loadTeamMembers() {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return DEFAULT_TEAM_MEMBERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEAM_MEMBERS;
  } catch {
    return DEFAULT_TEAM_MEMBERS;
  }
}

export function saveTeamMembers(members = DEFAULT_TEAM_MEMBERS) {
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
  } catch (e) {
    console.error('Failed to save team members:', e);
  }
}
