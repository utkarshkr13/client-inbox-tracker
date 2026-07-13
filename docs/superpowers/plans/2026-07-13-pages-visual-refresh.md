# Extend Dashboard Visual Refresh to Remaining Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the dashboard's existing visual language (StatCard icon tiles, CountUp animated numbers, eyebrow labels, staggered entrance animations, token-based gradient washes) to Project Detail, Digest, Analytics, Templates, and Settings — the five pages that never got the PR #7–#10 treatment.

**Architecture:** Pure presentation-layer substitution. Every page keeps its existing data-fetching/Prisma queries/client-side state exactly as-is; only the JSX rendering the already-computed values changes, replacing bespoke inline `{label,value,cls}.map(...)` KPI tiles with the existing `StatCard` component (`src/components/ui/card.tsx`), and adding the existing `.anim-fade-up`/`.stagger` CSS classes (already defined in `src/app/globals.css`) plus `CountUp` (`src/components/ui/count-up.tsx`) where a page has animatable numeric values.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (HSL design tokens via `@theme inline`), `lucide-react` icons, no test framework in this repo (verification is `eslint` + real Vercel build + live Chrome check — see Global Constraints).

## Global Constraints

- No changes to data-fetching, filtering, bulk-action, or business logic on any page — behavior must be pixel-for-pixel identical in terms of *what* is computed, only *how it's rendered* changes.
- Do NOT touch the Analytics category color swatches (`COLORS` map: `bg-yellow-400`, `bg-red-400`, `bg-blue-400`, `bg-purple-400`, `bg-indigo-400`, `bg-teal-400`, `bg-emerald-500`, `bg-border-strong`) or the `bg-warning`/`bg-red-400` status-breakdown bar colors — intentionally multi-hue, out of scope per the design doc.
- Do NOT touch Settings' `PRESET_COLORS` tag-color picker — user-chosen arbitrary colors, out of scope.
- This repo has no test runner (`package.json` scripts are `dev`/`build`/`start`/`lint` only). Every task's verification step is: (a) `node_modules/.bin/eslint <changed files>` must return no output, (b) a described expected visual result to check once deployed. There is no unit-test step to write — do not invent one.
- Reuse existing primitives — `StatCard`, `Card`, `CountUp`, `.anim-fade-up`, `.stagger`, `ACCENT_WASHES` — never redefine a new version of something that already exists.
- Git workflow matches the rest of this session: branch `design/pages-visual-refresh` (already exists, holds the approved spec commit) → implement on it → push → open PR via the Chrome MCP (GitHub API is proxy-blocked in the sandbox) → merge → deploy via `vercel --prod --yes` through the Mac shell MCP using the background+poll pattern → live-verify via Chrome on `https://client-inbox-tracker.vercel.app`.

---

### Task 1: Export `ACCENT_WASHES` from `ProjectCard.tsx` for reuse

**Files:**
- Modify: `src/components/ProjectCard.tsx:19-24`

**Interfaces:**
- Produces: `export const ACCENT_WASHES: string[]` — an array of 4 literal Tailwind gradient class strings, importable as `import { ACCENT_WASHES } from "@/components/ProjectCard"`.

- [ ] **Step 1: Add the `export` keyword to the existing constant**

Current code at `src/components/ProjectCard.tsx:19-24`:

```ts
const ACCENT_WASHES = [
  "bg-gradient-to-br from-primary-soft/70 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-warning-soft/70 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-danger-soft/55 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-info-soft/70 via-bg-elev to-bg-elev",
];
```

Change to:

```ts
export const ACCENT_WASHES = [
  "bg-gradient-to-br from-primary-soft/70 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-warning-soft/70 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-danger-soft/55 via-bg-elev to-bg-elev",
  "bg-gradient-to-br from-info-soft/70 via-bg-elev to-bg-elev",
];
```

- [ ] **Step 2: Verify no other code breaks**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/components/ProjectCard.tsx`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd /tmp/cit
git add src/components/ProjectCard.tsx
git commit -m "Export ACCENT_WASHES from ProjectCard for reuse on Project Detail chips"
```

---

### Task 2: Project Detail — KPI strip becomes `StatCard` + `CountUp`

**Files:**
- Modify: `src/components/EmailList.tsx:1-10` (imports), `src/components/EmailList.tsx:581-596` (KPI strip)

