// Deterministic Rule-Based Fallback Engine for BIAI CRM
// Used ONLY when the AI server proxy is unreachable or offline.
// Strictly uses the Knowledge Base (never invents prices, locations, URLs, or refund rules).

import { extractPhoneFromText, normalizeBDPhone } from './phone.js';
import { DEFAULT_KNOWLEDGE_BASE, isFactSet } from '../data/defaultKnowledgeBase.js';

export function detectLanguage(text = '') {
  if (!text) return 'English';
  // 1. Check for Bengali Unicode script
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'Bangla';
  }
  // 2. Comprehensive Banglish token regex (includes short particles: ta, ki, mane, naki, e, kobe, etc.)
  const banglishRegex =
    /\b(assalamualaikum|walaikum|salam|apnader|apni|tumi|amr|amar|amader|koto|kibhabe|kivabe|korte|korbo|korle|parbo|parben|hobe|hoy|kothay|kobe|shuru|bhai|vai|vaia|apu|pabo|pawa|jay|taka|bistarito|shathe|shate|shesh|dewa|lagbe|gula|gulo|bolen|bolben|ei|ekhon|naki|shob|ta|ti|ki|mane|keno|keu|kon|kono|jonyo|jonno|theke|diye|dibo|nite|chai|acca|accha)\b/i;
  if (banglishRegex.test(text)) {
    return 'Banglish';
  }
  return 'English';
}

export function extractNameFromText(text = '') {
  if (!text) return '';

  // Explicit Bangla name pattern: "আমার নাম ফারজানা রহমান" or "আমি সাদিয়া ইসলাম।"
  const banglaNameMatch = text.match(
    /(?:আমার নাম|নাম)\s*[:-]?\s*([\u0980-\u09FF\s]{3,30})/
  );
  if (banglaNameMatch && banglaNameMatch[1]) {
    const candidate = banglaNameMatch[1]
      .split(/[।,.\n!?]/)[0]
      .trim();
    if (candidate.length >= 2 && candidate.length <= 30) {
      return candidate;
    }
  }

  // Careful with "আমি" — avoid matching "আমি ক্লাস ৯-এ পড়ি" or "আমি একটি ব্যাংকে..."
  const banglaSelfIntro = text.match(
    /আমি\s+([\u0980-\u09FF]{2,15}(?:\s+[\u0980-\u09FF]{2,15})?)\s*[।,]/
  );
  if (banglaSelfIntro && banglaSelfIntro[1]) {
    const candidate = banglaSelfIntro[1].trim();
    const forbiddenWords = /(ক্লাস|একটি|ব্যাংকে|কোম্পানির|পেমেন্ট|ভর্তি|ফেলোশিপ|বুটক্যাম্প|করতে|চাই|পড়ি)/;
    if (!forbiddenWords.test(candidate)) {
      return candidate;
    }
  }

  // English / Banglish explicit name patterns: "amr naam Imtiaz", "my name is ...", "I am Tariqul Islam"
  const englishMatch = text.match(
    /(?:my name is|amar naam|amr naam|name\s*:|sender\s*:|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i
  );
  if (englishMatch && englishMatch[1]) {
    const candidate = englishMatch[1]
      .replace(/\b(from|at|and|calling|looking|asking|running)\b.*/i, '')
      .trim();
    if (candidate.length >= 2 && candidate.length <= 32) {
      return candidate;
    }
  }

  return '';
}

export function extractTeamSize(text = '') {
  if (!text) return null;
  const ascii = String(text).replace(/[০-৯]/g, (d) =>
    String('০১২৩৪৫৬৭৮৯'.indexOf(d))
  );
  const match = ascii.match(
    /\b(\d{1,4})\s*(?:-|\s)?(?:person|people|employees|employee|staff|managers|members|workers|জন|কর্মীর|কর্মী)/i
  );
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (n >= 2 && n <= 5000) return n;
  }
  return null;
}

