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

  const [projects, gmailToken, recentEmails, last3DaysEmails] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        clientEmails: true,
        _count: { select: { emailStatuses: true } },
      },
    }),
    prisma.gmailToken.findUnique({ where: { userId } }),
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: sevenDaysAgo } },
      select: { status: true, projectId: true, routingTier: true, receivedAt: true },
    }),
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: threeDaysAgo } },
      select: { receivedAt: true, status: true },
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

  // Per-project rollup
  type StatusMap = Record<string, { pending: number; done: number; dismissed: number; escalated: number; total: number }>;
  const statusMap: StatusMap = {};
  let totalPending = 0, totalDone = 0, totalEscalated = 0;
  for (const e of recentEmails) {
    if (!statusMap[e.projectId]) statusMap[e.projectId] = { pending: 0, done: 0, dismissed: 0, escalated: 0, total: 0 };
    const s = e.status as keyof typeof statusMap[string];
    if (s in statusMap[e.projectId]) statusMap[e.projectId][s]++;
    statusMap[e.projectId].total++;
    if (e.status === "pending") totalPending++;
    if (e.status === "done") totalDone++;
    if (e.status === "escalated") totalEscalated++;
  }
  const totalEmails = recentEmails.length;
  const l2Count = recentEmails.filter((e) => e.routingTier === "l2").length;

  // 3-day sparkline (today + 2 days back)
  const sparkDays: { label: string; value: number; sub: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yest." : d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayEmails = last3DaysEmails.filter((e) => e.receivedAt && new Date(e.receivedAt).toISOString().slice(0, 10) === dateStr);
    sparkDays.push({ label, value: dayEmails.length, sub: dayEmails.filter((e) => e.status === "pending").length });
  }

  const today = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const firstName = session.name?.split(" ")[0];

  // Priority project — the one with the most pending/escalated right now.
  // This is the single most useful thing on the page: "where should I look first."
  const priorityProject = [...projects]
    .map((p) => ({ project: p, pending: statusMap[p.id]?.pending ?? 0, escalated: statusMap[p.id]?.escalated ?? 0 }))
    .sort((a, b) => (b.escalated * 10 + b.pending) - (a.escalated * 10 + a.pending))[0];
  const hasUrgentWork = priorityProject && (priorityProject.pending > 0 || priorityProject.escalated > 0);

  return (
    <div className="space-y-6">
      {!gmailToken && <GmailConnectBanner />}

      {/* Welcome */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {greeting(now)}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-fg-muted mt-1">{today}</p>
        </div>
        {gmailToken && (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-success bg-success-soft border border-success/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            Gmail connected{gmailToken.gmailEmail ? ` · ${gmailToken.gmailEmail}` : ""}
          </span>
        )}
      </div>

      {/* Priority callout — the single most actionable thing right now */}
      {hasUrgentWork ? (
        <Link
          href={`/dashboard/projects/${priorityProject.project.id}`}
          className="flex items-center gap-4 bg-gradient-to-r from-danger/10 via-warning/10 to-transparent border border-warning/20 rounded-xl px-5 py-4 hover:border-warning/40 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-soft flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">
              Start with <span className="text-warning">{priorityProject.project.name}</span>
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              {priorityProject.escalated > 0 && `${priorityProject.escalated} escalated`}
              {priorityProject.escalated > 0 && priorityProject.pending > 0 && " · "}
              {priorityProject.pending > 0 && `${priorityProject.pending} pending`}
              {" "}— the most urgent queue right now
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-fg-subtle group-hover:translate-x-1 group-hover:text-warning transition-all shrink-0" />
        </Link>
      ) : (
        <div className="flex items-center gap-3 bg-success-soft border border-success/20 rounded-xl px-5 py-3.5">
          <PartyPopper className="w-4.5 h-4.5 text-success shrink-0" />
          <p className="text-sm text-fg">All clear — no pending or escalated emails across {projects.length} project{projects.length !== 1 ? "s" : ""}.</p>
        </div>
      )}

      {/* KPI grid: sparkline + 4 stat tiles */}
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

        <StatCard label="Pending"   value={totalPending}   accent="warning"                              hint="last 7 days" icon={<Clock className="w-3.5 h-3.5" />} />
        <StatCard label="Resolved"  value={totalDone}      accent="success"                              hint="last 7 days" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
        <StatCard label="Escalated" value={totalEscalated} accent={totalEscalated > 0 ? "danger" : "default"} hint={totalEscalated > 0 ? "needs attention" : "all calm"} icon={<AlertOctagon className="w-3.5 h-3.5" />} />
        <StatCard label="L2 queue"  value={l2Count}        accent="info"                                 hint={`of ${totalEmails} total`} icon={<Users className="w-3.5 h-3.5" />} />
      </div>

      {/* Projects */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Projects</h2>
          <p className="text-xs text-fg-muted mt-0.5">{projects.length} active</p>
        </div>
        <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Analytics <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <NewProjectForm />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            pendingCount={statusMap[project.id]?.pending ?? 0}
            doneCount={statusMap[project.id]?.done ?? 0}
            totalCount={statusMap[project.id]?.total ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
