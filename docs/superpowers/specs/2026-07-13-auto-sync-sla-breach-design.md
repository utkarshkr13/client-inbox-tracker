# Auto-Sync + SLA-Breach Detection — Design

Date: 2026-07-13
Status: Approved for implementation

## Problem

The tracker is only as fresh as the last time someone clicked the manual "Sync"
button on a project page. There is no background process keeping data current,
and no mechanism that proactively surfaces an SLA breach — the notifications
route computes "recently breached" emails only when the bell is polled, so a
breach can sit silently until someone happens to look. Separately, the
Settings page already offers an `sla_breach` webhook event checkbox, but no
code path ever dispatches that event — it's dead UI.

The Vercel project is on the Hobby plan, which caps server-side Cron Jobs to
once per day. That rules out a `vercel.json` cron running every 5–15 minutes.
This design instead uses client-side timers, since the app is an internal
tool typically open in a browser tab during working hours.

## Goals

- Emails across all of a user's projects sync automatically every 10 minutes
  while a dashboard page is open, and a project detail page additionally
  auto-syncs just that project every 10 minutes while it's the open page.
- Newly-breached SLAs (pending, L2-routed emails that just crossed
  `thresholdHours`) are detected right after every sync pass and fire the
  existing webhook with a new `sla_breach` event — finally wiring up the
  Settings checkbox that already exists.
- The user can see that auto-sync is active and when it last ran, and can
  pause it.

## Non-goals

- True server-side background sync with no browser open (blocked by Hobby
  plan's cron limits; would require Gmail `users.watch` + Pub/Sub, which is
  a larger, separate project).
- Changing sync frequency below 10 minutes, or making it configurable per
  project — fixed 10-minute interval for both loops.
- New notification channels beyond the existing webhook (no email digest,
  no Slack integration in this pass).

## Architecture

### 1. Extract shared sync logic

`src/app/api/projects/[id]/emails/route.ts`'s `GET` handler currently
inlines: loading the project + connected mailboxes, fetching from Gmail per
client email per mailbox, dedup by RFC Message-ID, `smartRoute`/`autoRoute`
routing, and upserting `EmailStatus` rows. This logic moves into a new
function:

```ts
// src/lib/syncProject.ts
export async function syncProject(projectId: string, userId: string): Promise<{
  ok: boolean;
  synced: number;
  error?: string;
}>
```

The existing route's `GET` handler becomes a thin wrapper: check session,
call `syncProject`, return its result. This guarantees the manual Sync
button, the onboarding wizard's sync-and-finish flow, and the new auto-sync
paths all run through one code path — no duplicated routing/dedup logic to
drift out of sync.

### 2. New `sync-all` endpoint

`GET /api/projects/sync-all` — session-authenticated (same pattern as every
other route in this app; no cron secret needed since this is always
triggered by a logged-in browser tab, never by an external scheduler).
Loads all of the session user's projects, calls `syncProject` on each
**sequentially** (not `Promise.all`) to stay gentle on Gmail API quota given
multiple projects each fetching per client email. Uses `Promise.allSettled`
semantics at the project level: one project's Gmail token failing does not
abort the rest. Returns:

```ts
{ synced: number; failed: number; total: number; failedProjects: string[] }
```

### 3. SLA-breach detection, extracted and wired to the webhook

The breach-detection expression already in `src/app/api/notifications/route.ts`
(compare `receivedAt + thresholdHours` against a time window) moves into:

```ts
// src/lib/slaBreach.ts
export async function findNewSlaBreaches(userId: string, since: Date): Promise<
  { id: string; projectId: string; projectName: string; subject: string; fromEmail: string | null }[]
>
```

The notifications route calls this helper instead of inlining the logic
(behavior-preserving refactor — same query, same filter).

Both `syncProject`'s wrapper route and the new `sync-all` route, after a
successful sync, call `findNewSlaBreaches(userId, sinceLastSync)` and for
each result found, dispatch the existing webhook mechanism with
`event: "sla_breach"` (reusing the same `webhookConfig.enabled` /
`events.includes(...)` gating already in the codebase — `sla_breach` is
already a valid option in that comma-separated list per the Settings UI).
"Since last sync" is tracked client-side (see below) and passed as a query
param; if absent (first sync of the session), defaults to 15 minutes ago to
avoid re-firing on every historical breach.

### 4. Client-side auto-sync timers

Two small hooks, both used in Client Components:

```ts
// src/lib/useAutoSync.ts
useAutoSync(kind: "all" | { projectId: string }, options: { enabled: boolean })
```

- Runs a `setInterval` at 10 minutes (600_000 ms).
- Gated on `document.visibilityState === "visible"`: the interval callback
  no-ops (and does not reset the last-synced timestamp) when the tab is
  hidden, and a `visibilitychange` listener triggers an immediate catch-up
  sync the moment the tab becomes visible again if more than 10 minutes have
  elapsed since the last sync.