export function classifyEnquiry(text = '') {
  // 1. Spam / Bot
  if (
    /(crypto|bitcoin|forex|usd every day|signals|bit\.ly|earn \d+|free money|click now|casino|airdrop)/i.test(
      text
    )
  ) {
    return {
      leadType: 'Spam',
      interest: 'Unknown',
      urgency: 'low',
      recommendedStatus: 'Lost',
      flags: ['spam-bot']
    };
  }

  // 2. Job Seeker
  if (
    /(job as an|looking for a job|ai intern|internship|where do i apply|vacancy|career opportunity|send my cv|drop my resume)/i.test(
      text
    )
  ) {
    return {
      leadType: 'Job Seeker',
      interest: 'Unknown',
      urgency: 'low',
      recommendedStatus: 'New',
      flags: ['job-applicant']
    };
  }

  // 3. Support & Escalations (already paid / angry cancellation / refund threat)
  const isAngryCancel =
    /(cancel.*enrol|get.*money back|very upset|post.*on facebook|threat|refund.*today)/i.test(
      text
    );
  const isPaymentUnverified =
    /(পেমেন্ট করেছি|কনফার্মেশন পাইনি|বিকাশে দিয়েছি|বিকাশে.*পাঠিয়েছি|no confirmation|paid.*but)/i.test(
      text
    );

  if (isAngryCancel) {
    return {
      leadType: 'Support',
      interest: 'Unknown',
      urgency: 'high',
      recommendedStatus: 'New',
      flags: ['angry-customer', 'refund-request', 'pr-risk']
    };
  }

  if (isPaymentUnverified) {
    return {
      leadType: 'Support',
      interest: 'Unknown',
      urgency: 'high',
      recommendedStatus: 'New',
      flags: ['payment-unverified']
    };
  }

  // 4. Corporate Training (B2B)
  const teamSize = extractTeamSize(text);
  if (
    /(textile|company|corporate|employees|bank in|garment|factory|for our team|group discount|কোম্পানির|কর্মীর জন্য|গ্রুপ ডিসকাউন্ট|quote for training)/i.test(
      text
    )
  ) {
    const flags = ['corporate-b2b'];
    if (teamSize) flags.push(`team-size:${teamSize}`);
    return {
      leadType: 'Sales',
      interest: 'Corporate Training',
      urgency: 'high',
      recommendedStatus: 'New',
      flags
    };
  }

  // 5. Fellowship
  if (
    /(fellowship|ফেলোশিপ)/i.test(
      text
    )
  ) {
    const flags = [];
    if (/instalment|installment/i.test(text)) flags.push('asks-instalment');
    if (/discount/i.test(text)) flags.push('asks-discount');
    if (/non-technical/i.test(text)) flags.push('non-technical');
    return {
      leadType: 'Sales',
      interest: 'Fellowship',
      urgency: /(ভর্তি হতে চাই|instalment|discount)/i.test(text) ? 'high' : 'normal',
      recommendedStatus: 'New',
      flags
    };
  }

  // 6. Bootcamp
  if (
    /(bootcamp|বুটক্যাম্প|3 day|masterclass|মাস্টারক্লাস)/i.test(
      text
    )
  ) {
    const flags = [];
    if (/price|koto|payment/i.test(text)) flags.push('asks-pricing');
    if (/live|recorded|recording/i.test(text)) flags.push('asks-format');
    if (/offline|mirpur|venue|kothay/i.test(text)) flags.push('asks-location');
    return {
      leadType: 'Sales',
      interest: 'Bootcamp',
      urgency: /(price|koto|payment)/i.test(text) ? 'high' : 'normal',
      recommendedStatus: 'New',
      flags
    };
  }

  // Pre-purchase refund policy question
  if (/offer refunds|refund policy|refund/i.test(text)) {
    return {
      leadType: 'Sales',
      interest: 'Unknown',
      urgency: 'normal',
      recommendedStatus: 'New',
      flags: ['asks-refund-policy']
    };
  }

  return {
    leadType: 'Sales',
    interest: 'Unknown',
    urgency: 'normal',
    recommendedStatus: 'New',
    flags: []
  };
}

