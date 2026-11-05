// Server-Side AI Handler for BIAI CRM
// Runs ONLY on the server (Vite dev middleware & Vercel serverless function).
// API keys are read from server environment variables and NEVER exposed to the client/browser.

import {
  DEFAULT_KNOWLEDGE_BASE,
  formatKnowledgeBaseForPrompt
} from '../src/data/defaultKnowledgeBase.js';
import { normalizeBDPhone, extractPhoneFromText } from '../src/lib/phone.js';
import { extractTeamSize, extractSuggestedFollowUp, detectLanguage } from '../src/lib/rulesFallback.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildSystemPrompt(knowledgeBase = DEFAULT_KNOWLEDGE_BASE) {
  const kbText = formatKnowledgeBaseForPrompt(knowledgeBase);

  return `You are the official Admissions & Operations AI Assistant for "Bangladesh AI" (BIAI).
BIAI runs three core training programs:
1. "Bootcamp" (3-Day AI Bootcamp)
2. "Fellowship" (AI Fellowship Program)
3. "Corporate Training" (B2B customized AI training for companies, banks, textile/garment factories)

${kbText}

STRICT ANTI-HALLUCINATION & GROUNDING RULES:
1. NEVER invent, guess, or assume any price, discount percentage, cohort start date, campus location (do NOT invent "Banani" or "Mirpur"), URL, refund window, or callback minute promise unless it is explicitly written in the Knowledge Base above and not marked "TBC".
2. Whenever the customer asks for a detail that is marked "TBC" in the Knowledge Base, your suggestedReply MUST politely acknowledge the question, state that our team will confirm that exact detail shortly, and ask a helpful follow-up question (such as their phone number if missing, or preferred call time).
3. Also list every unconfirmed fact the customer asked about inside the "missingFacts" JSON array (for example: ["Bootcamp fee", "Offline class location"]).

LANGUAGE MATCHING RULES (CRITICAL):
- Determine the language the customer used:
  1. "Bangla" -> Customer wrote in Bengali script (বাংলা অক্ষর, e.g. "ফেলোশিপ প্রোগ্রামে ভর্তি হতে চাই"). suggestedReply MUST be in polite, natural বাংলা (Bengali script).
  2. "Banglish" -> Customer wrote Bengali words using English/Latin alphabet (e.g. "apnader price koto?", "kobe shuru hobe?", "class gula live hoy naki recorded?", "kivabe pay korbo?"). suggestedReply MUST BE IN NATURAL BANGLISH (Latin alphabet). NEVER reply in English or Bengali script to a Banglish message!
  3. "English" -> Customer wrote standard English without Bengali words. suggestedReply MUST be in polite English.
- If Reply Language Override is set to "Banglish", "Bangla", or "English", you MUST follow that override for suggestedReply. If "Auto", you MUST match the customer's language.
- DO NOT default to English if the message is in Banglish!

LEAD CLASSIFICATION RULES:
- "leadType":
  - "Sales": Prospective student or corporate training buyer.
  - "Support": Customer who already paid (e.g. bKash unconfirmed) OR upset customer requesting cancellation/refund.
  - "Spam": Crypto scams, bots, suspicious links.
  - "Job Seeker": Internship or job applicant.
- "recommendedStatus":
  - For Support leads: DO NOT mark as "Paid" unless payment verification is explicitly confirmed. Default to "New".
  - For Spam: "Lost".
  - For Sales: "New".

Output strictly valid JSON matching the requested schema.`;
}