**Interfaces:**
- Consumes: `StatCard({ label, value, hint?, accent?, icon? })` from `src/components/ui/card.tsx` (already defined, no changes needed to it). `CountUp({ value, duration? })` from `src/components/ui/count-up.tsx`.
- Produces: no new exports — this task only changes what `EmailList.tsx` renders internally.

- [ ] **Step 1: Add imports**

At the top of `src/components/EmailList.tsx`, alongside the existing imports (check current imports first with `head -10 src/components/EmailList.tsx` — add these two lines if not already present):

```ts
import { StatCard } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
```

- [ ] **Step 2: Replace the KPI strip**

Current code at `src/components/EmailList.tsx:581-596`:

```tsx
      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total", value: totalCount, cls: "bg-bg-elev border-border text-fg" },
          { label: "Pending", value: pendingCount, cls: "bg-warning-soft border-warning/20 text-warning" },
          { label: "Done", value: doneCount, cls: "bg-success-soft border-success/20 text-success" },
          { label: "Dismissed", value: dismissedCount, cls: "bg-bg-muted border-border text-fg-subtle" },
          { label: "Escalated", value: escalatedCount, cls: "bg-danger-soft border-danger/20 text-danger" },
          { label: "L2 Queue", value: l2Count, cls: "bg-warning-soft border-warning/20 text-warning" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-70">{label}</p>
          </div>
        ))}
      </div>
```

Replace with:

```tsx
      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 stagger">
        <StatCard label="Total" value={<CountUp value={totalCount} />} accent="default" icon={<Mail className="w-3.5 h-3.5" />} />
        <StatCard label="Pending" value={<CountUp value={pendingCount} />} accent="warning" icon={<Clock className="w-3.5 h-3.5" />} />
        <StatCard label="Done" value={<CountUp value={doneCount} />} accent="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
        <StatCard label="Dismissed" value={<CountUp value={dismissedCount} />} accent="default" icon={<XCircle className="w-3.5 h-3.5" />} />
        <StatCard label="Escalated" value={<CountUp value={escalatedCount} />} accent="danger" icon={<AlertOctagon className="w-3.5 h-3.5" />} />
        <StatCard label="L2 Queue" value={<CountUp value={l2Count} />} accent="warning" icon={<Users className="w-3.5 h-3.5" />} />
      </div>
```

Note: `StatCard`'s tile padding (`p-4`) is slightly larger than the original `p-3` — acceptable, matches the dashboard's own `StatCard` usage exactly rather than introducing a third padding variant.

- [ ] **Step 3: Add the new icon imports to `EmailList.tsx`'s existing `lucide-react` import line**

Find the existing `lucide-react` import line near the top of the file (check with `grep -n "from \"lucide-react\"" src/components/EmailList.tsx`) and ensure it includes: `Mail, Clock, CheckCircle2, XCircle, AlertOctagon, Users` — add whichever of these six are not already imported, keeping any existing icon imports already used elsewhere in the file intact (do not remove icons already imported and used by other parts of `EmailList.tsx`).