export function extractSuggestedFollowUp(text = '', receivedAt = '') {
  if (!text) return null;
  // Detect "call again tomorrow after 5 PM" or "this week"
  if (/tomorrow/i.test(text)) {
    const base = receivedAt ? new Date(receivedAt.replace(' ', 'T')) : new Date();
    if (!isNaN(base.getTime())) {
      const next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
      if (/5\s*pm/i.test(text)) {
        next.setHours(17, 0, 0, 0);
      }
      const pad = (n) => String(n).padStart(2, '0');
      return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())} ${pad(next.getHours())}:${pad(next.getMinutes())}`;
    }
  }
  return null;
}

export function buildKnowledgeGroundedFallbackReply({
  name = '',
  message = '',
  leadType = 'Sales',
  interest = 'Bootcamp',
  language = 'English',
  replyLanguage = 'Auto',
  kb = DEFAULT_KNOWLEDGE_BASE
}) {
  const targetLang =
    replyLanguage && replyLanguage !== 'Auto' ? replyLanguage : language;
  const firstName = name
    ? name.replace(/\(.*\)/, '').trim().split(/\s+/)[0]
    : '';
  const missingFacts = [];

  if (leadType === 'Spam') {
    return {
      suggestedReply: '',
      missingFacts: [],
      aiSummary: 'Spam / promotional bot comment — archived automatically.',
      nextAction: 'No reply required'
    };
  }

  if (leadType === 'Job Seeker') {
    const careers = kb?.policies?.careersContact;
    const hasCareers = isFactSet(careers);
    if (!hasCareers) missingFacts.push('Careers application link/email');

    let reply = '';
    if (targetLang === 'Bangla') {
      reply = `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, BIAI-তে ক্যারিয়ার গড়ার আগ্রহের জন্য ধন্যবাদ! ${
        hasCareers
          ? `আবেদন করতে যোগাযোগ করুন: ${careers}।`
          : 'আমাদের এইচআর টিম শীঘ্রই আপনাকে ইন্টার্নশিপ আবেদনের বিস্তারিত প্রক্রিয়া জানিয়ে দেবে।'
      }`;
    } else if (targetLang === 'Banglish') {
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ''}, BIAI-te apply korar agroher jonno dhonnobad! ${
        hasCareers
          ? `Apnar CV pathate paren: ${careers}.`
          : 'Amader team apnake internship application process-er link shighroi janiye dibe.'
      }`;
    } else {
      reply = `Hi${firstName ? ' ' + firstName : ''}, thank you for your interest in an internship at BIAI! ${
        hasCareers
          ? `Please apply via ${careers}.`
          : 'Our team will share the official application details with you shortly.'
      }`;
    }

    return {
      suggestedReply: reply,
      missingFacts,
      aiSummary: 'Job/internship applicant asking where to apply.',
      nextAction: 'Share HR/careers application link'
    };
  }

  if (leadType === 'Support') {
    const isAngry = /(cancel|money back|upset|facebook)/i.test(message);
    if (isAngry) {
      const reply =
        targetLang === 'Bangla'
          ? `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, আপনার অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। বিষয়টি আমরা সর্বোচ্চ গুরুত্বের সাথে দেখছি এবং আমাদের সিনিয়র টিম মেম্বার দ্রুত আপনার সাথে ফোনে যোগাযোগ করে সমাধান করবেন।`
          : targetLang === 'Banglish'
            ? `Assalamualaikum${firstName ? ' ' + firstName : ''}, apnar oshubidhar jonno amra antorikbhabe dukkhito. Bishoyti amra urgent priority-te dekhchi ebong amader senior team member shighroi apnake call kore shomadhan korben.`
            : `Dear${firstName ? ' ' + firstName : ' Customer'}, we sincerely apologize for the frustration caused. We have escalated your request to a senior team member who will call you directly to resolve your cancellation and refund request.`;

      return {
        suggestedReply: reply,
        missingFacts,
        aiSummary: 'Upset customer requesting cancellation & refund (urgent escalation).',
        nextAction: 'Immediate phone call from senior manager'
      };
    }

    // Payment confirmation delay
    const reply =
      targetLang === 'Bangla'
        ? `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, সাময়িক বিলম্বের জন্য দুঃখিত। অনুগ্রহ করে আপনার পেমেন্ট ট্রানজেকশন আইডি (TrxID) এবং যে নম্বর থেকে পেমেন্ট করেছেন তা আমাদের জানান—আমাদের অ্যাকাউন্টস টিম দ্রুত ভেরিফাই করে কনফার্মেশন পাঠিয়ে দেবে।`
        : targetLang === 'Banglish'
          ? `Assalamualaikum${firstName ? ' ' + firstName : ''}, confirmation-e derir jonno dukkhito. Doya kore apnar payment Transaction ID (TrxID) ebong sender number-ti din, amader team verify kore ekhoni confirmation pathiye dibe.`
          : `Hi${firstName ? ' ' + firstName : ''}, sorry for the delay with your payment confirmation. Please share your Transaction ID (TrxID) and the sender phone number so our team can verify and send your confirmation right away.`;

    return {
      suggestedReply: reply,
      missingFacts,
      aiSummary: 'Customer reported payment completed but confirmation not received.',
      nextAction: 'Verify payment TrxID with accounts team and send confirmation'
    };
  }

  // Corporate Training
  if (interest === 'Corporate Training') {
    const teamSize = extractTeamSize(message);
    if (!isFactSet(kb?.corporate?.pricingModel)) {
      missingFacts.push('Corporate pricing / group discount tiers');
    }

    const reply =
      targetLang === 'Bangla'
        ? `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, আপনার প্রতিষ্ঠানের ${teamSize ? teamSize + ' জন কর্মীর ' : ''}AI ট্রেনিংয়ের ব্যাপারে যোগাযোগ করার জন্য ধন্যবাদ। আমরা অনলাইন বা অনসাইট উভয় মাধ্যমেই কাস্টমাইজড কর্পোরেট ট্রেনিং করিয়ে থাকি। আমাদের কর্পোরেট টিম আপনার সাথে ফোনে কথা বলে বিস্তারিত প্রপোজাল ও ডিসকাউন্ট পলিসি জানিয়ে দেবে। আজ বা আগামীকাল কোন সময়ে কল করলে আপনার সুবিধা হবে?`
        : targetLang === 'Banglish'
          ? `Assalamualaikum${firstName ? ' ' + firstName : ''}, apnar company-r ${teamSize ? teamSize + ' jon member-er ' : ''}AI training-er jonno jogajog koray dhonnobad. Amra customized corporate session korai. Amader corporate team apnake call kore quote o policy janiye dibe—kokhon call korle apnar shubidha hobe?`
          : `Hello${firstName ? ' ' + firstName : ''}, thank you for reaching out to BIAI regarding corporate AI training${teamSize ? ` for your ${teamSize}-person team` : ''}. We offer both online and onsite tailored programs. Our corporate training lead would love to give you a quick call this week to share a custom quote—what time works best for you?`;

    return {
      suggestedReply: reply,
      missingFacts,
      aiSummary: `Corporate training enquiry${teamSize ? ` (${teamSize} staff)` : ''}.`,
      nextAction: 'Schedule discovery call & prepare corporate quote'
    };
  }

  // Fellowship
  if (interest === 'Fellowship') {
    const f = kb?.fellowship || {};
    if (/কবে শুরু|start|kobe/i.test(message) && !isFactSet(f.nextCohortDate)) {
      missingFacts.push('Fellowship next start date');
    }
    if (/discount/i.test(message) && !isFactSet(f.studentDiscountPolicy)) {
      missingFacts.push('Fellowship student discount policy');
    }
    if (/instalment|installment/i.test(message) && !isFactSet(f.instalmentPolicy)) {
      missingFacts.push('Fellowship instalment policy');
    }
    if (/non-technical/i.test(message) && !isFactSet(f.suitability)) {
      missingFacts.push('Fellowship non-technical suitability details');
    }
    if (/job|career|placement/i.test(message) && !isFactSet(f.careerSupportPolicy)) {
      missingFacts.push('Fellowship career/job support policy');
    }

    let reply = '';
    if (targetLang === 'Bangla') {
      const dateNote = isFactSet(f.nextCohortDate)
        ? `পরবর্তী ব্যাচ শুরু হবে: ${f.nextCohortDate}।`
        : 'পরবর্তী ব্যাচের শুরুর তারিখ ও ভর্তির বিস্তারিত আমাদের টিম আপনাকে জানিয়ে দিচ্ছে।';
      reply = `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, BIAI ফেলোশিপ প্রোগ্রামে আগ্রহের জন্য ধন্যবাদ! ${dateNote} আপনার ফোন নম্বরটি শেয়ার করলে আমাদের কাউন্সেলর সরাসরি কথা বলে সাহায্য করতে পারবেন।`;
    } else if (targetLang === 'Banglish') {
      const careerNote = isFactSet(f.careerSupportPolicy)
        ? f.careerSupportPolicy
        : 'Amader course-e practical project thake ebong career guidance-er bishoye amader counselor apnake bistarito janiye diben.';
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ' vai/apu'}, BIAI program-e agroher jonno dhonnobad! ${careerNote} Apnar phone number-ti dile amra call kore details bolte pari.`;
    } else {
      const extra = [];
      if (/non-technical/i.test(message)) {
        extra.push(
          isFactSet(f.suitability)
            ? f.suitability
            : 'Our team will share the full syllabus and confirm how the Fellowship is structured for non-technical managers.'
        );
      } else if (/instalment|installment/i.test(message)) {
        extra.push(
          isFactSet(f.instalmentPolicy)
            ? `Regarding payment: ${f.instalmentPolicy}.`
            : 'Our admissions team will confirm our available payment plan options for you shortly.'
        );
      } else if (/discount/i.test(message)) {
        extra.push(
          isFactSet(f.studentDiscountPolicy)
            ? `Regarding student discount: ${f.studentDiscountPolicy}.`
            : 'We have noted your question about student discount terms and will confirm the policy when our counselor connects with you.'
        );
      } else {
        extra.push(
          'Our admissions advisor will share the Fellowship schedule and fee details with you shortly.'
        );
      }
      reply = `Hi${firstName ? ' ' + firstName : ''}, thank you for your interest in the BIAI AI Fellowship! ${extra.join(' ')}`;
    }

    return {
      suggestedReply: reply,
      missingFacts,
      aiSummary: `Fellowship enquiry (${message.slice(0, 55)}${message.length > 55 ? '...' : ''})`,
      nextAction: 'Follow up with Fellowship syllabus & confirm requested details'
    };
  }

  // Refund policy pre-sales question (#8 Anika)
  if (/refund/i.test(message)) {
    const refPolicy = kb?.policies?.refundPolicy;
    if (!isFactSet(refPolicy)) missingFacts.push('Official refund policy');
    const reply =
      targetLang === 'Bangla'
        ? `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, আপনার প্রশ্নের জন্য ধন্যবাদ। ${
            isFactSet(refPolicy)
              ? `আমাদের রিফান্ড পলিসি: ${refPolicy}।`
              : 'ক্লাসে উপস্থিত হতে না পারলে রিফান্ড বা পরবর্তী ব্যাচে স্থানান্তরের নিয়মাবলি আমাদের টিম আপনাকে বিস্তারিত জানিয়ে দেবে।'
          }`
        : targetLang === 'Banglish'
          ? `Assalamualaikum${firstName ? ' ' + firstName : ''}, apnar proshner jonno dhonnobad. ${
              isFactSet(refPolicy)
                ? `Amader refund policy: ${refPolicy}.`
                : 'Pay korar por attend korte na parle refund ba batch transfer policy-ti amader team apnake confirm kore janiye dibe.'
            }`
          : `Hi${firstName ? ' ' + firstName : ''}, thanks for asking! ${
              isFactSet(refPolicy)
                ? `Our refund policy is: ${refPolicy}.`
                : 'Our admissions team will confirm our official refund and batch-transfer policy for you before you complete payment.'
            }`;

    return {
      suggestedReply: reply,
      missingFacts,
      aiSummary: 'Prospective student asking about refund policy before paying.',
      nextAction: 'Confirm official refund/deferral terms'
    };
  }

  // Default: Bootcamp
  const b = kb?.bootcamp || {};
  if (/price|koto|payment/i.test(message) && !isFactSet(b.fee)) {
    missingFacts.push('Bootcamp fee');
  }
  if (/live|recorded|recording|add-on|lifetime/i.test(message) && !isFactSet(b.recordingPolicy)) {
    missingFacts.push('Bootcamp live/recording & add-on policy');
  }
  if (/offline|mirpur|kothay/i.test(message) && !isFactSet(b.location)) {
    missingFacts.push('Bootcamp offline class location');
  }
  if (/certificate|govt/i.test(message) && !isFactSet(b.certificatePolicy)) {
    missingFacts.push('Bootcamp certificate policy');
  }
  if (/মাস্টারক্লাস|masterclass/i.test(message) && !isFactSet(b.freeMasterclassPolicy)) {
    missingFacts.push('Free masterclass eligibility');
  }

  let reply = '';
  if (targetLang === 'Bangla') {
    if (/মাস্টারক্লাস|masterclass/i.test(message)) {
      reply = `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, ফ্রি মাস্টারক্লাসে তোমার আগ্রহের জন্য ধন্যবাদ! ${
        isFactSet(b.freeMasterclassPolicy)
          ? b.freeMasterclassPolicy
          : 'তুমি ফ্রি মাস্টারক্লাসে জয়েন করতে পারবে কি না এবং রেজিস্ট্রেশন লিংক আমাদের টিম দ্রুত তোমাকে জানিয়ে দিচ্ছে।'
      }`;
    } else {
      reply = `আসসালামু আলাইকুম${firstName ? ' ' + firstName : ''}, BIAI বুটক্যাম্পে আগ্রহের জন্য ধন্যবাদ! ${
        isFactSet(b.fee)
          ? `বুটক্যাম্পের ফি ${b.fee}।`
          : 'বুটক্যাম্পের বর্তমান ফি ও পেমেন্ট পদ্ধতি আমাদের টিম এখনই আপনাকে জানিয়ে দিচ্ছে।'
      }`;
    }
  } else if (targetLang === 'Banglish') {
    if (/price|koto|payment/i.test(message)) {
      reply = `Walaikum Assalam${firstName ? ' ' + firstName : ' vai'}! Amader 3-day Bootcamp-e agroher jonno dhonnobad. ${
        isFactSet(b.fee)
          ? `Bootcamp-er fee ${b.fee}. Payment korte parben: ${kb?.policies?.paymentMethods || 'bKash/Nagad'}.`
          : `Amader team ekhoni apnake Bootcamp-er current fee ebong payment process (${kb?.policies?.paymentMethods || 'bKash/Nagad'}) janiye dicche.`
      }`;
    } else if (/live|recorded|recording|add-on|lifetime/i.test(message)) {
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ' vai'}! ${
        isFactSet(b.recordingPolicy)
          ? b.recordingPolicy
          : 'Class format (live/recorded), recording access ebong add-on details amader team apnake ekhoni confirm korche.'
      }`;
    } else if (/offline|mirpur|kothay/i.test(message)) {
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ' vai'}! ${
        isFactSet(b.location)
          ? `Amader class location/format: ${b.location}.`
          : 'Offline class-er exact venue (Mirpur naki onno location) amader team apnake confirm kore janiye dicche.'
      } Apnar phone number-ti dile amra detail pathiye dite parbo.`;
    } else if (/certificate|govt/i.test(message)) {
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ' apu/vai'}! ${
        isFactSet(b.certificatePolicy)
          ? b.certificatePolicy
          : 'Course sheshe BIAI theke completion certificate dewa hoy; accreditation details amader team apnake confirm kore janabe.'
      }`;
    } else {
      reply = `Assalamualaikum${firstName ? ' ' + firstName : ''}! BIAI Bootcamp-e jogajog korar jonno dhonnobad. Amader team shighroi apnar proshner bistarito janiye dibe.`;
    }
  } else {
    reply = `Hi${firstName ? ' ' + firstName : ''}, thanks for reaching out about the BIAI Bootcamp! ${
      isFactSet(b.fee) ? `The fee is ${b.fee}. ` : ''
    }Our team will confirm the details you asked about right away.`;
  }

  return {
    suggestedReply: reply,
    missingFacts,
    aiSummary: `Bootcamp enquiry (${message.slice(0, 55)}${message.length > 55 ? '...' : ''})`,
    nextAction: 'Share Bootcamp details and answer specific question'
  };
}