function cleanJsonString(raw = '') {
  return String(raw)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

// Call Google Gemini REST API directly using GEMINI_API_KEY
async function callGemini({ apiKey, systemInstruction, userPrompt, jsonMode = true }) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig = {
    temperature: 0.2,
    thinkingConfig: {
      thinkingBudget: 0
    }
  };
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = {};
    try { parsedErr = JSON.parse(errText); } catch { /* ignore */ }
    throw new Error(parsedErr?.error?.message || `Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, model: `gemini-2.5-flash` };
}

// Fallback to OpenRouter if configured
async function callOpenRouter({ apiKey, model, systemInstruction, userPrompt, jsonMode = true }) {
  const chosenModel = model || 'deepseek/deepseek-chat';
  const body = {
    model: chosenModel,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'BIAI CRM Server Proxy'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsed = {};
    try { parsed = JSON.parse(errText); } catch { /* ignore */ }
    throw new Error(parsed?.error?.message || `OpenRouter returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { text, model: data?.model || chosenModel };
}

// Unified LLM caller (Prefers Gemini, falls back to OpenRouter)
async function generateWithAI({ env, systemInstruction, userPrompt, jsonMode = true }) {
  const geminiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const openrouterKey = (env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
  const openrouterModel = (env.AI_MODEL || process.env.AI_MODEL || 'deepseek/deepseek-chat').trim();

  if (geminiKey) {
    try {
      return await callGemini({ apiKey: geminiKey, systemInstruction, userPrompt, jsonMode });
    } catch (geminiErr) {
      if (openrouterKey) {
        return await callOpenRouter({
          apiKey: openrouterKey,
          model: openrouterModel,
          systemInstruction,
          userPrompt,
          jsonMode
        });
      }
      throw geminiErr;
    }
  }

  if (openrouterKey) {
    return await callOpenRouter({
      apiKey: openrouterKey,
      model: openrouterModel,
      systemInstruction,
      userPrompt,
      jsonMode
    });
  }

  throw new Error('No AI API key configured on server. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to .env');
}

export async function handleAIRequest({ body = {}, env = {} }) {
  const geminiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const openrouterKey = (env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();

  const task = body?.task;

  if (!geminiKey && !openrouterKey) {
    return {
      status: 503,
      data: {
        ok: false,
        error: 'No AI API Key configured on server (.env).'
      }
    };
  }

  // Task 1: Health check
  if (task === 'health') {
    try {
      const res = await generateWithAI({
        env,
        systemInstruction: '',
        userPrompt: 'Reply with ONLY the word OK',
        jsonMode: false
      });
      return {
        status: 200,
        data: {
          ok: true,
          model: res.model,
          message: `Server AI proxy connected (${res.model})`
        }
      };
    } catch (err) {
      return {
        status: 502,
        data: {
          ok: false,
          error: err.message || 'Failed to reach AI service'
        }
      };
    }
  }

  // Task 2: Analyze a single enquiry message
  if (task === 'analyze') {
    const payload = body?.payload || {};
    const rawMessage = String(payload.message || '').slice(0, 4000).trim();
    if (!rawMessage) {
      return {
        status: 400,
        data: { ok: false, error: 'Message text is required.' }
      };
    }

    const channel = String(payload.channel || 'WhatsApp').slice(0, 80);
    const senderName = String(payload.senderName || '').slice(0, 120);
    const phone = String(payload.phone || '').slice(0, 40);
    const receivedAt = String(payload.receivedAt || '').slice(0, 40);
    const replyLanguage = String(payload.replyLanguage || 'Auto').slice(0, 20);
    const knowledgeBase = payload.knowledgeBase || DEFAULT_KNOWLEDGE_BASE;

    // Detect language deterministically as a strong guide for LLM
    const detectedLangHint = detectLanguage(rawMessage);
    const targetExpectedLanguage =
      replyLanguage && replyLanguage !== 'Auto' ? replyLanguage : detectedLangHint;

    const userPrompt = `Analyze this incoming BIAI enquiry and return ONLY a valid JSON object:

Enquiry Context:
- Source Channel: ${channel}
- Received At: ${receivedAt || 'Recent'}
- Provided Sender Name: ${senderName || '(Not provided — extract from message if mentioned)'}
- Provided Phone: ${phone || '(Not provided — extract from message if mentioned)'}
- Reply Language Override: ${replyLanguage}
- Detected Message Language Hint: ${detectedLangHint}
- Target Reply Language Required: ${targetExpectedLanguage}
- Customer Message: """${rawMessage}"""

IMPORTANT: Write the "suggestedReply" specifically in ${targetExpectedLanguage}. ${
  targetExpectedLanguage === 'Banglish'
    ? 'Use natural conversational Banglish (Bengali words written in English/Latin letters, e.g. "Assalamualaikum! Amader course fee details amra ekhoni janiye dicche..."). DO NOT write in English!'
    : targetExpectedLanguage === 'Bangla'
      ? 'Use natural Bengali script (বাংলা অক্ষর).'
      : 'Use clear, courteous English.'
}

Return strictly valid JSON with these exact keys:
{
  "extractedName": "Sender's name if provided or found in message, otherwise 'New Enquiry'",
  "extractedPhone": "Normalized Bangladeshi phone number (01XXXXXXXXX) if provided or found in message, else empty string",
  "detectedChannel": "WhatsApp" | "Facebook Messenger" | "Facebook comment" | "Website form" | "Phone call note",
  "detectedLanguage": "Bangla" | "Banglish" | "English",
  "leadType": "Sales" | "Support" | "Spam" | "Job Seeker",
  "interest": "Bootcamp" | "Fellowship" | "Corporate Training" | "Unknown",
  "recommendedStatus": "New" | "Contacted" | "Interested" | "Paid" | "Lost",
  "urgency": "high" | "normal" | "low",
  "teamSize": number or null (for corporate training enquiries mentioning employee/person count),
  "flags": ["array of short tags e.g. corporate-b2b, angry-customer, refund-request, payment-unverified, asks-instalment, asks-discount, repeat-contact"],
  "nextFollowUpAt": "YYYY-MM-DD HH:mm if the message mentions when to call back, else null",
  "aiSummary": "Concise 1-sentence summary of who this person is and what they need",
  "nextAction": "Clear, specific next step for the BIAI team member",
  "missingFacts": ["Any specific price/date/location/policy the customer asked for that is still TBC in the Knowledge Base"],
  "suggestedReply": "Polite, helpful reply in the appropriate matching language (never inventing TBC facts; leave empty string if Spam)"
}`;

    try {
      const { text, model } = await generateWithAI({
        env,
        systemInstruction: buildSystemPrompt(knowledgeBase),
        userPrompt,
        jsonMode: true
      });

      const parsed = JSON.parse(cleanJsonString(text));

      const validLeadTypes = ['Sales', 'Support', 'Spam', 'Job Seeker', 'Other'];
      const validInterests = ['Bootcamp', 'Fellowship', 'Corporate Training', 'Unknown'];
      const validStatuses = ['New', 'Contacted', 'Interested', 'Paid', 'Lost'];
      const validLanguages = ['Bangla', 'Banglish', 'English'];

      const normalizedPhone =
        normalizeBDPhone(phone) ||
        normalizeBDPhone(parsed.extractedPhone) ||
        extractPhoneFromText(rawMessage);

      const finalLeadType = validLeadTypes.includes(parsed.leadType)
        ? parsed.leadType
        : 'Sales';
      const finalInterest = validInterests.includes(parsed.interest)
        ? parsed.interest
        : 'Unknown';

      // Anti-hallucination guard: Support / unverified payments MUST NEVER default to 'Paid'
      let finalStatus = validStatuses.includes(parsed.recommendedStatus)
        ? parsed.recommendedStatus
        : 'New';

      if (finalLeadType === 'Support' && finalStatus === 'Paid') {
        finalStatus = 'New';
      }
      if (finalLeadType === 'Spam') {
        finalStatus = 'Lost';
      }

      // Language fallback guard: if LLM failed to match Banglish vs Bangla
      let finalLanguage = validLanguages.includes(parsed.detectedLanguage)
        ? parsed.detectedLanguage
        : detectedLangHint;

      if (detectedLangHint === 'Banglish' && finalLanguage === 'Bangla') {
        finalLanguage = 'Banglish';
      }

      let finalSuggestedReply =
        finalLeadType === 'Spam'
          ? ''
          : String(parsed.suggestedReply || '').trim();

      // Post-validation: If target is Banglish but LLM replied in pure English or Bangla script
      const targetLang =
        replyLanguage && replyLanguage !== 'Auto' ? replyLanguage : finalLanguage;

      if (targetLang === 'Banglish' && finalSuggestedReply) {
        const replyLang = detectLanguage(finalSuggestedReply);
        // If reply has Bengali script OR detectLanguage returned English (meaning no Banglish tokens found)
        const hasBanglaScript = /[\u0980-\u09FF]/.test(finalSuggestedReply);
        if (hasBanglaScript || replyLang === 'English') {
          try {
            const convertPrompt = `Translate/rephrase this message into natural, friendly, professional Banglish (Bengali words written in Latin/English alphabet, e.g. "Assalamualaikum! Amader course fee details amra apnake ekhoni janiye dicche...").
NEVER use Bengali script characters. NEVER write pure English.

Original text:
"${finalSuggestedReply}"

Output ONLY the Banglish text without quotes or explanations.`;
            const converted = await generateWithAI({
              env,
              systemInstruction: 'You translate text into natural Banglish (Latin script). Output ONLY the Banglish text.',
              userPrompt: convertPrompt,
              jsonMode: false
            });
            if (converted && converted.text) {
              const cleaned = converted.text.replace(/^["']|["']$/g, '').trim();
              if (cleaned && !/[\u0980-\u09FF]/.test(cleaned)) {
                finalSuggestedReply = cleaned;
              }
            }
          } catch {
            // Keep original if conversion fails
          }
        }
      }

      return {
        status: 200,
        data: {
          ok: true,
          result: {
            extractedName:
              senderName ||
              parsed.extractedName ||
              (normalizedPhone ? `Lead (${normalizedPhone.slice(-4)})` : 'New Enquiry'),
            extractedPhone: normalizedPhone,
            detectedChannel: channel || parsed.detectedChannel || 'WhatsApp',
            detectedLanguage: finalLanguage,
            leadType: finalLeadType,
            interest: finalInterest,
            recommendedStatus: finalStatus,
            urgency: ['high', 'normal', 'low'].includes(parsed.urgency)
              ? parsed.urgency
              : 'normal',
            teamSize:
              typeof parsed.teamSize === 'number'
                ? parsed.teamSize
                : extractTeamSize(rawMessage),
            flags: Array.isArray(parsed.flags) ? parsed.flags : [],
            nextFollowUpAt:
              parsed.nextFollowUpAt ||
              extractSuggestedFollowUp(rawMessage, receivedAt),
            aiSummary: String(parsed.aiSummary || '').trim(),
            nextAction: String(parsed.nextAction || '').trim(),
            missingFacts: Array.isArray(parsed.missingFacts)
              ? parsed.missingFacts
              : [],
            suggestedReply: finalSuggestedReply,
            source: 'ai',
            aiModelUsed: model
          }
        }
      };
    } catch (err) {
      return {
        status: 502,
        data: {
          ok: false,
          error: err.message || 'Failed to parse AI analysis response'
        }
      };
    }
  }

  // Task 3: Weekly Executive Summary narrative
  if (task === 'weekly-summary') {
    const payload = body?.payload || {};
    const stats = payload.stats || {};
    const leads = Array.isArray(payload.leads) ? payload.leads.slice(0, 100) : [];

    const compactLeads = leads.map((l) => ({
      id: l.id,
      name: l.senderName,
      channel: l.channel,
      leadType: l.leadType,
      interest: l.interest,
      status: l.status,
      urgency: l.urgency,
      teamSize: l.teamSize || null,
      repeatCount: l.repeatCount || 1,
      hasPhone: Boolean(l.phone),
      isResolved: Boolean(l.isResolved),
      summary: l.aiSummary || String(l.message || '').slice(0, 100),
      missingFacts: l.missingFacts || []
    }));

    const summaryPrompt = `You are generating the Weekly Pipeline & Action Summary for the BIAI team.
Use ONLY the real numbers and enquiries provided below. NEVER invent BDT currency totals or fake names.

Computed Pipeline Metrics:
${JSON.stringify(stats, null, 2)}

Current Enquiries (${compactLeads.length}):
${JSON.stringify(compactLeads, null, 2)}

Return strictly valid JSON with these exact keys:
{
  "executiveOverview": "2-3 sentences summarizing total enquiries, sales vs support/spam split, corporate training demand (mentioning team sizes), and follow-up urgency.",
  "chaseFirst": [
    {
      "name": "Lead Name",
      "reason": "Why this lead is top priority right now",
      "action": "Specific next step for the sales rep"
    }
  ],
  "supportAndEscalations": [
    "Specific bullet for each open support or refund escalation needing attention"
  ],
  "faqAndKnowledgeGaps": [
    "Recurring questions students are asking that should be clarified or added to the Knowledge Base"
  ]
}`;

    try {
      const { text } = await generateWithAI({
        env,
        systemInstruction:
          'You are an operations analyst for Bangladesh AI (BIAI). Output strictly valid JSON grounded only in the provided records.',
        userPrompt: summaryPrompt,
        jsonMode: true
      });

      const parsed = JSON.parse(cleanJsonString(text));

      return {
        status: 200,
        data: {
          ok: true,
          result: {
            executiveOverview: String(parsed.executiveOverview || ''),
            chaseFirst: Array.isArray(parsed.chaseFirst) ? parsed.chaseFirst : [],
            supportAndEscalations: Array.isArray(parsed.supportAndEscalations)
              ? parsed.supportAndEscalations
              : [],
            faqAndKnowledgeGaps: Array.isArray(parsed.faqAndKnowledgeGaps)
              ? parsed.faqAndKnowledgeGaps
              : [],
            generatedAt: new Date().toISOString()
          }
        }
      };
    } catch (err) {
      return {
        status: 502,
        data: {
          ok: false,
          error: err.message || 'Failed to generate AI weekly summary'
        }
      };
    }
  }

  return {
    status: 400,
    data: { ok: false, error: `Unknown AI task: ${String(task)}` }
  };
}
