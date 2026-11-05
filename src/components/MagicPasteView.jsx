import React, { useState } from 'react';
import {
  Send,
  Copy,
  Check,
  Bot,
  CheckCircle2,
  Loader2,
  User,
  Phone,
  Globe,
  BookOpen,
  Layers,
  FileText,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { analyzeEnquiry } from '../services/aiService.js';
import { getPrimarySendAction } from '../utils/sendDispatcher';
import { findDuplicateByPhone } from '../lib/dedupe.js';

const PLATFORMS = [
  'WhatsApp',
  'Facebook Messenger',
  'Facebook comment',
  'Website form',
  'Phone call note'
];

const REPLY_LANGUAGES = ['Auto', 'Banglish', 'Bangla', 'English'];

const TEST_SAMPLES = [
  {
    label: 'Banglish Bootcamp Query',
    channel: 'WhatsApp',
    text: 'Assalamualaikum vai, amr naam Imtiaz (01715889900). Apnader 3 day AI bootcamp ta kobe theke shuru? bKash e payment korle ki kono discount pabo?'
  },
  {
    label: 'Bangla Fellowship Query',
    channel: 'Facebook Messenger',
    text: 'আসসালামু আলাইকুম, আমি সাদিয়া ইসলাম। আমি একটি ব্যাংকে জব করি, প্রোগ্রামিং জানি না। আপনাদের ফেলোশিপ কোর্সটি কি আমার জন্য উপযোগী হবে? আমার নাম্বার 01812334455'
  },
  {
    label: 'Corporate B2B Training (English)',
    channel: 'Website form',
    text: 'Hello BIAI team, I am Tariqul Islam, Head of HR at Apex Logistics (01911445566). We want to arrange a practical AI productivity training for 55 managers next month. Please send a corporate quote.'
  },
  {
    label: 'bKash Payment Unverified (Support)',
    channel: 'WhatsApp',
    text: 'ভাই আমি গতকাল বিকাশে পেমেন্ট করেছি কিন্তু এখনো কোনো কনফার্মেশন মেসেজ পাইনি! আমার নাম রাকিব, ফোন 01611778899।'
  }
];

export function MagicPasteView({
  leads = [],
  teamMembers = [],
  knowledgeBase,
  onIngestLead,
  onOpenKnowledgeBase
}) {
  const [selectedChannel, setSelectedChannel] = useState('WhatsApp');
  const [replyLanguage, setReplyLanguage] = useState('Auto');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editableLead, setEditableLead] = useState(null);
  const [copiedReply, setCopiedReply] = useState(false);

  const handleAnalyze = async (
    textOverride,
    channelOverride,
    replyLangOverride
  ) => {
    const textToUse = textOverride !== undefined ? textOverride : rawText;
    const chToUse = channelOverride || selectedChannel;
    const langToUse = replyLangOverride || replyLanguage;
    if (!textToUse.trim()) return;

    setLoading(true);
    try {
      const aiResult = await analyzeEnquiry({
        message: textToUse,
        channel: chToUse,
        replyLanguage: langToUse,
        knowledgeBase
      });

      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const createdLead = {
        id: `lead_${Date.now()}`,
        channel: aiResult.detectedChannel || chToUse,
        receivedAt: nowStr,
        senderName: aiResult.extractedName || 'New Enquiry',
        phone: aiResult.extractedPhone || '',
        message: textToUse.trim(),
        leadType: aiResult.leadType || 'Sales',
        interest: aiResult.interest || 'Bootcamp',
        status: aiResult.recommendedStatus || 'New',
        urgency: aiResult.urgency || 'normal',
        language: aiResult.detectedLanguage || 'Banglish',
        replyLanguage: langToUse,
        teamSize: aiResult.teamSize || null,
        flags: aiResult.flags || [],
        owner: 'Unassigned',
        nextFollowUpAt: aiResult.nextFollowUpAt || '',
        aiSummary: aiResult.aiSummary || '',
        nextAction: aiResult.nextAction || '',
        suggestedReply: aiResult.suggestedReply || '',
        missingFacts: aiResult.missingFacts || [],
        aiSource: aiResult.source || 'ai',
        editedFields: [],
        notes: [
          {
            id: `n_${Date.now()}`,
            date: nowStr,
            text: `Captured via Paste & Analyze (${aiResult.source === 'ai' ? 'Server AI' : 'Rules Fallback'}: ${aiResult.aiSummary || aiResult.interest}).`
          }
        ]
      };

      setEditableLead(createdLead);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySample = (sample) => {
    setSelectedChannel(sample.channel);
    setRawText(sample.text);
    handleAnalyze(sample.text, sample.channel, replyLanguage);
  };

  const handleCopyReply = () => {
    if (!editableLead?.suggestedReply) return;
    navigator.clipboard.writeText(editableLead.suggestedReply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

  const existingDuplicate = editableLead?.phone
    ? findDuplicateByPhone(leads, editableLead.phone)
    : null;

  const sendAction = editableLead
    ? getPrimarySendAction(editableLead, editableLead.suggestedReply)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-10">
      {/* Left Column: Paste Message Input (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-md border border-[#DCE1E7] p-5 shadow-xs flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-[#EEF1F5]">
            <div className="p-2 rounded bg-[#0067FF] text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                Step 1: Paste Customer Message or Call Note
              </h2>
              <p className="text-xs text-[#64748B]">
                Supports Bangla script, Banglish, and English
              </p>
            </div>
          </div>

          {/* Source Channel Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
              Source Channel
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setSelectedChannel(plat)}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                    selectedChannel === plat
                      ? 'bg-[#0067FF] text-white border-[#0067FF]'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>

          {/* Reply Language Selector (Auto / Banglish / Bangla / English) */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
              Reply Language Preference
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REPLY_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setReplyLanguage(lang);
                    if (rawText.trim() && editableLead) {
                      handleAnalyze(rawText, selectedChannel, lang);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                    replyLanguage === lang
                      ? 'bg-[#17223B] text-white border-[#17223B]'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {lang === 'Auto' ? 'Auto (Match Customer)' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Raw Message Textarea */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
              Raw Message / Phone Note
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw message here... e.g. 'Assalamualaikum, apnader bootcamp er fee koto? Amar naam Sabbir, phone 01711...'"
              className="w-full p-3 text-xs sm:text-sm bg-white border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0067FF] focus:ring-1 focus:ring-[#0067FF] text-[#1E293B] leading-relaxed"
            />
          </div>

          {/* 1-Click Test Samples */}
          <div>
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
              Quick Test Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEST_SAMPLES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(s)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0067FF] border border-[#DCE1E7] transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleAnalyze()}
          disabled={loading || !rawText.trim()}
          className="w-full py-2.5 px-4 rounded text-xs sm:text-sm font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-50 shadow-xs flex items-center justify-center space-x-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing via Server AI...</span>
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              <span>Extract Fields &amp; Draft Reply</span>
            </>
          )}
        </button>
      </div>

      {/* Right Column: Extracted CRM Fields + Reply + Direct Send Button (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-md border border-[#DCE1E7] p-5 shadow-xs flex flex-col justify-between">
        {!editableLead ? (
          <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#CBD5E1] rounded bg-[#F8FAFC]">
            <div className="h-12 w-12 rounded bg-[#E0F2FE] text-[#0067FF] flex items-center justify-center mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1E293B]">
              AI Field Extraction &amp; Grounded Reply Preview
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mt-1 leading-relaxed">
              Paste a customer enquiry on the left and click <strong>Extract Fields &amp; Draft Reply</strong>. The AI automatically fills in <strong>Name, Phone, Source Channel, Program Interest (Bootcamp / Fellowship / Corporate Training), and Stage</strong>, and drafts a reply grounded in your Knowledge Base.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EEF1F5]">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-[#059669]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Step 2: Review &amp; Edit Extracted Details
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded font-semibold bg-[#F1F5F9] text-[#334155] border border-[#DCE1E7]">
                  Detected: {editableLead.language}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    editableLead.aiSource === 'ai'
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                      : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                  }`}
                >
                  {editableLead.aiSource === 'ai'
                    ? 'Server AI Verified'
                    : 'Rules Fallback (AI Offline)'}
                </span>
              </div>
            </div>

            {/* Duplicate Phone Notice */}
            {existingDuplicate && (
              <div className="p-3 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center justify-between">
                <span>
                  <strong>Repeat Contact Detected:</strong> Phone{' '}
                  <span className="font-mono">{editableLead.phone}</span> already belongs to{' '}
                  <strong>{existingDuplicate.senderName}</strong>. Saving will merge this message into their thread.
                </span>
              </div>
            )}

            {/* AI Summary Banner */}
            {editableLead.aiSummary && (
              <div className="p-3 rounded bg-[#F0F7FF] border border-[#BFDBFE] text-xs text-[#1E293B]">
                <strong>AI Summary:</strong> {editableLead.aiSummary}
                {editableLead.nextAction && (
                  <span className="block text-[#0067FF] mt-0.5">
                    <strong>Recommended Next Step:</strong> {editableLead.nextAction}
                  </span>
                )}
              </div>
            )}

            {/* The Core Brief Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* 1. Name */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <User className="h-3 w-3 text-[#0067FF]" /> 1. Name
                </label>
                <input
                  type="text"
                  value={editableLead.senderName}
                  onChange={(e) =>
                    setEditableLead({ ...editableLead, senderName: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                />
              </div>

              {/* 2. Phone */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-[#059669]" /> 2. Phone
                </label>
                <input
                  type="text"
                  value={editableLead.phone}
                  placeholder="Not provided"
                  onChange={(e) =>
                    setEditableLead({ ...editableLead, phone: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-mono font-semibold text-[#1E293B]"
                />
              </div>

              {/* 3. Where they came from */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <Globe className="h-3 w-3 text-[#0284C7]" /> 3. Where From
                </label>
                <select
                  value={editableLead.channel}
                  onChange={(e) =>
                    setEditableLead({ ...editableLead, channel: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. What they want */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <BookOpen className="h-3 w-3 text-[#0067FF]" /> 4. What They Want
                </label>
                <select
                  value={editableLead.interest}
                  onChange={(e) =>
                    setEditableLead({ ...editableLead, interest: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                >
                  <option value="Bootcamp">Bootcamp</option>
                  <option value="Fellowship">Fellowship</option>
                  <option value="Corporate Training">Corporate Training</option>
                  <option value="Unknown">Unknown / Unspecified</option>
                </select>
              </div>

              {/* 5. Pipeline Status */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <Layers className="h-3 w-3 text-[#D97706]" /> 5. Pipeline Status
                </label>
                <select
                  value={editableLead.status}
                  onChange={(e) =>
                    setEditableLead({ ...editableLead, status: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Paid">Paid</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* 6. Lead Type & Owner */}
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#DCE1E7]">
                <label className="font-semibold text-[#64748B] flex items-center gap-1 mb-1">
                  <UserCheck className="h-3 w-3 text-[#475569]" /> Record Type &amp; Owner
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={editableLead.leadType}
                    onChange={(e) =>
                      setEditableLead({ ...editableLead, leadType: e.target.value })
                    }
                    className="w-1/2 py-1.5 px-1.5 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Support">Support</option>
                    <option value="Job Seeker">Job Seeker</option>
                    <option value="Spam">Spam</option>
                  </select>
                  <select
                    value={editableLead.owner}
                    onChange={(e) =>
                      setEditableLead({ ...editableLead, owner: e.target.value })
                    }
                    className="w-1/2 py-1.5 px-1.5 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                  >
                    {teamMembers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Missing Knowledge Base Facts Alert */}
            {editableLead.missingFacts && editableLead.missingFacts.length > 0 && (
              <div className="p-3 rounded bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start space-x-2 text-[#92400E]">
                  <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>
                    <strong>Knowledge Base TBC Guardrail:</strong> Customer asked about{' '}
                    <strong>{editableLead.missingFacts.join(', ')}</strong> (currently set to TBC). The reply promises team confirmation instead of inventing figures.
                  </span>
                </div>
                {onOpenKnowledgeBase && (
                  <button
                    type="button"
                    onClick={onOpenKnowledgeBase}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white border border-[#F59E0B] text-[#B45309] shrink-0 hover:bg-[#FEF3C7]"
                  >
                    Configure KB
                  </button>
                )}
              </div>
            )}

            {/* Suggested Reply Box */}
            <div className="bg-[#F8FAFC] p-4 rounded-md border border-[#DCE1E7]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1E293B]">
                  <Bot className="h-4 w-4 text-[#0067FF]" />
                  <span>
                    Step 3: Suggested Reply (
                    {editableLead.replyLanguage !== 'Auto'
                      ? editableLead.replyLanguage
                      : editableLead.language}
                    )
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReply}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-white text-[#334155] border border-[#CBD5E1] hover:bg-[#F1F5F9]"
                >
                  {copiedReply ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Reply</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={4}
                value={editableLead.suggestedReply}
                onChange={(e) =>
                  setEditableLead({ ...editableLead, suggestedReply: e.target.value })
                }
                className="w-full text-xs sm:text-sm p-3 bg-white border border-[#CBD5E1] rounded text-[#1E293B] leading-relaxed focus:outline-none focus:border-[#0067FF]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onIngestLead(editableLead, { sendImmediately: false });
                  setEditableLead(null);
                  setRawText('');
                }}
                className="px-4 py-2 rounded text-xs font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-[#0067FF]" />
                <span>
                  {existingDuplicate ? 'Merge into Existing Lead' : 'Save Lead to CRM'}
                </span>
              </button>

              {sendAction && editableLead.suggestedReply && (
                <button
                  type="button"
                  onClick={() => {
                    onIngestLead(editableLead, {
                      sendImmediately: true,
                      replyText: editableLead.suggestedReply
                    });
                    setEditableLead(null);
                    setRawText('');
                  }}
                  className={`px-4 py-2 rounded text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs transition-colors ${sendAction.colorClass}`}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Save &amp; {sendAction.label}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
