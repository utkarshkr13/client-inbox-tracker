"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight, Mail } from "lucide-react";
import { Badge } from "./ui/badge";

type Project = {
  id: string;
  name: string;
  clientEmails: { id: string; email: string; label: string | null }[];
  _count: { emailStatuses: number };
};

// Soft top-down accent washes, cycled by card position so a grid of
// projects reads as a set rather than a wall of identical white tiles.
// Each entry must be a literal Tailwind class string (not built from
// template interpolation) so the JIT scanner picks it up.
const ACCENT_WASHES = [
  "from-primary-soft/60",
  "from-warning-soft/60",
  "from-danger-soft/45",
  "from-info-soft/60",
];

export default function ProjectCard({
  project,
  pendingCount,
  doneCount = 0,
  totalCount = 0,
  allTimeTotal = 0,
  accentIndex = 0,
}: {
  project: Project;
  /** All-time pending count — drives the "N pending" / "All clear" badge. */
  pendingCount: number;
  /** Emails marked done in the last 7 days — numerator for the weekly bar. */
  doneCount?: number;
  /** Emails received in the last 7 days — denominator for the weekly bar. */
  totalCount?: number;
  /** All-time synced email count — decides "All clear" vs "Idle" (no history yet). */
  allTimeTotal?: number;
  /** Cycles the top accent wash so cards in a grid aren't visually identical. */
  accentIndex?: number;
}) {
  const router = useRouter();
  const wash = ACCENT_WASHES[accentIndex % ACCENT_WASHES.length];

  async function deleteProject(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This removes all synced email metadata.`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.refresh();
  }

  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Progress: % of this week's emails that are resolved. Falls back to 0.
  const resolvedPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group relative bg-bg-elev border border-border rounded-xl p-5 overflow-hidden hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${wash} to-transparent`} />

      <button
        onClick={deleteProject}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-fg-subtle hover:text-danger hover:bg-danger-soft transition opacity-0 group-hover:opacity-100"
        title="Delete project"
        aria-label="Delete project"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <span className="text-primary font-bold text-xs tracking-wide">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg text-sm truncate pr-6 group-hover:text-primary transition-colors">
            {project.name}
          </h2>
          <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {project.clientEmails.length} client{project.clientEmails.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 ? (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1.5">
            <span>Resolved this week</span>
            <span className="tabular-nums font-medium text-fg">{doneCount}/{totalCount}</span>
          </div>
          <div className="h-1.5 bg-bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-500"
              style={{ width: `${resolvedPct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-fg-subtle italic mb-3">
          {allTimeTotal === 0
            ? "No emails synced yet"
            : pendingCount > 0
            ? `No new emails this week — ${pendingCount} pending from before`
            : "No new activity this week"}
        </p>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        {pendingCount > 0 ? (
          <Badge tone="warning" dot>{pendingCount} pending</Badge>
        ) : allTimeTotal > 0 ? (
          <Badge tone="success" dot>All clear</Badge>
        ) : (
          <Badge tone="neutral">Idle</Badge>
        )}

        <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