- [ ] **Step 4: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/components/EmailList.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd /tmp/cit
git add src/components/EmailList.tsx
git commit -m "Project Detail: KPI strip uses StatCard + CountUp + icons"
```

---

### Task 3: Project Detail — chip gradients, stagger, and page eyebrow

**Files:**
- Modify: `src/components/EmailList.tsx:608-666` (team/client chip rendering)
- Modify: `src/app/dashboard/projects/[id]/page.tsx:36-42` (header)

**Interfaces:**
- Consumes: `ACCENT_WASHES` from `src/components/ProjectCard.tsx` (produced in Task 1).

- [ ] **Step 1: Import `ACCENT_WASHES` in `EmailList.tsx`**

Add near the top of `src/components/EmailList.tsx`:

```ts
import { ACCENT_WASHES } from "@/components/ProjectCard";
```

- [ ] **Step 2: Apply cyclic gradient wash + stagger to team-member chips**

Current code at `src/components/EmailList.tsx:608-628` (the `teamStats.map` block):

```tsx
          {teamStats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teamStats.map((tm) => {
                const active = personFilter?.type === "seenVia" && personFilter.value.toLowerCase() === tm.matchEmail.toLowerCase();
                return (
                  <button
                    key={tm.id}
                    onClick={() => setPersonFilter(active ? null : { type: "seenVia", value: tm.matchEmail, label: tm.name })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition text-left ${active ? "border-primary bg-primary-soft" : "border-border bg-bg-elev hover:border-primary/40"}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.role === "ba" ? "bg-primary-soft" : "bg-warning-soft"}`}>
                      <span className={`font-bold text-[10px] ${tm.role === "ba" ? "text-primary" : "text-warning"}`}>{tm.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">{tm.name} <span className="font-normal text-fg-subtle uppercase">· {tm.role}</span></p>
                      <p className="text-[11px] text-fg-subtle truncate">
                        {tm.connected ? `${tm.pending} pending` : "not connected"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
```

Replace with (adds `stagger` to the container and a cyclic gradient background on the non-active chip state, leaving the `active` filter-selected state's `bg-primary-soft` untouched since that's a functional selection indicator, not decoration):

```tsx
          {teamStats.length > 0 && (
            <div className="flex flex-wrap gap-2 stagger">
              {teamStats.map((tm, i) => {
                const active = personFilter?.type === "seenVia" && personFilter.value.toLowerCase() === tm.matchEmail.toLowerCase();
                return (
                  <button
                    key={tm.id}
                    onClick={() => setPersonFilter(active ? null : { type: "seenVia", value: tm.matchEmail, label: tm.name })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition text-left ${active ? "border-primary bg-primary-soft" : `border-border ${ACCENT_WASHES[i % ACCENT_WASHES.length]} hover:border-primary/40`}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.role === "ba" ? "bg-primary-soft" : "bg-warning-soft"}`}>
                      <span className={`font-bold text-[10px] ${tm.role === "ba" ? "text-primary" : "text-warning"}`}>{tm.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">{tm.name} <span className="font-normal text-fg-subtle uppercase">· {tm.role}</span></p>
                      <p className="text-[11px] text-fg-subtle truncate">
                        {tm.connected ? `${tm.pending} pending` : "not connected"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
```

- [ ] **Step 3: Apply the same treatment to client chips**

Current code at `src/components/EmailList.tsx:630-654` (the `clientStats.map` block):

```tsx
          {clientStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {clientStats.map((cs) => {
                const active = personFilter?.type === "fromEmail" && personFilter.value.toLowerCase() === cs.email.toLowerCase();
                return (
                  <button
                    key={cs.id}
                    onClick={() => setPersonFilter(active ? null : { type: "fromEmail", value: cs.email, label: cs.label || cs.email })}
                    className={`bg-bg-elev border rounded-xl p-4 flex items-center gap-3 text-left transition ${active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`}
                  >
```

Replace the opening `<button>` `className` (keep everything else in this block, including the inner content, exactly as-is) with:

```tsx
          {clientStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 stagger">
              {clientStats.map((cs, i) => {
                const active = personFilter?.type === "fromEmail" && personFilter.value.toLowerCase() === cs.email.toLowerCase();
                return (
                  <button
                    key={cs.id}
                    onClick={() => setPersonFilter(active ? null : { type: "fromEmail", value: cs.email, label: cs.label || cs.email })}
                    className={`border rounded-xl p-4 flex items-center gap-3 text-left transition ${active ? "border-primary bg-primary-soft" : `border-border ${ACCENT_WASHES[i % ACCENT_WASHES.length]} hover:border-primary/40`}`}
                  >
```

- [ ] **Step 4: Add a `PROJECT` eyebrow to the Project Detail page header**

Current code at `src/app/dashboard/projects/[id]/page.tsx:36-42`:

```tsx
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Projects</Link>
          <h1 className="text-2xl font-bold text-fg mt-1">{project.name}</h1>
          <p className="text-sm text-fg-subtle mt-0.5">
            {project.clientEmails.length} client email{project.clientEmails.length !== 1 ? "s" : ""}
            {emailStatuses.length > 0 && <span className="ml-2 text-fg-subtle">· {emailStatuses.length} total synced</span>}
          </p>
        </div>
```

Replace with:

```tsx
        <div className="anim-fade-up">
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Projects</Link>
          <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-1 mb-1">Project</p>
          <h1 className="text-2xl font-bold text-fg">{project.name}</h1>
          <p className="text-sm text-fg-subtle mt-0.5">
            {project.clientEmails.length} client email{project.clientEmails.length !== 1 ? "s" : ""}
            {emailStatuses.length > 0 && <span className="ml-2 text-fg-subtle">· {emailStatuses.length} total synced</span>}
          </p>
        </div>
```

- [ ] **Step 5: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/components/EmailList.tsx "src/app/dashboard/projects/[id]/page.tsx"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /tmp/cit
git add src/components/EmailList.tsx "src/app/dashboard/projects/[id]/page.tsx"
git commit -m "Project Detail: gradient chips, stagger animation, Project eyebrow"
```

---

### Task 4: Digest — `StatCard` + `CountUp` + eyebrow + stagger

**Files:**
- Modify: `src/app/dashboard/digest/page.tsx:1-4` (imports), `:71-93` (header + summary strip), `:169-208` (list sections)

**Interfaces:**
- Consumes: `StatCard`, `CountUp` (same as Task 2).

- [ ] **Step 1: Add imports**

At the top of `src/app/dashboard/digest/page.tsx`, add below the existing `import Link from "next/link";`:

```ts
import { StatCard } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Mail, Clock, AlertOctagon, Flame, CalendarClock } from "lucide-react";
```

- [ ] **Step 2: Replace header + summary strip**

Current code at `src/app/dashboard/digest/page.tsx:71-93`:

```tsx
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-fg mt-1">Weekly Digest</h1>
        <p className="text-sm text-fg-subtle mt-0.5">{today}</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "New this week", value: newEmails, cls: "bg-bg-elev border-border text-fg" },
          { label: "Still pending", value: pendingTotal, cls: "bg-warning-soft border-warning/20 text-warning" },
          { label: "Escalated", value: escalatedTotal, cls: "bg-danger-soft border-danger/20 text-danger" },
          { label: "L2 SLA breach", value: l2SlaBreach.length, cls: l2SlaBreach.length > 0 ? "bg-danger-soft border-danger/25 text-danger" : "bg-bg-elev border-border text-fg-subtle" },
          { label: "Follow-ups due", value: followUpsDueTotal, cls: "bg-warning-soft border-warning/20 text-warning" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-fg-subtle mt-1">{label}</p>
          </div>
        ))}
      </div>
```

Replace with:

```tsx
    <div className="space-y-6">
      <div className="anim-fade-up">
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
        <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-1 mb-1">Digest</p>
        <h1 className="text-2xl font-bold text-fg">Weekly Digest</h1>
        <p className="text-sm text-fg-subtle mt-0.5">{today}</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 stagger">
        <StatCard label="New this week" value={<CountUp value={newEmails} />} accent="default" icon={<Mail className="w-3.5 h-3.5" />} />
        <StatCard label="Still pending" value={<CountUp value={pendingTotal} />} accent="warning" icon={<Clock className="w-3.5 h-3.5" />} />
        <StatCard label="Escalated" value={<CountUp value={escalatedTotal} />} accent="danger" icon={<AlertOctagon className="w-3.5 h-3.5" />} />
        <StatCard label="L2 SLA breach" value={<CountUp value={l2SlaBreach.length} />} accent={l2SlaBreach.length > 0 ? "danger" : "default"} icon={<Flame className="w-3.5 h-3.5" />} />
        <StatCard label="Follow-ups due" value={<CountUp value={followUpsDueTotal} />} accent="warning" icon={<CalendarClock className="w-3.5 h-3.5" />} />
      </div>
```

- [ ] **Step 3: Add stagger to the list sections container**

Current code at `src/app/dashboard/digest/page.tsx:169` onward wraps each conditional section (`L2 SLA breach`, `Escalated`, `Follow-ups Due`, `Pending Queue`, `Projects Overview`) as sibling top-level `<div>`s directly under the outer `space-y-6` container — since `space-y-6` already provides visual separation and each section is independently conditional (may or may not render), do NOT wrap them in a single `.stagger` div (that would break `nth-child` delay timing when a middle section is absent). Instead add `anim-fade-up` individually to each of the five section wrapper divs. Example for the L2 SLA breach section — current:

```tsx
      {l2SlaBreach.length > 0 && (
        <div className="bg-danger-soft border-2 border-danger/40 rounded-xl p-5">
```

Becomes:

```tsx
      {l2SlaBreach.length > 0 && (
        <div className="bg-danger-soft border-2 border-danger/40 rounded-xl p-5 anim-fade-up">
```

Apply the identical `anim-fade-up` addition to the four other section wrapper `<div>`s in this file (Escalated at the line starting `<div className="bg-danger-soft border border-danger/25 rounded-xl p-5">`, Follow-ups Due at `<div className="bg-warning-soft border border-warning/25 rounded-xl p-5">`, Pending Queue at `<div className="bg-bg-elev border border-border rounded-xl p-5">`, and Projects Overview at the final `<div className="bg-bg-elev border border-border rounded-xl p-5">`) — each just gets `anim-fade-up` appended to its existing `className` string, no other change.

- [ ] **Step 4: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/app/dashboard/digest/page.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd /tmp/cit
git add src/app/dashboard/digest/page.tsx
git commit -m "Digest: StatCard + CountUp summary strip, Digest eyebrow, entrance animations"
```

---

### Task 5: Analytics — `StatCard` + `CountUp` + eyebrow + stagger (category colors untouched)

**Files:**
- Modify: `src/app/dashboard/analytics/page.tsx:1-4` (imports), `:60-83` (header + KPI row), `:85-117` (breakdown cards wrapper)

**Interfaces:**
- Consumes: `StatCard`, `CountUp`.

- [ ] **Step 1: Add imports**

At the top of `src/app/dashboard/analytics/page.tsx`, add:

```ts
import { StatCard } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Mail, Clock, AlertOctagon, Timer } from "lucide-react";
```

- [ ] **Step 2: Replace header + KPI row**

Current code at `src/app/dashboard/analytics/page.tsx:60-83`:

```tsx
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-fg mt-1">Analytics</h1>
          <p className="text-sm text-fg-subtle mt-0.5">Last 30 days · {total} emails</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, cls: "text-fg bg-bg-elev" },
          { label: "Pending", value: byStatus.pending ?? 0, cls: "text-warning bg-warning-soft" },
          { label: "Escalated", value: byStatus.escalated ?? 0, cls: "text-danger bg-danger-soft" },
          { label: "Avg resolution", value: `${Math.round(avgResolutionHours)}h`, cls: "text-primary bg-primary-soft" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border border-border rounded-xl p-4 text-center ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-fg-subtle mt-1">{label}</p>
          </div>
        ))}
      </div>
```

Replace with:

```tsx
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
          <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-1 mb-1">Analytics</p>
          <h1 className="text-2xl font-bold text-fg">Analytics</h1>
          <p className="text-sm text-fg-subtle mt-0.5">Last 30 days · {total} emails</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        <StatCard label="Total" value={<CountUp value={total} />} accent="default" icon={<Mail className="w-3.5 h-3.5" />} />
        <StatCard label="Pending" value={<CountUp value={byStatus.pending ?? 0} />} accent="warning" icon={<Clock className="w-3.5 h-3.5" />} />
        <StatCard label="Escalated" value={<CountUp value={byStatus.escalated ?? 0} />} accent="danger" icon={<AlertOctagon className="w-3.5 h-3.5" />} />
        <StatCard label="Avg resolution" value={<><CountUp value={Math.round(avgResolutionHours)} />h</>} accent="primary" icon={<Timer className="w-3.5 h-3.5" />} />
      </div>
```

Note: the `Avg resolution` tile passes the rounded hour count through `CountUp` and renders the `h` suffix as a JSX sibling, since `CountUp`'s `value` prop is typed as `number` and cannot accept a pre-formatted string — matches the design spec's stated approach.

- [ ] **Step 3: Add entrance animation to the breakdown cards row**

Current code at `src/app/dashboard/analytics/page.tsx:85`:

```tsx
      <div className="grid sm:grid-cols-2 gap-4">
```

Change to:

```tsx
      <div className="grid sm:grid-cols-2 gap-4 stagger">
```

(The two children of this grid — Status Breakdown and Category Breakdown cards — are unconditionally rendered, so `.stagger`'s `nth-child` delays apply safely here, unlike the Digest page's conditional sections.)

Leave everything inside those two cards (the `COLORS` map, the `bg-warning`/`bg-emerald-500`/etc. status bar colors) completely untouched.

- [ ] **Step 4: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/app/dashboard/analytics/page.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd /tmp/cit
git add src/app/dashboard/analytics/page.tsx
git commit -m "Analytics: StatCard + CountUp KPI row, Analytics eyebrow, stagger on breakdown cards"
```

---

### Task 6: Templates — stagger, empty-state copy, eyebrow

**Files:**
- Modify: `src/app/dashboard/templates/page.tsx:55-63` (header), `:92-96` (empty state), `:99-100` (category groups container)

**Interfaces:**
- None — this page has no KPI strip, so no `StatCard`/`CountUp` involved.

- [ ] **Step 1: Add a `TEMPLATES` eyebrow to the header**

Current code at `src/app/dashboard/templates/page.tsx:55-63`:

```tsx
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-fg mt-1">Response Templates</h1>
          <p className="text-sm text-fg-subtle mt-0.5">Pre-built replies for common queries. Click any template to copy to clipboard.</p>
        </div>
```

Replace with:

```tsx
    <div className="space-y-6">
      <div className="flex items-start justify-between anim-fade-up">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
          <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-1 mb-1">Templates</p>
          <h1 className="text-2xl font-bold text-fg">Response Templates</h1>
          <p className="text-sm text-fg-subtle mt-0.5">Pre-built replies for common queries. Click any template to copy to clipboard.</p>
        </div>
```

- [ ] **Step 2: Rewrite the empty state to match the established voice**

Current code at `src/app/dashboard/templates/page.tsx:92-96`:

```tsx
      {!loading && templates.length === 0 && !showForm && (
        <div className="text-center py-16 text-fg-subtle">
          <p className="text-sm">No templates yet.</p>
          <p className="text-xs mt-1">Create your first template to speed up L2 responses.</p>
        </div>
      )}
```

Replace with (keeps the same conditions and structure, changes only the copy to lead with an action rather than an apology, and adds a real button that opens the existing form rather than leaving the user to find the "+ New Template" button above):

```tsx
      {!loading && templates.length === 0 && !showForm && (
        <div className="text-center py-16">
          <p className="text-sm text-fg-muted">No templates yet — create one to speed up common replies.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-primary hover:underline font-medium">
            + New Template
          </button>
        </div>
      )}
```

- [ ] **Step 3: Add stagger to the category groups**

Current code at `src/app/dashboard/templates/page.tsx:99-100`:

```tsx
      {/* Templates grouped by category */}
      {CATEGORIES.map((cat) => {
```

This top-level `.map()` returns sibling `<div key={cat}>` elements directly (no shared wrapper) since categories with zero templates return `null` and are skipped, so wrapping them in a single `.stagger` parent is safe here (unlike Digest's conditional sections, here the `null` returns happen *inside* the map, not as separate top-level conditionals, so `nth-child` on the parent still works correctly as long as the parent only contains these mapped children). Find the parent `<div className="space-y-6">` that wraps the whole page (already present, opened in Step 1) — no change needed there. Instead, wrap just the categories block in its own stagger container. Change:

```tsx
      {/* Templates grouped by category */}
      {CATEGORIES.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;
        return (
          <div key={cat}>
```

To:

```tsx
      {/* Templates grouped by category */}
      <div className="space-y-6 stagger">
      {CATEGORIES.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;
        return (
          <div key={cat}>
```

And find the closing of this `.map()` block (currently ending with `})}` right before the final closing `</div>\n  );\n}` of the component) and add one more closing `</div>` after the `})}` to close the new wrapper:

```tsx
        );
      })}
    </div>
  );
}
```

Becomes:

```tsx
        );
      })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/app/dashboard/templates/page.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd /tmp/cit
git add src/app/dashboard/templates/page.tsx
git commit -m "Templates: Templates eyebrow, actionable empty state, staggered category groups"
```

---

### Task 7: Settings — eyebrow + tab-content entrance animation

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx:143-148` (header), and each of the five tab-content conditional blocks' opening wrapper element.

**Interfaces:**
- None new.

- [ ] **Step 1: Add a `SETTINGS` eyebrow to the header**

Current code at `src/app/dashboard/settings/page.tsx:143-148`:

```tsx
      <div>
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-fg mt-2">Settings</h1>
        <p className="text-sm text-fg-muted mt-0.5">Account, tags, webhooks, and project templates</p>
      </div>
```

Replace with:

```tsx
      <div className="anim-fade-up">
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-2 mb-1">Settings</p>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-muted mt-0.5">Account, tags, webhooks, and project templates</p>
      </div>
```

- [ ] **Step 2: Add `anim-fade-up` to each tab's content wrapper so switching tabs re-triggers the entrance animation**

There are five `{activeTab === "..." && (...)}` blocks (`account`, `tags`, `webhooks`, `templates`, `developer`). For each one, add `key={activeTab}` and `className="anim-fade-up"` to that block's outermost element. For the `account` tab, current opening:

```tsx
      {activeTab === "account" && (
        <Card className="p-5">
```

Becomes:

```tsx
      {activeTab === "account" && (
        <Card key="account" className="p-5 anim-fade-up">
```

For the `tags` tab, current opening:

```tsx
      {activeTab === "tags" && (
        <div className="space-y-4">
```

Becomes:

```tsx
      {activeTab === "tags" && (
        <div key="tags" className="space-y-4 anim-fade-up">
```

Apply the same pattern to the remaining three tabs (`webhooks`, `templates`, `developer`): find each one's `{activeTab === "..." && (` line, add `key="<tabname>"` and append ` anim-fade-up` to the outermost element's existing `className`.

The `key` prop forces React to remount (not just re-render) the tab content when switching tabs, which is what makes the CSS animation replay each time — without it, the animation would only ever play once on first mount since the element reference is stable across tab switches.

- [ ] **Step 3: Verify**

Run: `cd /tmp/cit && node_modules/.bin/eslint src/app/dashboard/settings/page.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /tmp/cit
git add src/app/dashboard/settings/page.tsx
git commit -m "Settings: Settings eyebrow, re-triggering fade-up animation on tab switch"
```

---

### Task 8: Deploy and live-verify all five pages

**Files:** None (deploy + verification only).

- [ ] **Step 1: Push the branch**

```bash
cd /tmp/cit
git push origin design/pages-visual-refresh
```

- [ ] **Step 2: Open and merge the PR via the Chrome MCP**

Navigate to `https://github.com/utkarshkr13/client-inbox-tracker/pull/new/design/pages-visual-refresh`, confirm the prefilled title/description (from commit messages), click "Create pull request", then click "Merge pull request" → "Confirm merge" — matching the exact workflow used for PRs #7–#10 earlier this session.

- [ ] **Step 3: Deploy via the Mac shell MCP background+poll pattern**

```bash
cd /Users/salescode/client-inbox-tracker && git checkout main && git pull origin main && nohup vercel --prod --yes > /tmp/vercel_deploy.log 2>&1 & disown
```

Then poll with repeated `sleep 20; cat /tmp/vercel_deploy.log` calls until the log shows `Deployment completed` — matching the pattern used for every prior deploy this session (foreground execution times out in that MCP transport).

- [ ] **Step 4: Live-verify each of the five pages**

Using the Chrome MCP against `https://client-inbox-tracker.vercel.app`, for each page:

- **Project Detail** (`/dashboard/projects/<id>`): confirm the 6-tile KPI strip shows icons and animates in with a stagger, confirm team/client chips show cyclic gradient backgrounds, confirm the "Project" eyebrow appears, confirm clicking a chip still filters the list (functional check, not just visual).
- **Digest** (`/dashboard/digest`): confirm the 5-tile summary strip uses `StatCard` with icons, confirm the "Digest" eyebrow, confirm each conditional section (L2 SLA breach / Escalated / Follow-ups / Pending / Projects Overview) still renders correctly when present.
- **Analytics** (`/dashboard/analytics`): confirm the 4-tile KPI row uses `StatCard` with icons including the `h`-suffixed Avg Resolution tile, confirm the "Analytics" eyebrow, confirm the category breakdown bars are still their original multi-hue colors (unchanged).
- **Templates** (`/dashboard/templates`): confirm the "Templates" eyebrow, confirm category groups animate in staggered, and if there happens to be a way to see the empty state (or by temporarily reasoning about the zero-template case in code), confirm the new copy and button.
- **Settings** (`/dashboard/settings`): confirm the "Settings" eyebrow, click between all five tabs and confirm each one's content fades in on every switch (not just the first time).
- Repeat a quick pass in dark mode (toggle via the existing theme toggle) to confirm gradients and eyebrows remain legible.
- Confirm `prefers-reduced-motion` still disables all of the above (can be checked via Chrome DevTools' rendering emulation, or accepted on the strength of the existing global CSS guard in `globals.css` since no new animation CSS was introduced in this plan).

- [ ] **Step 5: Report completion**

Summarize to the user which of the five pages were verified live, any visual issues found and fixed during verification (following this session's established pattern of self-catching and fixing issues before declaring done), and the final PR/deploy URLs.
