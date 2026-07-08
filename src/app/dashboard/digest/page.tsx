import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DigestPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // L2 SLA breach: L2-routed emails still pending that have breached their project SLA
  // We load all pending L2 emails + their project's SLA config, then filter in JS
  //
  // NOTE: the lists below are capped with `take` for rendering, but the KPI strip
  // must reflect the *true* total — otherwise "Still pending" silently caps at 20
  // and quietly understates a larger backlog. Real counts are fetched separately.
  const [projects, newEmails, pending, escalated, followUpsDue, l2PendingAll, pendingTotal, escalatedTotal, followUpsDueTotal] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { emailStatuses: true } }, slaConfig: true },
    }),
    prisma.emailStatus.count({ where: { userId, createdAt: { gte: weekAgo } } }),
    prisma.emailStatus.findMany({
      where: { userId, status: "pending" },
      orderBy: { receivedAt: "asc" },
      take: 20,
      include: { project: { select: { name: true } } },
    }),
    prisma.emailStatus.findMany({
      where: { userId, status: "escalated" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { project: { select: { name: true } } },
    }),
    prisma.emailStatus.findMany({
      where: { userId, followUpAt: { not: null, lte: new Date() } },
      orderBy: { followUpAt: "asc" },
      take: 10,
      include: { project: { select: { name: true } } },
    }),
    // All pending L2-routed emails to check against SLA
    prisma.emailStatus.findMany({
      where: { userId, status: "pending", routingTier: "l2" },
      orderBy: { receivedAt: "asc" },
      include: { project: { include: { slaConfig: true } } },
    }),
    prisma.emailStatus.count({ where: { userId, status: "pending" } }),
    prisma.emailStatus.count({ where: { userId, status: "escalated" } }),
    prisma.emailStatus.count({ where: { userId, followUpAt: { not: null, lte: new Date() } } }),
  ]);

  // Filter l2PendingAll to only those that have breached SLA
  const now = Date.now();
  const l2SlaBreach = l2PendingAll.filter((e) => {
    if (!e.receivedAt) return false;
    const slaHours = (e.project as { slaConfig?: { thresholdHours: number } | null }).slaConfig?.thresholdHours ?? 24;
    const hoursAgo = (now - new Date(e.receivedAt).getTime()) / (1000 * 60 * 60);
    return hoursAgo >= slaHours;
  });

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function formatDate(d: Date | string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
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

      {/* L2 SLA breach — shown above escalations, these need BA action NOW */}
      {l2SlaBreach.length > 0 && (
        <div className="bg-danger-soft border-2 border-danger/40 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-danger mb-1">🔴 L2 SLA Breach — BA Action Required</h2>
          <p className="text-xs text-danger mb-3">
            These emails were routed to L2 but L2 has not responded within the SLA window. BA must step in.
          </p>
          <div className="space-y-2">
            {l2SlaBreach.map((e) => {
              const slaHours = (e.project as { slaConfig?: { thresholdHours: number } | null }).slaConfig?.thresholdHours ?? 24;
              const hoursOverdue = Math.round((now - new Date(e.receivedAt!).getTime()) / (1000 * 60 * 60)) - slaHours;
              return (
                <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                  <div className="bg-bg-elev border border-danger/25 rounded-lg p-3 hover:border-danger/50 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-warning-soft text-warning border border-warning/25 px-2 py-0.5 rounded-full font-medium">L2</span>
                        <span className="text-xs text-danger font-medium">{e.project.name}</span>
                      </div>
                      <span className="text-xs text-danger font-semibold">{hoursOverdue}h overdue</span>
                    </div>
                    <p className="text-sm font-medium text-fg mt-0.5 truncate">{e.subject || "(no subject)"}</p>
                    <p className="text-xs text-fg-muted truncate">{e.fromName || e.fromEmail}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Escalated emails — most urgent */}
      {escalated.length > 0 && (
        <div className="bg-danger-soft border border-danger/25 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-danger mb-3">🔺 Escalated — Needs Your Attention</h2>
          <div className="space-y-2">
            {escalated.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="bg-bg-elev border border-danger/20 rounded-lg p-3 hover:border-danger/40 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-danger font-medium">{e.project.name}</span>
                    <span className="text-xs text-fg-subtle">{formatDate(e.receivedAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-fg mt-0.5 truncate">{e.subject || "(no subject)"}</p>
                  <p className="text-xs text-fg-muted truncate">{e.fromName || e.fromEmail}</p>
                  {e.escalationNote && <p className="text-xs text-danger mt-1 italic">Note: {e.escalationNote}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {followUpsDue.length > 0 && (
        <div className="bg-warning-soft border border-warning/25 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-warning mb-3">⏰ Follow-ups Due</h2>
          <div className="space-y-2">
            {followUpsDue.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="bg-bg-elev border border-warning/20 rounded-lg p-3 hover:border-amber-300 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-warning font-medium">{e.project.name}</span>
                    <span className="text-xs text-danger font-medium">Due: {formatDate(e.followUpAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-fg mt-0.5 truncate">{e.subject || "(no subject)"}</p>
                  <p className="text-xs text-fg-muted truncate">{e.fromName || e.fromEmail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending queue */}
      {pending.length > 0 && (
        <div className="bg-bg-elev border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Pending Queue ({pendingTotal > pending.length ? `${pending.length} of ${pendingTotal}` : pending.length})</h2>
          <div className="space-y-1.5">
            {pending.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-muted transition cursor-pointer border border-transparent hover:border-border">
                  <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{e.subject || "(no subject)"}</p>
                    <p className="text-xs text-fg-subtle truncate">{e.project.name} · {e.fromName || e.fromEmail}</p>
                  </div>
                  <span className="text-xs text-fg-subtle flex-shrink-0">{formatDate(e.receivedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projects overview */}
      <div className="bg-bg-elev border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-fg mb-3">Projects Overview</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/25 hover:bg-primary-soft/30 transition cursor-pointer">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-xs">{p.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{p.name}</p>
                  <p className="text-xs text-fg-subtle">{p._count.emailStatuses} total synced</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
