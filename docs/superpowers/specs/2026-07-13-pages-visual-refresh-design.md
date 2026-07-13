# Extend Dashboard Visual Refresh to Remaining Pages — Design

Date: 2026-07-13
Status: Approved for implementation

## Problem

The dashboard (`/dashboard`) received a visual refresh across PRs #7–#10:
`StatCard`-style KPI tiles with icon badges, `CountUp` animated numbers,
staggered fade-up entrance animations, and full-card gradient washes on
`ProjectCard`. Five other pages in the app were never touched and still use
an older, flatter style:

- **Project Detail** (`src/app/dashboard/projects/[id]/page.tsx` +
  `src/components/EmailList.tsx`) — a 6-tile KPI strip, team-member chips,
  and client chips, all built from bespoke inline divs.
- **Digest** (`src/app/dashboard/digest/page.tsx`) — a 5-tile summary strip.
- **Analytics** (`src/app/dashboard/analytics/page.tsx`) — a 4-tile KPI row
  plus status/category breakdown cards.
- **Templates** (`src/app/dashboard/templates/page.tsx`) — a template card
  list with no KPI strip.
- **Settings** (`src/app/dashboard/settings/page.tsx`) — a tabbed page
  already using the shared `Card`/`Button` components, closest to current
  style already.

The core issue isn't a missing capability — `src/components/ui/card.tsx`
already exports a `StatCard` component with the icon-badge, accent-bar, and
`tabular-nums` styling used on the dashboard's KPI tiles. Project Detail,
Digest, and Analytics each reimplement their own version of the same tile
inline instead of using it, so the app currently has four near-duplicate
implementations of the same UI concept. This design consolidates on the
existing `StatCard` and applies the dashboard's animation/eyebrow/gradient
language to the remaining four pages that lack it (Settings needs only
light touch-up).

## Goals

- Every KPI-tile-style strip in the app (Project Detail, Digest, Analytics)
  uses the shared `StatCard` component instead of a bespoke inline
  implementation, with an icon per tile and animated `CountUp` values.
- Every page header in scope gets the same "eyebrow" label treatment as the
  dashboard (`OVERVIEW` style — e.g. `PROJECT`, `DIGEST`, `ANALYTICS`).
- Entrance animations (`.anim-fade-up` / `.stagger`, both already defined in
  `globals.css` and already respecting `prefers-reduced-motion`) applied to
  each page's KPI grid and primary content list.
- Project Detail's team-member and client chip cards get the same
  token-based gradient wash treatment as the dashboard's `ProjectCard`
  (cycled by index).
- Templates' empty state (if the list is empty) matches the voice/pattern
  established for other empty states this session (an invitation to act,
  not just a plain apology).

## Non-goals

- No changes to any page's data-fetching, filtering, bulk-action, or
  business logic — this is a presentation-layer-only pass. Every prop,
  query, and interaction stays behaviorally identical.
- Not touching the Analytics category color swatches
  (`bg-yellow-400`, `bg-red-400`, `bg-blue-400`, `bg-purple-400`,
  `bg-indigo-400`, `bg-teal-400`, `bg-emerald-500`) — these are
  intentionally multi-hue to visually distinguish many categories, the same
  judgment call made in the earlier un-tokenizing pass this session (multi-
  hue category/legend swatches were explicitly left alone there).
- Not touching Settings' `PRESET_COLORS` tag-color picker — those are
  user-chosen arbitrary colors for tags, not a design-token gap.
- No new components beyond what's needed to apply existing patterns (no new
  animation primitives, no new color tokens — everything already exists in
  `globals.css` and `card.tsx`).

## Per-page changes

### Project Detail

`src/components/EmailList.tsx`'s KPI strip (Total/Pending/Done/Dismissed/
Escalated/L2 Queue) is replaced with six `StatCard`s, each given an
appropriate `accent` (`default`/`warning`/`success`/`default`/`danger`/
`warning`) and icon (reusing `lucide-react` icons already imported
elsewhere in the app: `Mail`, `Clock`, `CheckCircle2`, `XCircle`,
`AlertOctagon`, `Users`), with each `value` wrapped in `<CountUp>`.

