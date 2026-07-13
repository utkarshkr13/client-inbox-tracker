import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Mail, Clock, AlertOctagon, Timer } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const days = 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [emailStatuses, projects] = await Promise.all([
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: since } },
      select: { status: true, aiCategory: true, routingTier: true, receivedAt: true, updatedAt: true, projectId: true },
    }),
    prisma.project.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  const total = emailStatuses.length;
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRouting: Record<string, number> = {};
  const byProject: Record<string, number> = {};

  for (const e of emailStatuses) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    const cat = e.aiCategory ?? "General";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    byRouting[e.routingTier] = (byRouting[e.routingTier] ?? 0) + 1;
    byProject[e.projectId] = (byProject[e.projectId] ?? 0) + 1;
  }

  const resolved = emailStatuses.filter((e) => e.status === "done" || e.status === "dismissed");
  const avgResolutionHours = resolved.length > 0
    ? resolved.reduce((sum, e) => {
        if (!e.receivedAt) return sum;
        return sum + (e.updatedAt.getTime() - new Date(e.receivedAt).getTime()) / (1000 * 60 * 60);
      }, 0) / resolved.length
    : 0;

  // Daily volume
  const dailyMap: Record<string, number> = {};
  for (const e of emailStatuses) {
    if (e.receivedAt) {
      const day = new Date(e.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }
  }
  const maxDaily = Math.max(...Object.values(dailyMap), 1);

  const COLORS: Record<string, string> = {
    Billing: "bg-yellow-400", Bug: "bg-red-400", Feature: "bg-blue-400",
    Meeting: "bg-purple-400", Approval: "bg-indigo-400", Update: "bg-teal-400", General: "bg-border-strong",
  };

  return (
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

      <div className="grid sm:grid-cols-2 gap-4 stagger">
        {/* Status breakdown */}
        <div className="bg-bg-elev border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Status Breakdown</h2>
          <div className="space-y-2.5">
            {[["pending", "bg-warning"], ["done", "bg-emerald-500"], ["dismissed", "bg-border-strong"], ["escalated", "bg-red-400"]].map(([s, cls]) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs text-fg-muted w-20 capitalize">{s}</span>
                <div className="flex-1 bg-bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${cls}`} style={{ width: `${total > 0 ? ((byStatus[s] ?? 0) / total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-semibold text-fg w-6 text-right">{byStatus[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-bg-elev border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">AI Category Breakdown</h2>
          <div className="space-y-2.5">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-fg-muted w-20">{cat}</span>
                <div className="flex-1 bg-bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${COLORS[cat] ?? "bg-fg-subtle"}`} style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-fg w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Routing split */}
      <div className="bg-bg-elev border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-fg mb-3">BA vs L2 Routing</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-bg-muted rounded-full h-4 overflow-hidden flex">
            <div className="bg-primary h-full" style={{ width: `${total > 0 ? ((byRouting.ba ?? 0) / total) * 100 : 0}%` }} title={`BA: ${byRouting.ba ?? 0}`} />
            <div className="bg-warning h-full" style={{ width: `${total > 0 ? ((byRouting.l2 ?? 0) / total) * 100 : 0}%` }} title={`L2: ${byRouting.l2 ?? 0}`} />
          </div>
          <div className="flex items-center gap-3 text-xs flex-shrink-0">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-primary rounded-full inline-block" /> BA: {byRouting.ba ?? 0}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-warning rounded-full inline-block" /> L2: {byRouting.l2 ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Per-project */}
      <div className="bg-bg-elev border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-fg mb-4">Volume by Project</h2>
        <div className="space-y-2.5">
          {Object.entries(byProject).sort((a, b) => b[1] - a[1]).map(([pId, count]) => {
            const proj = projects.find((p) => p.id === pId);
            return (
              <div key={pId} className="flex items-center gap-3">
                <Link href={`/dashboard/projects/${pId}`} className="text-xs text-primary hover:underline w-32 truncate">{proj?.name ?? pId}</Link>
                <div className="flex-1 bg-bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-fg w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
