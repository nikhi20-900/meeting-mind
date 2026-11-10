<div align="center">

# MeetingMind 🧠

### **Agentic Meeting Intelligence & Organizational Policy Guardian**

Turn spoken conversations into auditable decisions, catch cross-meeting policy conflicts before they become bugs, and keep humans firmly in control of task creation.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini Flash](https://img.shields.io/badge/Google_Gemini-3.5_Flash-E37400?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Wispr Flow Ready](https://img.shields.io/badge/Wispr_Flow-Voice_Ready-FF5722?style=for-the-badge)](https://wisprflow.ai/)
[![License MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

[**Live Demo Walkthrough**](#-the-3-minute-live-demo-walkthrough) • [**System Architecture**](#-system-architecture) • [**Key Features**](#-key-features) • [**Getting Started**](#-getting-started) • [**Conflict Detection Engine**](#-cross-meeting-conflict-detection-deep-dive)

</div>

---

## 🌟 The Problem MeetingMind Solves

Engineering and product organizations spend hundreds of hours in meetings every week making commitments. But within 48 hours:

1. **Organizational Amnesia**: Verbal agreements evaporate or end up buried in disparate Google Docs, Slack huddles, and Zoom recordings.
2. **Cross-Meeting Policy Collisions**: One team establishes a strict security standard (e.g., *Mandate hardware FIDO2 keys; deprecate SMS 2FA*). Three weeks later, a different team casually approves SMS 2FA to unblock offshore contractors—silently violating compliance.
3. **Autonomous Agent Chaos**: Generic AI note-takers flood engineering backlogs with low-confidence, unverified action items that nobody owns.

### The MeetingMind Solution:
MeetingMind acts as an **active, policy-aware meeting intelligence layer**. It extracts structured consensus from speech, cross-references historical organizational memory to catch contradictory commitments, and enforces a **Human-in-the-Loop Approval Gatekeeper** before any task enters the sprint.

---

## 🏗️ System Architecture

MeetingMind connects voice dictation, frontier LLM extraction, semantic conflict audits, and lightweight persistence into a unified agentic loop:

```mermaid
flowchart TD
    subgraph Input ["1. Voice & Transcript Ingestion"]
        A["🎙️ Wispr Flow Voice Dictation"] --> C["Meeting Recap / Transcript"]
        B["📋 Zoom / Meet / Slack Transcript"] --> C
    end

    subgraph LLM ["2. Server-Side Extraction Pipeline"]
        C --> D["/api/extract Route (Server-Side Only)"]
        D --> E["Google Gemini Flash 3.5 / 3.8"]
        E --> F["Structured Output Validation<br/>(Summary, Decisions, Tasks, Speakers)"]
    end

    subgraph Audit ["3. Cross-Meeting Policy Guardian"]
        F --> G["Semantic Contradiction Engine"]
        H[("💾 Persistent Decision Memory<br/>(PostgreSQL in production)")] <--> G
        G -->|Genuine Contradiction| I["🚨 Red Conflict Alert Card<br/>(Both Decisions + Analysis + Resolution)"]
        G -->|Compatible / Insufficient Info| J["✅ Active Decision Verified"]
    end

    subgraph Governance ["4. Human-in-the-Loop Governance"]
        F --> K["Tasks Held in 'Awaiting Approval'<br/>(requiresUserConfirmation: true)"]
        K --> L["👤 Human Operator Review"]
        L -->|Confirm| M["Confirmed & Synced to Backlog"]
        L -->|Reject| N["Rejected with Audit Log"]
    end

    subgraph UI ["5. Executive Views"]
        M --> O["📊 Dashboard Overview"]
        J --> P["🧠 Decision Memory Repository"]
        I --> P
        O --> Q["📑 Executive Weekly Digest"]
    end
```

---

## 🚀 Key Features

| Capability | What It Does | Why It Matters |
| :--- | :--- | :--- |
| **🎙️ Wispr Flow Voice Integration** | Dictate meeting recaps with natural fluency directly into the recap text area. | Eliminates typing friction; capture meetings live as they conclude. |
| **⚡ Server-Side Gemini Intelligence** | Runs `gemini-3.5-flash-lite` with automatic fallback to `gemini-3.8-flash` via `@google/genai`. | Sub-second extraction with zero browser API key exposure. |
| **🛡️ Cross-Meeting Conflict Engine** | Automatically checks new decisions against historical memory for policy collisions. | Prevents contradictory engineering, SLA, and security commitments. |
| **👤 Human-in-the-Loop Governance** | All proposed tasks start in **`Awaiting Approval`** and require explicit confirmation. | Protects team capacity by stopping AI agents from polluting task trackers. |
| **🧹 Duplicate Review & Cleanup** | Finds records with matching wording and meeting context; editors choose the copy to keep before archiving the others. Archived copies remain stored and can be restored. | Cleans repeated imports without deleting records automatically; decisions with linked conflict history are protected. |
| **🗂️ Meeting Detail Records** | Brings each meeting recap together with linked decisions, conflict reviews, and action items, with links between related records. | Gives teams one place to revisit what was discussed and follow the work through. |
| **📝 Reusable Meeting Templates** | Editors can save and remove workspace-wide recap formats; teammates can load them into a new meeting and adjust the details. | Keeps recurring meetings consistent while avoiding repeated setup. |
| **📤 Meeting Summary Sharing & Export** | Review and edit a concise summary, then copy it, download it as Markdown, or share it with the device’s share menu. | Makes meeting outcomes easy to circulate while keeping the full transcript out of the summary by default. |
| **💾 Persistent Storage** | PostgreSQL with transaction-locked updates in hosted deployments; a local JSON store remains available for development. | Keeps hosted data durable across instances and prevents concurrent updates from overwriting each other. |
| **📊 Executive Weekly Digest** | Aggregates decisions, assignments, and deadlines across teams and individual members. | Instant executive synthesis for 1:1s, sprint planning, and leadership reviews. |

---

## 🛡️ Cross-Meeting Conflict Detection Deep-Dive

MeetingMind's conflict engine strictly audits candidate decisions to **eliminate false positives**:

```mermaid
flowchart LR
    A["Proposed Decision"] --> B{"Shares Domain Relevance?"}
    B -- No --> C["✅ Compatible (Different Domain)"]
    B -- Yes --> D{"Exploratory or Insufficient Info?"}
    D -- Yes (Study / Review) --> E["✅ Non-Conflicting (Zero False Positive)"]
    D -- No --> F{"Mutually Exclusive Mandate?"}
    F -- No (Caching / Alerting / Coexisting) --> G["✅ Compatible (Complements Policy)"]
    F -- Yes (Direct Contradiction) --> H["🚨 CONFLICT FLAGGED<br/>• Identifies Both Decisions<br/>• Explains Contradiction<br/>• Proposes Actionable Resolution"]
```

### Audited Real-World Test Scenarios:
1. **Genuine Contradiction (Flagged)**:
   * *Historical Decision (`#DEC-06`)*: "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA."
   * *New Decision*: "Permit and restore SMS 2FA as a standard login option for production database access to unblock contractors."
   * *Outcome*: **FLAGGED**. UI highlights both decisions side-by-side, explains that SMS 2FA violates the FIDO2 mandate, and suggests provisioning software-based WebAuthn tokens.
2. **Two Compatible Decisions (Not Flagged — Zero False Positives)**:
   * *Historical Decision (`#DEC-01`)*: "Cap standard API clients at 1,200 requests/minute to protect core database connection pools."
   * *New Decision*: "Deploy a Redis cache cluster in front of the API gateway and configure email alerts when clients reach 85% of their 1,200 requests/minute limit."
   * *Outcome*: **CLEAN (0 Conflicts)**. The engine recognizes that caching and alerting *complements and enforces* the rate limit rather than violating it.
3. **Insufficient Information (Not Flagged — Zero False Positives)**:
   * *Historical Decision (`#DEC-06`)*: "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA."
   * *New Decision*: "Task the security team with evaluating future alternative authentication methods and gathering contractor feedback during Q1."
   * *Outcome*: **CLEAN (0 Conflicts)**. Exploratory reviews and surveys without concrete policy enactments are never prematurely flagged.

---

## 🎬 The 3-Minute Live Demo Walkthrough

Follow this sequence to showcase the complete application workflow:

```
[0:00 - 0:30] Dashboard Overview (The Problem)
     ↓
[0:30 - 1:10] New Meeting (Wispr Flow Voice Dictation & Gemini Extraction)
     ↓
[1:10 - 1:55] Conflict Engine in Action (Red Alert: #DEC-06 vs SMS 2FA)
     ↓
[1:55 - 2:25] Human Task Approval (Confirming Action Item in Task Tracker)
     ↓
[2:25 - 2:45] Browser Refresh (Verifying True Disk Persistence)
     ↓
[2:45 - 3:00] Decision Memory & Weekly Digest (Organizational Consensus)
```

### Ready-to-Paste Conflict Demo Snippet:
```text
Title: Security Exception Review: Contractor Authentication
Attendees: Sarah Chen, Marcus Vance

Recap Text:
Discussion: Offshore contractor onboarding has been delayed due to physical YubiKey hardware shipping times. To unblock production database access for the external engineers, the team formally decided to permit and restore SMS 2FA as a standard login option for production database access.

Action Item: Sarah Chen to re-enable SMS provider credentials by Nov 05.
```

---

## 🚦 Getting Started

### Prerequisites
* **Node.js**: v20 or newer
* **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/app/apikey) *(Supports both standard `AIza...` and new `AQ.Ab...` authorization keys)*.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/nikhi20-900/meeting-mind.git
cd meeting-mind

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
```

Edit `.env.local`:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

For local PostgreSQL, start your PostgreSQL server and create a dedicated role and empty database. For example, in `psql` as a PostgreSQL administrator:

```sql
CREATE ROLE meeting_mind_local_app LOGIN PASSWORD 'replace-with-a-strong-local-password';
CREATE DATABASE meeting_mind_local OWNER meeting_mind_local_app;
```

Add the local connection string to `.env.local`:

```env
DATABASE_URL="postgresql://meeting_mind_local_app:your-password@127.0.0.1:5432/meeting_mind_local"
```

Keep `.env.local` private; it is ignored by Git. Without `DATABASE_URL`, local development uses the JSON file store. That store is intended for one local development process and does not coordinate writes across multiple server processes. With `DATABASE_URL`, local development and hosted deployments use PostgreSQL tables for meetings, decisions, tasks, conflicts, and workspace metadata. Records keep a JSONB payload for flexible application fields, while commonly used relationships, statuses, and dates are stored in indexed columns. Existing deployments using the earlier single-row state table are migrated transactionally the first time the updated app connects. Deploy that migration as a coordinated cutover: stop old app instances before starting the version that migrates the database. For hosted deployments, set `DATABASE_URL` (use the provider's pooled connection URL where applicable), `MEETING_MIND_ACCESS_KEY`, and a separate `MEETING_MIND_SESSION_SECRET`. Set `DATABASE_SSL=true` only when the provider requires TLS. Production fails closed when these settings are missing; it never falls back to a local file or open API access.

The editor key can read and update the workspace. Optionally set `MEETING_MIND_VIEW_KEY` for read-only access. These are shared workspace keys rather than individual accounts; this phase does not add SSO, per-person audit identity, or multiple isolated workspaces. Requests use signed, HTTP-only sessions, same-origin checks on changes, body size limits, and PostgreSQL-backed rate limits. Meeting extraction is limited to 10 requests per minute and 200 per day per signed session.

To move an existing local JSON store into a new, empty PostgreSQL database, set `DATABASE_URL` and run this once:

```bash
npm run db:import-json
```

The importer stops if it finds existing records in PostgreSQL, so it will not overwrite an active store. It leaves the original JSON file in place as a backup.

### Running Locally

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Repository Structure

```
meeting-mind/
├── data/
│   └── meeting_mind_db.json         # Development-only sample store
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard/route.ts   # Live dashboard telemetry endpoint
│   │   │   ├── decisions/route.ts   # Organizational decision query API
│   │   │   ├── extract/route.ts     # Secure server-side Gemini Flash extraction
│   │   │   └── tasks/route.ts       # Human task status mutation endpoint (PATCH)
│   │   ├── decision-memory/         # Searchable, filterable organizational memory
│   │   ├── new-meeting/             # Meeting input, Wispr Flow guide & extraction UI
│   │   ├── tasks/                   # Task Tracker with Confirm / Reject workflow
│   │   ├── weekly-digest/           # Executive team synthesis & member filters
│   │   ├── globals.css              # Warm off-white & charcoal design tokens
│   │   ├── layout.tsx               # Root app layout & metadata
│   │   └── page.tsx                 # Dashboard overview
│   ├── components/
│   │   ├── dashboard/               # Stat cards, recent meetings, decision lists
│   │   ├── decision-memory/         # Filterable decision table & category chips
│   │   ├── layout/                  # Collapsible sidebar & header shell
│   │   ├── new-meeting/             # Transcript input, conflict cards, results
│   │   └── ui/                      # Badges, empty states, stat cards
│   ├── data/
│   │   └── mockData.ts              # Canonical initial organizational memory
│   ├── lib/
│   │   ├── conflictDetection.ts     # Semantic contradiction audit engine
│   │   ├── gemini.ts                # @google/genai client & key sanitizer
│   │   ├── validateExtraction.ts    # Schema validation for LLM outputs
│   │   └── db/                      # Repository layer & atomic file persistence
│   └── types/                       # TypeScript interfaces
├── .env.example                     # Safe environment configuration template
├── package.json
└── tsconfig.json
```

---

## 🔒 Security & Privacy

* **Strict Key Isolation**: API keys are accessed **only on the server**. They are never injected into client JavaScript bundles or exposed to browsers.
* **Active Log Sanitization**: All error messages and logs pass through an automated regex sanitizer that scrubs query parameters (`key=...`), `AQ.` Auth keys, `AIza` keys, and `Bearer` headers.
* **Safe Repository**: `.env.local` is strictly ignored by `.gitignore` to prevent credential leakage.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
Built with ❤️ for the <b>Agentic AI Hackathon</b>.
</div>