`src/app/dashboard/projects/[id]/page.tsx`'s header gets a `PROJECT`
eyebrow above the project name, wrapped in `.anim-fade-up`, matching the
dashboard's `Overview` eyebrow exactly in styling.

The KPI grid, team-member chip row, and client chip grid each get
`.stagger` applied to their container.

Team-member chips and client chips (currently a single `bg-primary-soft`
icon badge regardless of position) get a per-index cyclic gradient wash on
the chip's background, reusing the same `ACCENT_WASHES` array already
defined in `ProjectCard.tsx` (imported, not redefined, to avoid drift).

### Digest

`src/app/dashboard/digest/page.tsx`'s 5-tile summary strip (New this week/
Still pending/Escalated/L2 SLA breach/Follow-ups due) becomes five
`StatCard`s with icons (`Mail`, `Clock`, `AlertOctagon`, `Flame`,
`CalendarClock` respectively) and `CountUp` values. Page header gets a
`DIGEST` eyebrow. Summary strip and the list sections below (pending list,
escalated list, follow-ups list) get `.stagger`.

### Analytics

`src/app/dashboard/analytics/page.tsx`'s 4-tile KPI row (Total/Pending/
Escalated/Avg resolution) becomes four `StatCard`s with icons (`Mail`,
`Clock`, `AlertOctagon`, `Timer`) and `CountUp` for the three numeric tiles
(`Avg resolution` keeps its `${Math.round(avgResolutionHours)}h` string
formatting — `CountUp` only accepts a `number`, so this tile passes the
rounded hour count through `CountUp` with an `h` suffix rendered outside
the component). Page header gets an `ANALYTICS` eyebrow. KPI row and the
two breakdown cards (Status Breakdown, Category Breakdown) get
`.anim-fade-up`/`.stagger`. Category color swatches remain untouched per
the Non-goals section.

### Templates

No KPI strip exists here, so the change is narrower: the template card grid
gets `.stagger`. The empty state (shown when `templates.length === 0` and
not loading) is rewritten from a plain "No templates yet" style message to
match the established empty-state voice — a short explanation plus a clear
action (e.g. "No templates yet — create one to speed up common replies."
with the existing "+ New Template" button as the action, not a new
element). Page header gets a `TEMPLATES` eyebrow.

### Settings

Lightest-touch page since it already uses `Card`/`Button`. Gets a
`SETTINGS` eyebrow above the page header, and `.anim-fade-up` on the tab
content container so switching tabs doesn't feel like a hard cut. No
structural changes to the tab content itself (account/tags/webhooks/
templates/developer panels stay as they are).

## Data flow

None of this changes data flow — every page keeps its existing server
Component data-fetching (or client-side `fetch` calls, for Templates/
Settings) exactly as-is. This is a pure JSX/styling substitution: existing
computed values (`totalCount`, `pendingCount`, `byStatus.pending`, etc.)
are passed into `StatCard`/`CountUp` instead of into inline divs.

## Error handling

Not applicable — no new failure modes are introduced. `CountUp` already
handles the case where its `value` prop is `0` or unchanged (renders
immediately, no animation glitch, per the existing `fromRef`/`currentRef`
implementation). `StatCard`'s `icon` prop is optional, so any tile that
doesn't have an obviously appropriate icon can omit it without layout
breakage.

## Testing / verification plan

1. `node_modules/.bin/eslint` on every changed file.
2. Live visual check per page after deploy, light and dark mode: Project
   Detail (KPI strip + chips), Digest, Analytics, Templates (including
   triggering the empty state if a page one is available, or verifying the
   copy change directly in code), Settings (each tab).
3. Confirm `CountUp` re-animates correctly where values can change after
   mount — e.g. Project Detail's KPI strip after a bulk status change,
   Analytics if `days` window were ever made interactive (it isn't in this
   pass, but the pattern must not regress the CountUp bug fixed in PR #9).
4. Confirm `prefers-reduced-motion` still disables all entrance animations
   (existing CSS-level guard in `globals.css`, not page-specific — verified
   once is sufficient since no new animation CSS is introduced).
5. Confirm no behavioral regression: KPI counts, filters, bulk actions,
   chip click-to-filter, template CRUD, and every Settings tab's save
   actions all still work identically before/after.
