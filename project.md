# Project Memory & Master Blueprint: BIAI CRM (v5.0 — Clean & Grounded Edition)

> **Status:** All Code Audit Fixes Completed (Server-Side AI Proxy `/api/ai`, Zero Client API Key Exposure, TBC Knowledge Base Anti-Hallucination Guardrails, Verbatim 20 CSV Ingestion, Duplicate Phone Merging, Support/Spam/Job Seeker Triage Inbox, 48h Follow-up Across All Open Stages, Unit Tests & Zero Lint Warnings)  
> **Last Updated:** 2026-11-04  
> **Target Role:** BIAI AI Intern (Round 2 Assessment — Task 1)  
> **Workspace Path:** `/Users/mac/Desktop/WORK/BIAI Intern Project/biai-crm`

---

## ১. প্রজেক্টের মূল পরিবর্তন ও সমাধান (What Was Fixed & Improved)

1. **সিকিউরিটি ও সার্ভার-সাইড AI প্রক্সি (`server/aiHandler.js` & `api/ai.js`):**
   - ক্লায়েন্ট কোড (`src/`) এবং বিল্ড বান্ডেল (`dist/`) থেকে সব হার্ডকোডেড API Key সম্পূর্ণ মুছে ফেলা হয়েছে।
   - `.env` ফাইলটি `.gitignore`-এ যুক্ত করা হয়েছে এবং শুধুমাত্র সার্ভার এনভায়রনমেন্ট (`OPENROUTER_API_KEY`) থেকে কী রিড করা হয়।
   - লোকাল ডেভেলপমেন্টে Vite মিডলওয়্যার (`vite.config.js`) এবং প্রোডাকশনে Vercel Serverless Function (`api/ai.js`) একই `POST /api/ai` হ্যান্ডলার ব্যবহার করে।

2. **হ্যালুসিনেশন-মুক্ত Knowledge Base (`src/data/defaultKnowledgeBase.js`):**
   - কোনো বানানো কোর্স ফি (যেমন ৩,৫০০ বা ৩৫,০০০ টাকা), বানানো ক্যাম্পাস লোকেশন (বনানী/মিরপুর), বা রিফান্ড পলিসি এআই নিজে থেকে বলবে না।
   - যেসব তথ্য এখনো নির্ধারিত নয় সেগুলো `TBC` হিসেবে চিহ্নিত থাকে এবং এআই বিনীতভাবে জানায় যে আমাদের টিম তথ্যটি কনফার্ম করবে। ইউজার **Settings → Knowledge Base** থেকে আসল তথ্য বসিয়ে নিলেই এআই সেটি ব্যবহার করবে।

3. **BIAI-এর আসল ২০টি স্যাম্পল ডাটা (`src/data/sample-enquiries.csv`):**
   - হাতে বানানো নোট বা মুখস্থ স্ট্যাটাস মুছে সরাসরি অফিশিয়াল CSV থেকে ডাটা লোড করা হয়েছে।
   - **Duplicate Phone Merge (`src/lib/dedupe.js`):** রাফি আহমেদের দুটি মেসেজ (Row #1 এবং Row #12, ফোন `01711000001`) স্বয়ংক্রিয়ভাবে মার্জ হয়ে ১টি লিডের ভেতর ২টি মেসেজের থ্রেড হিসেবে থাকে।
   - **Bulk AI Queue (`src/lib/aiQueue.js`):** আগের ৫টি রো-এর সীমাবদ্ধতা (`index < 5`) তুলে দিয়ে সবগুলো এনকোয়ারি প্রোগ্রেস বার সহ (concurrency=3) এআই দিয়ে প্রসেস করার ব্যবস্থা করা হয়েছে।

4. **সেলস পাইপলাইন বনাম সাপোর্ট/স্প্যাম ট্রায়াজ ইনবক্স (`src/components/SupportInboxView.jsx`):**
   - **Sales Pipeline (`New` → `Contacted` → `Interested` → `Paid` / `Lost`):** শুধুমাত্র আসল সেলস লিডগুলো এখানে থাকে।
   - **Support & Other Inbox:** ফারজানা রহমান (Row #7, বিকাশ পেমেন্ট আনভেরিফায়েড), হাবিবুর রহমান (Row #16, ক্যান্সেলেশন ও ফেসবুক পোস্টের হুমকি), ক্রিপ্টো স্প্যাম বট (Row #11), এবং জব আবেদনকারী আরিফ হোসেন (Row #20) আলাদা ট্রায়াজ ইনবক্সে থাকে যাতে সেলস রিপোর্ট কখনো ভুল না হয়।

5. **সঠিক ৪৮ ঘণ্টার ফলো-আপ রিমাইন্ডার (`src/lib/followUp.js`):**
   - শুধুমাত্র `New` স্টেজে নয়—`New`, `Contacted`, এবং `Interested` সব ওপেন সেলস স্টেজেই সর্বশেষ যোগাযোগ (`lastContactedAt` বা `receivedAt`) থেকে ৪৮ ঘণ্টা পার হলে অথবা নির্ধারিত কলব্যাকের সময় (`nextFollowUpAt`, যেমন Row #5 নাসরিন সুলতানার বিকাল ৫টার পর কল) হলে ফলো-আপ অ্যালার্ট দেখায়।

6. **সত্যিকারের ডাটা-চালিত Weekly AI Summary (`src/components/WeeklySummaryView.jsx`):**
   - কোনো হার্ডকোডেড টেক্সট বা কাল্পনিক টাকার অংক নেই। পাইপলাইনের সব সংখ্যা কোডে হিসাব করা হয় (`src/lib/weeklyStats.js`) এবং এআই সেই আসল ডাটার ওপর ভিত্তি করে **Chase First** লিস্ট, সাপোর্ট এসকালেশন এবং বারবার আসা প্রশ্নের তালিকা তৈরি করে।

7. **ডেড কোড ক্লিনআপ, টেস্ট ও জিরো লিন্ট ওয়ার্নিং (`tests/crm.test.js`):**
   - অব্যবহৃত ৭টি পুরনো কম্পোনেন্ট ও সার্ভিস ফাইল মুছে ফেলা হয়েছে।
   - `LeadDetailModal.jsx`-এর React Hooks রুলস এরর এবং `Date.now` রেন্ডার পিউরিটি ওয়ার্নিং সমাধান করা হয়েছে (`npx oxlint` → 0 errors, 0 warnings)।
   - `npm test` কমান্ডে ৯টি ইউনিট টেস্ট শতভাগ পাস করছে।