- On success, updates a shared `lastSyncedAt` timestamp (real, from
  `Date.now()` at response time — not simulated) and passes it as the
  `since` param on the next call.
- `enabled` reflects the visible on/off toggle described below; when
  `false`, the interval is cleared entirely (not just skipped).

Mounted in `src/app/dashboard/layout.tsx` with `kind: "all"`, and
additionally in `src/app/dashboard/projects/[id]/page.tsx`'s client wrapper
with `kind: { projectId: id }` — satisfying "both" from the design
discussion.

### 5. Visible sync indicator

A small new component, `AutoSyncIndicator`, rendered next to the existing
"Gmail connected" pill on the dashboard welcome header:

- Text: `Auto-sync on · synced 3m ago` (relative time computed from the real
  `lastSyncedAt`, recomputed on a 1-minute display tick — not a fabricated
  countdown).
- If the last sync had failures: `Synced 4/5 · 1 failed` in the warning
  token color, without blocking the toggle or alarming the user further —
  it just tries again next cycle.
- A toggle (reusing the existing `Button`/switch styling patterns already in
  the codebase) that flips `autoSyncEnabled`, persisted to `localStorage`
  under a single key (`autoSyncEnabled`) so a pause survives a page reload.
  Toggling on immediately fires one sync rather than waiting up to 10
  minutes for the first pass.

State (`lastSyncedAt`, `autoSyncEnabled`, per-kind sync status) lives in a
small React context (`AutoSyncProvider`) wrapping the dashboard layout, so
both the dashboard-wide indicator and the per-project page can read/update
the same `lastSyncedAt` for the "all" kind, while the per-project timer
tracks its own separate last-synced value for that one project (surfaced as
a smaller inline note on the project page, reusing the same relative-time
formatting).

## Data flow summary

```
[Dashboard layout mounts]
  → AutoSyncProvider reads autoSyncEnabled from localStorage
  → useAutoSync("all") starts 10-min interval (if enabled)
       → GET /api/projects/sync-all?since=<lastSyncedAt>
            → syncProject() per project (sequential)
            → findNewSlaBreaches(userId, since) → dispatch webhook per new breach
            → response: { synced, failed, total, failedProjects }
       → indicator updates: lastSyncedAt = now, status text updates

[Project detail page mounts]
  → useAutoSync({ projectId }) starts its own 10-min interval
       → GET /api/projects/[id]/emails?since=<projectLastSyncedAt>
            → syncProject() for this project only
            → findNewSlaBreaches(userId, since) scoped check → webhook if breach
       → per-project last-synced note updates
```

## Error handling

- `syncProject` failures (expired Gmail token, Gmail API error, no client
  emails configured) return `{ ok: false, error }` rather than throwing;
  `sync-all` collects these into `failedProjects` and continues to the next
  project.
- Webhook dispatch failures are swallowed with `.catch(() => {})`, matching
  the existing pattern in the codebase — a broken user-supplied webhook URL
  must never break sync.
- If `findNewSlaBreaches` throws (e.g. malformed `since` param), sync still
  reports success for the emails themselves; breach detection failure is
  logged server-side but does not fail the whole request.
- Client-side: if `sync-all` or the per-project sync fetch fails outright
  (network error, 500), the indicator shows a neutral "sync failed, retrying
  in 10m" state rather than a red error banner — this is a low-stakes
  background process, not a user-initiated action that needs a hard failure
  state.

## Testing / verification plan

1. Confirm the `syncProject` extraction is behavior-preserving: run the
   existing manual Sync button on a real project, verify email counts and
   routing match pre-refactor behavior.
2. Load the dashboard, open dev tools Network tab, wait 10+ minutes (or
   temporarily lower the interval for testing), confirm `sync-all` fires on
   schedule.
3. Switch to another browser tab for 10+ minutes, confirm no sync call
   fires while hidden, then switch back and confirm an immediate catch-up
   sync fires.
4. Open a project detail page, confirm its own per-project auto-sync fires
   independently of the dashboard-wide one.
5. Set a temporary webhook URL (webhook.site) in Settings with `sla_breach`
   checked, temporarily lower a project's `SlaConfig.thresholdHours` so an
   existing pending L2 email is already breached, trigger a sync, confirm a
   POST with `event: "sla_breach"` arrives exactly once (not re-fired on the
   next cycle for the same email).
6. Toggle auto-sync off, confirm no further calls happen; toggle back on,
   confirm an immediate sync fires and the interval resumes.
7. `node_modules/.bin/eslint` on all new/changed files; real Vercel build
   log checked for a clean TypeScript pass (Prisma engine binaries aren't
   fetchable in the sandbox, so local `tsc --noEmit` is noisy/unreliable —
   established pattern from prior sessions on this repo).
8. Live verification on `client-inbox-tracker.vercel.app` after deploy,
   including watching the indicator update in real time and confirming the
   webhook fire against a real webhook.site URL.
