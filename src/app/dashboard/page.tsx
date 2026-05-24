import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import NewProjectForm from "@/components/NewProjectForm";
import GmailConnectBanner from "@/components/GmailConnectBanner";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  // Dynamic date windows
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);

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
    // Last 7 days — for KPI counts
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: sevenDaysAgo } },
      select: { status: true, projectId: true, routingTier: true, receivedAt: true },
    }),
    // Last 3 days — for the sparkline graph
    prisma.emailStatus.findMany({
      where: { userId, receivedAt: { gte: threeDaysAgo } },
      select: { receivedAt: true, status: true },
    }),
  ]);

  // KPI aggregation from last 7 days
  type StatusMap = Record<string, { pending: number; done: number; dismissed: number; escalated: number; total: number }>;
  const statusMap: StatusMap = {};
  let totalPending = 0, totalDone = 0, totalEscalated = 0;
  for (const e of recentEmails) {
    if (!statusMap[e.projectId]) {
      statusMap[e.projectId] = { pending: 0, done: 0, dismissed: 0, escalated: 0, total: 0 };
    }
    const s = e.status as keyof typeof statusMap[string];
    if (s in statusMap[e.projectId]) statusMap[e.projectId][s]++;
    statusMap[e.projectId].total++;
    if (e.status === "pending") totalPending++;
    if (e.status === "done") totalDone++;
    if (e.status === "escalated") totalEscalated++;
  }
  const totalEmails = recentEmails.length;
  const l2Count = recentEmails.filter((e) => e.routingTier === "l2").length;

  // 3-day sparkline — group by day label (today, yesterday, day before)
  const sparkDays: { label: string; date: string; total: number; pending: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayEmails = last3DaysEmails.filter((e) => e.receivedAt && new Date(e.receivedAt).toISOString().slice(0, 10) === dateStr);
    sparkDays.push({ label, date: dateStr, total: dayEmails.length, pending: dayEmails.filter((e) => e.status === "pending").length });
  }
  const sparkMax = Math.max(...sparkDays.map((d) => d.total), 1);

  const today = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      {!gmailToken && <GmailConnectBanner />}

      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Good morning 👋</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        {gmailToken && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Gmail connected
          </span>
        )}
      </div>

      {/* 3-day activity strip + KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* 3-day sparkline card */}
        <div className="sm:col-span-1 bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">Last 3 days</p>
          <div className="flex items-end gap-2 h-14">
            {sparkDays.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "40px" }}>
                  <div
                    className="w-full bg-indigo-100 rounded-t relative overflow-hidden"
                    style={{ height: `${Math.max((day.total / sparkMax) * 40, day.total > 0 ? 4 : 0)}px` }}
                  >
                    {day.pending > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-orange-400 rounded-t"
                        style={{ height: `${(day.pending / day.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 whitespace-nowrap">{day.label}</p>
                <p className="text-xs font-bold text-slate-700">{day.total}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-100 rounded-sm inline-block" /> Total</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-sm inline-block" /> Pending</span>
          </div>
        </div>

        {/* KPI grid */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-orange-600">{totalPending}</p>
            <p className="text-xs text-orange-500 mt-1">Pending</p>
            <p className="text-[10px] text-orange-300 mt-0.5">last 7 days</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-600">{totalDone}</p>
            <p className="text-xs text-emerald-500 mt-1">Resolved</p>
            <p className="text-[10px] text-emerald-300 mt-0.5">last 7 days</p>
          </div>
          {totalEscalated > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-600">{totalEscalated}</p>
              <p className="text-xs text-red-500 mt-1">Escalated</p>
              <p className="text-[10px] text-red-300 mt-0.5">needs attention</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-700">{totalEmails}</p>
              <p className="text-xs text-slate-400 mt-1">Total received</p>
              <p className="text-[10px] text-slate-300 mt-0.5">last 7 days</p>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-indigo-600">{l2Count}</p>
            <p className="text-xs text-slate-400 mt-1">L2 queue</p>
            <p className="text-[10px] text-slate-300 mt-0.5">last 7 days</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {totalPending > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">{totalPending} email{totalPending !== 1 ? "s" : ""} awaiting response —</span>
          <Link href="/dashboard/digest" className="text-sm text-indigo-600 font-medium hover:underline">View digest →</Link>
        </div>
      )}

      {/* Projects section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Projects</h2>
        {projects.length > 0 && (
          <Link href="/dashboard/analytics" className="text-xs text-indigo-500 hover:underline">View analytics →</Link>
        )}
      </div>

      <NewProjectForm />

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="font-medium text-slate-500">No projects yet</p>
          <p className="text-sm mt-1">Create one above to get started</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
