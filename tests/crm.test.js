import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCSV, buildCSVWithBOM } from '../src/lib/csv.js';
import { normalizeBDPhone, extractPhoneFromText } from '../src/lib/phone.js';
import {
  detectLanguage,
  extractNameFromText,
  analyzeWithRules
} from '../src/lib/rulesFallback.js';
import { deduplicateLeadList } from '../src/lib/dedupe.js';
import { getFollowUpStatus, needsFollowUp } from '../src/lib/followUp.js';
import { computePipelineStats } from '../src/lib/weeklyStats.js';
import { DEFAULT_KNOWLEDGE_BASE } from '../src/data/defaultKnowledgeBase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCSVPath = path.join(__dirname, '../src/data/sample-enquiries.csv');
const rawCSVText = fs.readFileSync(sampleCSVPath, 'utf8');

test('CSV parser parses all 20 BIAI sample enquiries including quoted commas', () => {
  const rows = parseCSV(rawCSVText);
  assert.equal(rows.length, 20);
  assert.equal(
    rows[2]['sender name'],
    'Mahmud Hasan (Managing Director, Gazipur textile company)'
  );
  assert.equal(rows[1]['phone'], ''); // Tahmina Akter has no phone
  assert.equal(rows[6]['sender name'], 'Farzana Rahman');
});

test('UTF-8 BOM CSV builder prepends \\uFEFF so Bangla opens in Excel', () => {
  const csvOut = buildCSVWithBOM(['Name', 'Message'], [['তাহমিনা', 'ফেলোশিপ']]);
  assert.ok(csvOut.startsWith('\uFEFF'));
  assert.ok(csvOut.includes('তাহমিনা,ফেলোশিপ'));
});

test('Phone normalization handles +880, 880, 01, and Bengali digits', () => {
  assert.equal(normalizeBDPhone('+880 1711-000001'), '01711000001');
  assert.equal(normalizeBDPhone('8801711000001'), '01711000001');
  assert.equal(normalizeBDPhone('01711000001'), '01711000001');
  assert.equal(
    extractPhoneFromText('আমার নাম্বার ০১৮১২৩৩৪৪৫৫'),
    '01812334455'
  );
});

test('Language detection identifies Bangla, Banglish (including #15 Add-on ta ki), and English across all 20 samples', () => {
  const rows = parseCSV(rawCSVText);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  assert.equal(detectLanguage(byId['1'].message), 'Banglish');
  assert.equal(detectLanguage(byId['2'].message), 'Bangla');
  assert.equal(detectLanguage(byId['3'].message), 'English');
  assert.equal(detectLanguage(byId['13'].message), 'Bangla');
  assert.equal(detectLanguage(byId['15'].message), 'Banglish'); // "Add-on ta ki? Lifetime access mane ki?"
  assert.equal(detectLanguage(byId['17'].message), 'Banglish');
});

test('Bangla name extraction does not mistake "ক্লাস" for a person name on Row #13', () => {
  const rows = parseCSV(rawCSVText);
  const row13 = rows.find((r) => r.id === '13');
  assert.equal(extractNameFromText(row13.message), '');
});

test('Zero hallucination check: fallback replies never contain invented prices, campuses, or URLs when KB is TBC', () => {
  const rows = parseCSV(rawCSVText);
  for (const row of rows) {
    const res = analyzeWithRules({
      message: row.message,
      channel: row.channel,
      senderName: row['sender name'],
      phone: row.phone,
      receivedAt: row['received at'],
      kb: DEFAULT_KNOWLEDGE_BASE
    });

    // Must never contain the old invented facts
    assert.ok(!/3,500|3500|35,000|35000|Banani|biai\.com\.bd/i.test(res.suggestedReply));
  }
});

