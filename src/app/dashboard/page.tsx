import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import NewProjectForm from "@/components/NewProjectForm";
import GmailConnectBanner from "@/components/GmailConnectBanner";
import OnboardingWizard from "@/components/OnboardingWizard";
import { Card, StatCard } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { CheckCircle2, Clock, AlertOctagon, Users, ArrowRight, Flame, PartyPopper } from "lucide-react";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5)  return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Working late";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const now = new Date();
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);

  const [
    projects,
    gmailToken,
    // All-time rollup per project+status — "pending" / "All clear" claims must be
    // based on this, not a 7-day window, otherwise a backlog older than a week
    // silently vanishes from every KPI while still showing in the sidebar badge.
    allTimeGrouped,
    allTimePendingL2,
    last3DaysEmails,
    doneLast7Grouped,
    weeklyTotalGrouped,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        clientEmails: true,
        _count: { select: { emailStatuses: true } },
      },
    }),
    prisma.gmailToken.findUnique({ where: { userId } }),
    prisma.emailStatus.groupBy({
      by: ["projectId", "status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.emailStatus.count({ where: { userId, status: "pending", routingTier: "l2" } }),
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: threeDaysAgo } },
      select: { receivedAt: true, status: true },
    }),
    prisma.emailStatus.groupBy({
      by: ["projectId"],
      where: { userId, status: "done", updatedAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.emailStatus.groupBy({
      by: ["projectId"],
      where: { userId, receivedAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  // ─────────────────────────────────────────────────────────────
  // First-run: no projects yet. Hand off to the onboarding wizard
  // instead of showing an empty dashboard shell.
  // ─────────────────────────────────────────────────────────────
  if (projects.length === 0) {
    return (
      <div className="max-w-lg mx-auto pt-8 sm:pt-16">
        <OnboardingWizard gmailEmail={gmailToken?.gmailEmail ?? session.email} />
      </div>
    );
  }

  // Per-project all-time rollup (drives pending badge / "All clear" vs "Idle")
  type StatusMap = Record<string, { pending: number; done: number; dismissed: number; escalated: number; total: number }>;
  const statusMap: StatusMap = {};
  let totalPending = 0, totalDone7d = 0, totalEscalated = 0;
  for (const g of allTimeGrouped) {
    if (!statusMap[g.projectId]) statusMap[g.projectId] = { pending: 0, done: 0, dismissed: 0, escalated: 0, total: 0 };
    const s = g.status as keyof (typeof statusMap)[string];
    if (s in statusMap[g.projectId]) statusMap[g.projectId][s] = g._count._all;
    statusMap[g.projectId].total += g._count._all;
    if (g.status === "pending") totalPending += g._count._all;
    if (g.status === "escalated") totalEscalated += g._count._all;
  }
  const doneLast7ByProject: Record<string, number> = {};
  for (const g of doneLast7Grouped) {
    doneLast7ByProject[g.projectId] = g._count._all;
    totalDone7d += g._count._all;
  }
  const weeklyTotalByProject: Record<string, number> = {};
  for (const g of weeklyTotalGrouped) weeklyTotalByProject[g.projectId] = g._count._all;
  const l2Count = allTimePendingL2;

  // 3-day sparkline (today + 2 days back) — trend only, not a backlog claim
  const sparkDays: { label: string; value: number; sub: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yest." : d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayEmails = last3DaysEmails.filter((e) => e.receivedAt && new Date(e.receivedAt).toISOString().slice(0, 10) === dateStr);
    sparkDays.push({ label, value: dayEmails.length, sub: dayEmails.filter((e) => e.status === "pending").length });
  }

  const today = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  // Which project needs attention most, ranked by true backlog + escalations
  const priorityProject = projects
    .map((p) => ({ project: p, score: (statusMap[p.id]?.escalated ?? 0) * 10 + (statusMap[p.id]?.pending ?? 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-6">
      {!gmailToken && <GmailConnectBanner />}

      {/* Welcome */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{greeting(now)}</h1>
          <p className="text-sm text-fg-muted mt-1">{today}</p>
        </div>
        {gmailToken && (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-success bg-success-soft border border-success/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            Gmail connected
          </span>
        )}
      </div>

      {/* KPI grid: sparkline + 4 stat tiles — pending/escalated are all-time, matching the sidebar badge */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 lg:col-span-2 row-span-2 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-fg-muted">3-day activity</p>
              <p className="text-2xl font-bold text-fg tabular-nums">{last3DaysEmails.length}</p>
              <p className="text-[11px] text-fg-subtle">emails received</p>
            </div>
            <div className="text-[10px] text-fg-subtle flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary/30 rounded-sm" /> Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-warning/70 rounded-sm" /> Pending</span>
            </div>
          </div>
          <Sparkline data={sparkDays} height={56} />
        </Card>

        <StatCard label="Pending"   value={totalPending}   accent={totalPending > 0 ? "warning" : "default"}   hint="all time"     icon={<Clock className="w-3.5 h-3.5" />} />
        <StatCard label="Resolved"  value={totalDone7d}    accent="success"                                     hint="last 7 days" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
        <StatCard label="Escalated" value={totalEscalated} accent={totalEscalated > 0 ? "danger" : "default"}  hint={totalEscalated > 0 ? "needs attention" : "all calm"} icon={<AlertOctagon className="w-3.5 h-3.5" />} />
        <StatCard label="L2 queue"  value={l2Count}        accent="info"                                        hint="pending, all time" icon={<Users className="w-3.5 h-3.5" />} />
      </div>

      {totalPending === 0 && totalEscalated === 0 ? (
        <div className="flex items-center gap-2 bg-success-soft border border-success/20 rounded-lg px-4 py-2.5 text-sm">
          <PartyPopper className="w-4 h-4 text-success shrink-0" />
          <span className="text-fg">All clear — no pending or escalated emails across {projects.length} project{projects.length !== 1 ? "s" : ""}.</span>
        </div>
      ) : priorityProject ? (
        <Link
          href={`/dashboard/projects/${priorityProject.project.id}`}
          className="flex items-center justify-between bg-gradient-to-r from-warning-soft to-danger-soft border border-warning/20 rounded-lg px-4 py-3 text-sm font-medium hover:border-warning/40 transition group"
        >
          <span className="text-fg inline-flex items-center gap-2">
            <Flame className="w-4 h-4 text-warning shrink-0" />
            Start with <span className="font-semibold">{priorityProject.project.name}</span> —{" "}
            {(statusMap[priorityProject.project.id]?.escalated ?? 0) > 0 && (
              <span className="text-danger font-semibold">{statusMap[priorityProject.project.id].escalated} escalated</span>
            )}
            {(statusMap[priorityProject.project.id]?.escalated ?? 0) > 0 && (statusMap[priorityProject.project.id]?.pending ?? 0) > 0 && ", "}
            {(statusMap[priorityProject.project.id]?.pending ?? 0) > 0 && (
              <span className="text-warning font-semibold">{statusMap[priorityProject.project.id].pending} pending</span>
            )}
          </span>
          <span className="text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all shrink-0">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : null}

      {/* Projects */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Projects</h2>
          <p className="text-xs text-fg-muted mt-0.5">{projects.length} active</p>
        </div>
        {projects.length > 0 && (
          <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Analytics <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <NewProjectForm />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            pendingCount={statusMap[project.id]?.pending ?? 0}
            doneCount={doneLast7ByProject[project.id] ?? 0}
            totalCount={weeklyTotalByProject[project.id] ?? 0}
            allTimeTotal={statusMap[project.id]?.total ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
