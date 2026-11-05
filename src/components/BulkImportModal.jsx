import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { parseCSV } from '../lib/csv.js';
import { normalizeBDPhone } from '../lib/phone.js';
import { analyzeWithRules } from '../lib/rulesFallback.js';
import { processQueueWithConcurrency } from '../lib/aiQueue.js';
import { analyzeEnquiry } from '../services/aiService.js';

export function BulkImportModal({
  knowledgeBase,
  onClose,
  onBulkImportLeads
}) {
  const [mode, setMode] = useState('csv'); // 'csv' | 'multi-paste'
  const [multiText, setMultiText] = useState('');
  const [defaultChannel, setDefaultChannel] = useState('WhatsApp');
  const [generateAIOnImport, setGenerateAIOnImport] = useState(true);
  const [previewItems, setPreviewItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const buildPreviewFromRows = (rawRows) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const mapped = rawRows
      .map((r, idx) => {
        const message =
          r['message'] ||
          r['enquiry'] ||
          r['text'] ||
          r['notes'] ||
          Object.values(r).pop() ||
          '';
        const channel =
          r['channel'] || r['source'] || r['where from'] || 'WhatsApp';
        const senderName =
          r['sender name'] || r['sendername'] || r['name'] || r['contact'] || '';
        const phone = normalizeBDPhone(r['phone'] || r['mobile'] || '');
        const receivedAt =
          r['received at'] || r['receivedat'] || r['date'] || nowStr;

        if (!message) return null;

        const base = analyzeWithRules({
          message,
          channel,
          senderName,
          phone,
          receivedAt,
          kb: knowledgeBase
        });

        return {
          id: `import_${Date.now()}_${idx}`,
          channel: base.detectedChannel,
          receivedAt,
          senderName: base.extractedName,
          phone: base.extractedPhone,
          message,
          leadType: base.leadType,
          interest: base.interest,
          status: base.recommendedStatus,
          urgency: base.urgency,
          language: base.detectedLanguage,
          replyLanguage: 'Auto',
          teamSize: base.teamSize,
          flags: base.flags,
          owner: 'Unassigned',
          nextFollowUpAt: base.nextFollowUpAt || '',
          aiSummary: base.aiSummary,
          nextAction: base.nextAction,
          suggestedReply: base.suggestedReply,
          missingFacts: base.missingFacts || [],
          aiSource: 'rules',
          editedFields: [],
          notes: [
            {
              id: `n_imp_${Date.now()}_${idx}`,
              date: receivedAt,
              text: `Imported via CSV / Bulk Import.`
            }
          ]
        };
      })
      .filter(Boolean);

    setPreviewItems(mapped);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      const rawRows = parseCSV(content);
      buildPreviewFromRows(rawRows);
    };
    reader.readAsText(file);
  };

  const handleParseMultiText = () => {
    const lines = multiText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    const rawRows = lines.map((line) => ({
      channel: defaultChannel,
      message: line
    }));
    buildPreviewFromRows(rawRows);
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) return;

    if (!generateAIOnImport) {
      onBulkImportLeads(previewItems);
      onClose();
      return;
    }

    setIsProcessing(true);
    setProgress({ completed: 0, total: previewItems.length });

    try {
      // Process ALL rows via concurrency=3 queue (no 5-row cap!)
      const enriched = await processQueueWithConcurrency({
        items: previewItems,
        concurrency: 3,
        processor: async (item) => {
          if (item.leadType === 'Spam') return item;
          const aiRes = await analyzeEnquiry({
            message: item.message,
            channel: item.channel,
            senderName: item.senderName,
            phone: item.phone,
            receivedAt: item.receivedAt,
            replyLanguage: 'Auto',
            knowledgeBase
          });

          return {
            ...item,
            senderName: aiRes.extractedName || item.senderName,
            phone: aiRes.extractedPhone || item.phone,
            channel: aiRes.detectedChannel || item.channel,
            leadType: aiRes.leadType || item.leadType,
            interest: aiRes.interest || item.interest,
            status: aiRes.recommendedStatus || item.status,
            urgency: aiRes.urgency || item.urgency,
            language: aiRes.detectedLanguage || item.language,
            teamSize: aiRes.teamSize !== undefined ? aiRes.teamSize : item.teamSize,
            flags: aiRes.flags || item.flags,
            nextFollowUpAt: aiRes.nextFollowUpAt || item.nextFollowUpAt,
            aiSummary: aiRes.aiSummary || item.aiSummary,
            nextAction: aiRes.nextAction || item.nextAction,
            suggestedReply: aiRes.suggestedReply || item.suggestedReply,
            missingFacts: aiRes.missingFacts || [],
            aiSource: aiRes.source || 'ai'
          };
        },
        onProgress: ({ completed, total }) => {
          setProgress({ completed, total });
        }
      });

      onBulkImportLeads(enriched);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white border-t sm:border border-[#DCE1E7] rounded-t-xl sm:rounded-md w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
      >
        <div className="p-4 sm:p-5 border-b border-[#DCE1E7] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-[#0067FF] text-white">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E293B]">
                Import Enquiries (CSV File or Multi-Line Text)
              </h2>
              <p className="text-xs text-[#64748B]">
                Processes all imported rows through the AI queue and merges duplicate phone numbers automatically
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded hover:bg-[#E2E8F0]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="flex space-x-1 p-1 bg-[#F1F5F9] rounded border border-[#DCE1E7] w-fit">
            <button
              type="button"
              onClick={() => {
                setMode('csv');
                setPreviewItems([]);
              }}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors ${
                mode === 'csv'
                  ? 'bg-[#0067FF] text-white'
                  : 'text-[#475569] hover:text-[#1E293B]'
              }`}
            >
              1. Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('multi-paste');
                setPreviewItems([]);
              }}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors ${
                mode === 'multi-paste'
                  ? 'bg-[#0067FF] text-white'
                  : 'text-[#475569] hover:text-[#1E293B]'
              }`}
            >
              2. Paste Multiple Lines
            </button>
          </div>

          {mode === 'csv' ? (
            <div className="border border-dashed border-[#CBD5E1] rounded-md p-6 text-center space-y-3 bg-[#F8FAFC]">
              <FileSpreadsheet className="h-9 w-9 text-[#059669] mx-auto" />
              <div>
                <div className="font-bold text-sm text-[#1E293B]">
                  Select a CSV file (such as BIAI&apos;s sample-enquiries.csv)
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Supports columns: <code>id, channel, received at, sender name, phone, message</code>
                </p>
              </div>
              <label className="inline-flex items-center space-x-2 px-4 py-2 rounded font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] cursor-pointer shadow-xs">
                <Upload className="h-4 w-4" />
                <span>Choose .CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#1E293B]">
                  Paste multiple enquiries (one message per line):
                </label>
                <select
                  value={defaultChannel}
                  onChange={(e) => setDefaultChannel(e.target.value)}
                  className="py-1 px-2.5 rounded border border-[#CBD5E1] bg-white font-semibold text-[#1E293B]"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook Messenger">Facebook Messenger</option>
                  <option value="Facebook comment">Facebook comment</option>
                  <option value="Website form">Website form</option>
                  <option value="Phone call note">Phone call note</option>
                </select>
              </div>
              <textarea
                rows={5}
                value={multiText}
                onChange={(e) => setMultiText(e.target.value)}
                placeholder={`Example:\nAssalamualaikum, bootcamp er fee koto? Amar naam Tanvir, 01711223344\nফেলোশিপ প্রোগ্রামের ক্লাস কি শুক্রবারে হয়? - নুসরাত, 01819001122\nWe need AI training for 30 bank officers in Gulshan. Call 01911556677`}
                className="w-full p-3 bg-white border border-[#CBD5E1] rounded font-sans text-[#1E293B]"
              />
              <button
                type="button"
                onClick={handleParseMultiText}
                disabled={!multiText.trim()}
                className="px-4 py-1.5 rounded font-semibold bg-[#17223B] text-white hover:bg-[#1E293B] disabled:opacity-50"
              >
                Preview Parsed Records
              </button>
            </div>
          )}

          <label className="flex items-center space-x-2 p-3 rounded bg-[#F8FAFC] border border-[#DCE1E7] cursor-pointer">
            <input
              type="checkbox"
              checked={generateAIOnImport}
              onChange={(e) => setGenerateAIOnImport(e.target.checked)}
              className="rounded text-[#0067FF] focus:ring-[#0067FF] h-4 w-4"
            />
            <span className="font-medium text-[#334155]">
              Run Server AI across all {previewItems.length || ''} imported rows (concurrency=3 with live progress)
            </span>
          </label>

          {/* Progress Bar while AI Queue is running */}
          {isProcessing && progress.total > 0 && (
            <div className="p-3 rounded bg-[#EBF2FF] border border-[#BBD6FF] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#0067FF]">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing via Server AI...
                </span>
                <span>
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded overflow-hidden">
                <div
                  className="h-full bg-[#0067FF] transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.completed / progress.total) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="border border-[#DCE1E7] rounded overflow-hidden">
              <div className="bg-[#F8FAFC] px-3 py-2 font-bold text-[#1E293B] border-b border-[#DCE1E7] flex items-center justify-between">
                <span>Ready to Import: {previewItems.length} Rows</span>
                <span className="text-[11px] text-[#059669] font-semibold">
                  RFC-4180 CSV Parsed
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#EEF1F5]">
                {previewItems.map((item, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 flex items-center justify-between gap-2 bg-white"
                  >
                    <div className="truncate flex-1">
                      <span className="font-semibold text-[#1E293B] mr-2">
                        {item.senderName}
                      </span>
                      <span className="text-[#64748B] font-mono mr-2">
                        {item.phone || 'no-phone'}
                      </span>
                      <span className="text-[#475569]">&ldquo;{item.message}&rdquo;</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1] font-semibold shrink-0">
                      {item.leadType === 'Sales' ? item.interest : item.leadType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#DCE1E7] flex items-center justify-end space-x-2 bg-[#F8FAFC]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#1E293B] bg-white border border-[#CBD5E1] rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={previewItems.length === 0 || isProcessing}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-50 rounded shadow-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Analyzing {progress.completed}/{progress.total}...
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Import {previewItems.length} Enquiries</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
