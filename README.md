# MeetingMind 🧠

> **Agentic Meeting Intelligence for High-Velocity Teams**  
> Turn voice conversations and transcripts into auditable decisions, catch cross-meeting policy contradictions before they become bugs, and keep humans firmly in control of task creation.

Built for the **Agentic AI Hackathon** with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Google Gemini Flash**.

---

## 🌟 The Problem MeetingMind Solves

Engineering and product teams spend dozens of hours every week making decisions in meetings. But within 48 hours:
1. **Organizational Amnesia**: Verbal commitments are lost or buried across fragmented docs.
2. **Cross-Meeting Policy Collisions**: One team decides to enforce hardware FIDO2 authentication; two weeks later, another team casually approves SMS 2FA for contractor onboarding—causing compliance violations.
3. **Autonomous Agent Chaos**: Traditional AI note-takers create noise by blindly dumping dozens of unverified tasks into issue trackers.

**MeetingMind bridges the gap**: It extracts structured consensus, cross-references historical memory for policy contradictions, and enforces human operator confirmation before any task is created.

---

## 🚀 Key Features

* **🎙️ Wispr Flow Voice Integration**: Dictate meeting recaps live with natural voice fluency or paste raw transcripts from Zoom, Google Meet, or Slack.
* **⚡ Server-Side Gemini Flash Intelligence**: Utilizes Google's active `gemini-3.5-flash-lite` (with automatic fallback to `gemini-3.8-flash`) via the official `@google/genai` SDK. Fast, structured JSON extraction with zero client-side key exposure.
* **🛡️ Cross-Meeting Conflict Detection**: The core differentiator. Before saving decisions, MeetingMind checks against historical organizational memory. If a proposed policy contradicts an established standard (e.g. rate limits, authentication requirements, code freeze windows), it flags the clash, presents both decisions side-by-side, explains the contradiction, and provides an actionable resolution.
* **👤 Human-in-the-Loop Task Governance**: Proposed tasks are strictly initialized as **`Awaiting Approval`** (`requiresUserConfirmation: true`). Team leads inspect and explicitly **Confirm** or **Reject** action items.
* **💾 Persistent Storage**: Lightweight atomic disk database (`data/meeting_mind_db.json`) ensuring all meetings, decisions, conflicts, and tasks survive browser refreshes and application restarts.
* **📊 Executive Weekly Digest**: Aggregates decisions, assignments, and upcoming deadlines across the entire organization or per team member.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript 5
* **Styling**: Tailwind CSS v4
* **Icons**: Lucide React
* **AI / LLM**: Google Gemini Developer API (`@google/genai` v2.32.0)
* **Database**: Atomic JSON file store with mutex queuing
* **Audio / Dictation**: Wispr Flow integration

---

## 🚦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/nikhi20-900/meeting-mind.git
cd meeting-mind
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your Google Gemini API key:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```
*(Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). MeetingMind supports both standard `AIza...` and new `AQ.Ab...` authorization keys).*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📁 Project Architecture

```
meeting-mind/
├── data/
│   └── meeting_mind_db.json         # Persistent JSON database (atomic writes)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard/route.ts   # Real-time dashboard stats & aggregations
│   │   │   ├── decisions/route.ts   # Decision memory query API
│   │   │   ├── extract/route.ts     # Server-side Gemini extraction & conflict pipeline
│   │   │   └── tasks/route.ts       # Task retrieval & human status update (PATCH)
│   │   ├── decision-memory/         # Long-term searchable organizational memory
│   │   ├── new-meeting/             # Transcript input, Wispr Flow banner, extraction
│   │   ├── tasks/                   # Task Tracker with Confirm / Reject workflow
│   │   ├── weekly-digest/           # Executive team synthesis & member filter
│   │   ├── globals.css              # Warm off-white & charcoal design tokens
│   │   ├── layout.tsx               # Root layout & system typography
│   │   └── page.tsx                 # Dashboard overview
│   ├── components/
│   │   ├── decision-memory/         # Filterable decision memory table & cards
│   │   ├── layout/                  # Collapsible sidebar & header shell
│   │   ├── new-meeting/             # Form input, conflict cards, extraction results
│   │   └── ui/                      # Badges, empty states, stat cards
│   ├── data/
│   │   └── mockData.ts              # Canonical initial organizational memory
│   ├── lib/
│   │   ├── conflictDetection.ts     # Semantic contradiction audit engine
│   │   ├── gemini.ts                # @google/genai client & key sanitizer
│   │   ├── validateExtraction.ts    # Schema validation for LLM outputs
│   │   └── db/                      # Repository layer & atomic file persistence
│   └── types/                       # TypeScript interfaces
├── .env.example                     # Safe environment template
├── package.json
└── tsconfig.json
```

---

## 🔒 Security & Privacy

* **Zero Key Leakage**: API keys are accessed exclusively in server-side API routes and are **never bundled or exposed to client browsers**.
* **Error Sanitization**: All error logs and upstream messages pass through an active sanitizer that strips query parameters, `AQ.` tokens, `AIza` keys, and Bearer headers.
* **Isolated Environment**: `.env.local` is strictly ignored by `.gitignore`.

---

## 📄 License

MIT License. Built with ❤️ for the Agentic AI Hackathon.