export function analyzeWithRules({
  message = '',
  channel = 'WhatsApp',
  senderName = '',
  phone = '',
  receivedAt = '',
  replyLanguage = 'Auto',
  kb = DEFAULT_KNOWLEDGE_BASE
}) {
  const cleanMsg = String(message || '').trim();
  const detectedLanguage = detectLanguage(cleanMsg);
  const extractedPhone = normalizeBDPhone(phone) || extractPhoneFromText(cleanMsg);
  const extractedName =
    (senderName && senderName.trim()) ||
    extractNameFromText(cleanMsg) ||
    (extractedPhone ? `Lead (${extractedPhone.slice(-4)})` : 'New Enquiry');

  const classification = classifyEnquiry(cleanMsg);
  const teamSize = extractTeamSize(cleanMsg);
  const nextFollowUpAt = extractSuggestedFollowUp(cleanMsg, receivedAt);

  const replyPack = buildKnowledgeGroundedFallbackReply({
    name: extractedName,
    message: cleanMsg,
    leadType: classification.leadType,
    interest: classification.interest,
    language: detectedLanguage,
    replyLanguage,
    kb
  });

  return {
    extractedName,
    extractedPhone,
    detectedChannel: channel || 'WhatsApp',
    detectedLanguage,
    leadType: classification.leadType,
    interest: classification.interest,
    recommendedStatus: classification.recommendedStatus,
    urgency: classification.urgency,
    teamSize,
    flags: classification.flags,
    nextFollowUpAt,
    aiSummary: replyPack.aiSummary,
    nextAction: replyPack.nextAction,
    suggestedReply: replyPack.suggestedReply,
    missingFacts: replyPack.missingFacts,
    source: 'rules'
  };
}
