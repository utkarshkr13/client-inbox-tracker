# Client Inbox Tracker — L2 Client Escalation Portal

> A production-grade client communication management system for Business Analysts and L2 support teams, featuring intelligent Gmail-based routing, SLA enforcement, and a full escalation workflow.

🔗 **Live app**: https://client-inbox-tracker.vercel.app

---

## What It Does

Client-facing teams often manage dozens of client emails across multiple projects with no structured way to track SLAs, route to the right person, or escalate when things fall through. This tool solves exactly that.

It connects to your Gmail account, syncs client emails per project, and gives the BA and L2 team a shared dashboard to triage, respond, escalate, and report — all without ever leaving the app.

---

## Key Features

### 1. Smart L2 / BA Routing
Automatically determines the correct responder based on Gmail To/CC fields:

| Gmail Signal | Routing Decision |
|---|---|
| Email **To: BA**, L2 in CC | → BA tier — BA leads, L2 looped in |
| Email **To: L2**, BA in CC | → L2 tier — L2 must respond first |
| Email **To: BA and L2** | → BA tier — BA explicitly addressed |
| No match | → Category-based fallback (Bug/General → L2) |

### 2. SLA Tracker
- Configurable SLA thresholds per project
- Amber warning badge as deadline approaches
- Red breach badge when SLA is exceeded
- Dedicated **L2 SLA breach** alerts: `"🔴 L2 SLA breach — BA to step in"`
- Weekly Digest surfaces all overdue L2 emails with hours overdue

### 3. Escalation Workflow
- One-click escalation with required note
- Status set to `"escalated"` — visible across the team
- BA's Weekly Digest shows the full escalation queue

### 4. Internal Notes
- Private notes per email thread — never touches Gmail
- Full note history retained

### 5. Full-Text Search
- Cross-project search across subject, sender, snippet, and email content

### 6. Analytics Dashboard
- Charts for: status distribution, category breakdown, routing split (L2 vs BA), project volume
- Weekly Digest KPI strip with escalation count, follow-up due count, L2 SLA breach count

### 7. AI Auto-Categorisation
- On every sync, emails are automatically tagged: Billing / Bug / Feature / Meeting / Approval / Update / General
- Keyword-based classification — no external API call needed

### 8. Client CRM (Lite)
- Per-project contact profiles: name, role, company, contract end date, risk level (RAG)

### 9. Mobile PWA
- Installable on iPhone and Android via `manifest.json` and Apple web app meta tags

### 10. Additional Features
- **Custom Tags** — colour-coded, apply/remove per email
- **Follow-up Reminders** — date picker with overdue badge in Digest
- **Bulk Actions** — multi-select → Done / Dismiss / Pending / Route to L2 / Route to BA
- **Thread View** — group emails by Gmail thread ID
- **Attachment Indicator** — 📎 badge auto-detected on sync
- **Audit Trail** — full activity log per email with timestamp
- **Response Templates** — CRUD library with clipboard copy from email view
- **Webhook / Slack Notifications** — fire on status changes, configurable per project
- **Project Templates** — save SLA config and reuse across new projects

---

## Dashboard UI/UX Refinements

Changes merged across several PRs since the initial 2026-05-24 write-up, most recently PR #10 (merged 2026-07-09).

- **Chart interpolation** — the activity chart on the dashboard now draws its line with monotone cubic (Fritsch-Carlson) interpolation instead of naive Catmull-Rom, so the curve no longer overshoots or undershoots past actual data points.
- **Range tabs** — the chart has functional 7d / 30d / 90d tabs. All three are backed by real aggregated data: a single 90-day superset query is fetched once and bucketed client-side per range, not mocked or re-queried per tab.
- **Chart tooltips** — hovering a point on the chart shows a tooltip with the day label and the real Total/Pending counts for that day, along with a vertical guide line at the hovered position.
- **Animated KPIs** — the Pending, Resolved, Escalated, and L2 queue counts, plus the chart total, animate via a `CountUp` component whenever their underlying value changes.
- **Project card accents** — each project card has a full-card diagonal gradient accent, cycled per card, built from the app's existing HSL design-token system (`--primary`, `--warning`, `--danger`, `--info` soft variants) rather than hardcoded colors, so it adapts correctly in dark mode.
- **Priority queue banner** — the dashboard banner that surfaces the project needing the most attention (ranked by escalations + pending backlog) uses an icon-in-circle-badge with a two-line eyebrow/label layout.
- **Entrance animations** — dashboard elements fade up with a staggered entrance animation that respects `prefers-reduced-motion`.
- All of the above is driven by real Prisma-backed data — there is no fabricated or decorative data anywhere in the dashboard UI (e.g. no fake "live sync" freshness timestamps).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Styling** | Tailwind CSS |
| **Database** | Neon Postgres (serverless) |
| **ORM** | Prisma |
| **Auth** | NextAuth.js (Google OAuth) |
| **Email** | Gmail API (OAuth 2.0) |
| **Deployment** | Vercel |

---

## Database Schema

**Core tables:** `Project`, `EmailStatus`, `SyncState`

**Feature tables:** `Note`, `Tag`, `EmailTag`, `AuditLog`, `SlaConfig`, `ResponseTemplate`, `ClientProfile`, `ProjectTemplate`, `WebhookConfig`

**Key fields on `EmailStatus`:** `threadId`, `hasAttachments`, `routingTier`, `aiCategory`, `followUpAt`, `escalationNote`

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/        ← NextAuth + Gmail OAuth callback
│   │   ├── sync/        ← Gmail fetch + smart routing logic
│   │   ├── emails/      ← CRUD, bulk actions, escalation
│   │   ├── projects/    ← Project + settings management
│   │   └── ...
│   └── dashboard/
│       ├── page.tsx     ← Email list with L2/BA triage UI
│       ├── analytics/   ← Charts dashboard
│       ├── digest/      ← Weekly Digest with SLA breach panel
│       ├── search/      ← Full-text search
│       └── templates/   ← Response template CRUD
├── components/
│   ├── EmailList.tsx    ← Main email list with To/CC pill, SLA badges
│   ├── SlaIndicator.tsx ← L2-aware SLA badge component
│   ├── ToCcPill.tsx     ← Shows To/CC context per email row
│   └── ...
└── prisma/
    └── schema.prisma    ← Full 17-table schema
```

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/utkarshkr13/client-inbox-tracker.git
cd client-inbox-tracker

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 4. Run database migrations
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

> **Note:** A Google Cloud project with Gmail API and Google OAuth credentials is required. See `.env.example` for all required environment variables — no keys are hardcoded in this repo.

---

## Environment Variables

See `.env.example` for the full list. Required keys:

```
DATABASE_URL=          # Neon Postgres connection string
NEXTAUTH_SECRET=       # Random secret for NextAuth sessions
NEXTAUTH_URL=          # Your app URL (http://localhost:3000 for dev)
GOOGLE_CLIENT_ID=      # Google OAuth client ID
GOOGLE_CLIENT_SECRET=  # Google OAuth client secret
```

---

## Routing Logic (How Smart Routing Works)

On every Gmail sync, each email's `To` and `CC` headers are checked against the project's configured BA and L2 email addresses:

```
if (toAddresses.includes(l2Email) && !toAddresses.includes(baEmail)):
  routingTier = "L2"
elif (toAddresses.includes(baEmail)):
  routingTier = "BA"
else:
  routingTier = category-based fallback
```

This is re-evaluated on every sync, so routing stays accurate even as threads evolve.

---

## Project Status

Active and deployed. Built as a BA productivity tool for managing multi-project client communication at scale.
