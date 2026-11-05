# BIAI CRM — AI-Assisted Enquiry & Pipeline Manager (Round 2 Task 1)

A multi-channel CRM built for **Bangladesh AI (BIAI)** to capture, classify, and follow up on incoming enquiries across **WhatsApp, Facebook Messenger, Facebook comments, Website forms, and Phone call notes** in **Bangla, Banglish, and English**.

---

## 1. How It Solves BIAI's Core Requirements

| Brief Requirement (Task 1) | How BIAI CRM Implements It |
|---|---|
| **1. Save each enquiry:** name, phone, where they came from, what they want (Bootcamp, Fellowship, or Corporate Training), and status | Every record stores `senderName`, normalized BD `phone` (`01XXXXXXXXX`), `channel`, `interest` (`Bootcamp` / `Fellowship` / `Corporate Training` / `Unknown`), and `status` (`New` → `Contacted` → `Interested` → `Paid` / `Lost`), plus owner, next follow-up timestamp, and message history. |
| **2. Use AI to read a pasted message and fill in details automatically** | **Paste & Analyze Lead** (`src/components/MagicPasteView.jsx`) sends raw text to our server-side AI proxy (`POST /api/ai`), extracting name, phone, source channel, program interest, record classification (`Sales` vs `Support` / `Job Seeker` / `Spam`), and a 1-line summary. All fields remain editable by a human, and human-edited fields are locked so future AI runs never overwrite them. |
| **3. Suggest a reply in English or Banglish, matching how the person wrote** | Automatically detects `Banglish`, `Bangla` (Bengali script), or `English` and drafts a courteous reply matching the customer's language. Includes a per-lead **Reply Language Override** (`Auto` / `Banglish` / `Bangla` / `English`) so an admissions rep can switch any reply to Banglish or English in one click. |
| **4. Simple pipeline: New, Contacted, Interested, Paid, Lost** | Interactive 5-stage Kanban board (`src/components/KanbanBoard.jsx`) and sortable spreadsheet table (`src/components/TableView.jsx`). Only genuine **Sales** leads appear in the sales pipeline so spam, job seekers, and support tickets never distort conversion numbers. |
| **Extra 1: 48-hour follow-up reminder** | `src/lib/followUp.js` flags any open sales lead (`New`, `Contacted`, or `Interested` — not just `New`) with no follow-up for more than **48 hours** since `lastContactedAt` (or `receivedAt` if never contacted), or whose scheduled `nextFollowUpAt` callback time is due. |
| **Extra 2: Weekly summary written by AI** | `src/components/WeeklySummaryView.jsx` computes exact pipeline metrics in code (`src/lib/weeklyStats.js`) and uses the server AI to write the executive narrative, **"Which Leads to Chase First"**, open support escalations, and recurring FAQ/Knowledge Base gaps. |

---

## 2. Key Architectural Decisions

### A. Server-Side AI Proxy (`server/aiHandler.js` & `api/ai.js`) — Zero Exposed Keys
- The OpenRouter API key (`OPENROUTER_API_KEY`) is stored **exclusively on the server** in `.env` (which is git-ignored).
- During local development, a custom Vite server plugin in `vite.config.js` mounts `POST /api/ai` using `loadEnv(mode, root, '')` on the Node server process.
- In production on Vercel, `api/ai.js` exposes the exact same `POST /api/ai` serverless endpoint.
- No API keys are ever bundled into `dist/` or stored in browser `localStorage`.

### B. Anti-Hallucination Knowledge Base (`src/data/defaultKnowledgeBase.js`)
- Because BIAI's sample brief does not specify exact course fees, cohort start dates, campus locations, or refund policies, **all unverified facts start as `TBC` (To Be Confirmed)** in the Knowledge Base.
- Both the server LLM system prompt and the offline rule engine follow a strict rule: **never invent prices, discounts, locations (e.g. Mirpur vs Banani), URLs, or refund windows**. If a customer asks for a `TBC` detail, the drafted reply politely says *"our team will confirm that specific detail shortly"* and flags the missing fact on the lead card so staff can fill it in under **Settings → Knowledge Base**.

### C. Verbatim Sample Data & Smart Deduplication (`src/data/sample-enquiries.csv`)
- The CRM loads BIAI's verbatim 20 rows directly from `src/data/sample-enquiries.csv` (no pre-fabricated statuses or fake notes).
- **Duplicate Phone Merging (`src/lib/dedupe.js`):** Row #1 and Row #12 are both from **Rafi Ahmed (`01711000001`)** asking about the Bootcamp price on Oct 26 and Oct 27. The CRM automatically merges them into **1 lead with a 2-message thread** (`Repeat 2x`) instead of cluttering the board with duplicate cards.
- **Non-Sales Triage Inbox (`src/components/SupportInboxView.jsx`):**
  - **Row #7 (Farzana Rahman — bKash payment unverified)** and **Row #16 (Habibur Rahman — upset cancellation & Facebook post threat)** are routed to **Support** with urgent escalation banners and Open/Resolved tracking (Farzana is *not* marked `Paid` before her TrxID is verified).
  - **Row #11 (Earn Crypto Daily)** is isolated as `Spam`.
  - **Row #20 (Arif Hossain — AI intern applicant)** is routed to `Job Seeker`.
  - **Row #8 (Anika Chowdhury — pre-purchase refund question)** stays in `Sales` so admissions can answer her policy question and close the enrollment.

---

## 3. Setup & Running Locally

### Prerequisites
- Node.js 18+

### Step 1: Configure `.env`
Copy `.env.example` to `.env` inside `biai-crm/` and set your server-side OpenRouter key:

```bash
cd biai-crm
cp .env.example .env
```

```env
OPENROUTER_API_KEY=your_openrouter_key_here
AI_MODEL=deepseek/deepseek-chat
```

### Step 2: Install, Test, and Start Dev Server

```bash
npm install
npm test        # Runs 9 unit tests (CSV, phone normalization, deduplication, 48h SLA, zero-hallucination KB)
npm run lint    # Runs oxlint (0 errors, 0 warnings)
npm run dev     # Starts Vite + /api/ai server middleware on http://localhost:5173
```

---

## 4. Database & Cloud Architecture

- **Dual-Sync Persistence:** The CRM is built with real-time cloud synchronization via **Supabase Postgres** (`leads` and `app_settings` tables) with automatic fallback to browser `localStorage` when offline.
- **SQL Schema:** See `supabase/schema.sql` for the reproducible database structure, RLS policies, and realtime publication setup.
- **Backup & Export:** Includes 1-click JSON snapshot backup/restore and UTF-8 BOM CSV export (Excel-safe for Bengali text).

---

## 5. What Does Not Work Yet & What We Would Build Next

1. **Role-Based Authentication (RBAC):** Counselor vs Manager logins so individual team members only see their assigned leads.
2. **Direct Meta / WhatsApp Business API Webhooks:** Live inbound/outbound sync directly inside the app without needing manual clipboard/wa.me redirects.
3. **Automated Cron Alerts:** Server-side push notifications (e.g. Telegram or Slack) when 48h SLA or Urgent Support tickets are breached.
