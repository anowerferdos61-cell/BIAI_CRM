// Client-Side AI Service for BIAI CRM
// Communicates ONLY with our server-side `/api/ai` endpoint.
// Zero API keys exist in client code or browser storage.
// When the AI endpoint is offline, falls back transparently to `analyzeWithRules` with `source: 'rules'`.

import { analyzeWithRules } from '../lib/rulesFallback.js';
import { loadKnowledgeBase } from '../lib/storage.js';

export async function checkServerAIHealth() {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'health' })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        message: data?.error || `Server returned HTTP ${response.status}`
      };
    }
    return {
      ok: true,
      model: data.model,
      message: data.message || 'Server AI proxy connected'
    };
  } catch (err) {
    return {
      ok: false,
      message: err.message || 'Could not connect to /api/ai endpoint'
    };
  }
}

export async function analyzeEnquiry({
  message,
  channel = 'WhatsApp',
  senderName = '',
  phone = '',
  receivedAt = '',
  replyLanguage = 'Auto',
  knowledgeBase
}) {
  const kb = knowledgeBase || loadKnowledgeBase();

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'analyze',
        payload: {
          message,
          channel,
          senderName,
          phone,
          receivedAt,
          replyLanguage,
          knowledgeBase: kb
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.result) {
      throw new Error(data?.error || `AI proxy returned ${response.status}`);
    }

    return {
      ...data.result,
      source: 'ai'
    };
  } catch (err) {
    // Transparent deterministic fallback — tagged with source: 'rules' so UI shows honest badge
    const fallback = analyzeWithRules({
      message,
      channel,
      senderName,
      phone,
      receivedAt,
      replyLanguage,
      kb
    });
    return {
      ...fallback,
      source: 'rules',
      fallbackReason: err.message
    };
  }
}

export async function generateWeeklySummaryNarrative({ stats, leads }) {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'weekly-summary',
        payload: { stats, leads }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.result) {
      throw new Error(data?.error || `AI summary returned ${response.status}`);
    }

    return {
      ok: true,
      report: data.result
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'AI narrative unavailable'
    };
  }
}