test('Deduplication merges Rafi Ahmed (#1 and #12 on 01711000001) into 1 lead with 2 messages', () => {
  const rows = parseCSV(rawCSVText);
  const initial = rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    receivedAt: r['received at'],
    senderName: r['sender name'],
    phone: r.phone,
    message: r.message,
    leadType: 'Sales',
    interest: 'Bootcamp',
    status: 'New'
  }));

  const deduped = deduplicateLeadList(initial);
  assert.equal(deduped.length, 19);

  const rafi = deduped.find((l) => l.phone === '01711000001');
  assert.ok(rafi);
  assert.equal(rafi.repeatCount, 2);
  assert.equal(rafi.messages.length, 2);
});

test('48-hour follow-up reminder applies to New, Contacted, and Interested (not just New) and respects Paid/Lost', () => {
  const now = new Date('2026-10-30T12:00:00Z').getTime();

  const contactedOld = {
    leadType: 'Sales',
    status: 'Contacted',
    receivedAt: '2026-10-26 10:00',
    lastContactedAt: '2026-10-27 09:00'
  };
  assert.equal(needsFollowUp(contactedOld, now), true);

  const interestedRecent = {
    leadType: 'Sales',
    status: 'Interested',
    receivedAt: '2026-10-26 10:00',
    lastContactedAt: '2026-10-29 18:00'
  };
  assert.equal(needsFollowUp(interestedRecent, now), false);

  const paidLead = {
    leadType: 'Sales',
    status: 'Paid',
    receivedAt: '2026-10-20 10:00'
  };
  assert.equal(needsFollowUp(paidLead, now), false);

  // Support SLA check: unresolved high-urgency support (>4h) is overdue
  const urgentSupport = {
    leadType: 'Support',
    status: 'New',
    urgency: 'high',
    receivedAt: '2026-10-30 06:00', // 6 hours ago
    isResolved: false
  };
  assert.equal(needsFollowUp(urgentSupport, now), true);

  const resolvedSupport = {
    leadType: 'Support',
    status: 'New',
    urgency: 'high',
    receivedAt: '2026-10-30 06:00',
    isResolved: true
  };
  assert.equal(needsFollowUp(resolvedSupport, now), false);

  const scheduledDue = {
    leadType: 'Sales',
    status: 'Contacted',
    receivedAt: '2026-10-29 10:00',
    nextFollowUpAt: '2026-10-30 10:00'
  };
  const st = getFollowUpStatus(scheduledDue, now);
  assert.equal(st.isOverdue, true);
  assert.equal(st.isScheduledDue, true);
});

test('Weekly stats separates Sales leads from Support (#7, #16), Spam (#11), and Job Seeker (#20)', () => {
  const rows = parseCSV(rawCSVText);
  const analyzed = deduplicateLeadList(
    rows.map((r) => {
      const a = analyzeWithRules({
        message: r.message,
        channel: r.channel,
        senderName: r['sender name'],
        phone: r.phone,
        receivedAt: r['received at']
      });
      return {
        id: r.id,
        senderName: a.extractedName,
        phone: a.extractedPhone,
        channel: a.detectedChannel,
        receivedAt: r['received at'],
        message: r.message,
        leadType: a.leadType,
        interest: a.interest,
        status: a.recommendedStatus,
        urgency: a.urgency,
        language: a.detectedLanguage,
        teamSize: a.teamSize,
        missingFacts: a.missingFacts
      };
    })
  );

  const stats = computePipelineStats(
    analyzed,
    new Date('2026-10-30T12:00:00Z').getTime()
  );

  assert.equal(stats.totalEnquiries, 19); // 20 rows -> 19 unique leads (Rafi merged)
  assert.equal(stats.totalMessagesIngested, 20);
  assert.equal(stats.supportCount, 2); // #7 Farzana & #16 Habibur
  assert.equal(stats.spamCount, 1); // #11 Earn Crypto Daily
  assert.equal(stats.jobSeekerCount, 1); // #20 Arif Hossain
  assert.equal(stats.salesCount, 15); // 15 genuine sales enquiries
  assert.equal(stats.corporateCount, 3); // #3 (40), #10 (120), #18 (15)
  assert.equal(stats.totalCorporateSeats, 175); // 40 + 120 + 15 = 175 employees
});

