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

  const [projects, newEmails, pending, escalated, followUpsDue] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { emailStatuses: true } } },
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
  ]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function formatDate(d: Date | string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Weekly Digest</h1>
        <p className="text-sm text-slate-400 mt-0.5">{today}</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New this week", value: newEmails, cls: "bg-white border-slate-200 text-slate-800" },
          { label: "Still pending", value: pending.length, cls: "bg-orange-50 border-orange-100 text-orange-600" },
          { label: "Escalated", value: escalated.length, cls: "bg-red-50 border-red-100 text-red-600" },
          { label: "Follow-ups due", value: followUpsDue.length, cls: "bg-amber-50 border-amber-100 text-amber-600" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Escalated emails — most urgent */}
      {escalated.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-800 mb-3">🔺 Escalated — Needs Your Attention</h2>
          <div className="space-y-2">
            {escalated.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="bg-white border border-red-100 rounded-lg p-3 hover:border-red-300 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600 font-medium">{e.project.name}</span>
                    <span className="text-xs text-slate-400">{formatDate(e.receivedAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{e.subject || "(no subject)"}</p>
                  <p className="text-xs text-slate-500 truncate">{e.fromName || e.fromEmail}</p>
                  {e.escalationNote && <p className="text-xs text-red-600 mt-1 italic">Note: {e.escalationNote}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {followUpsDue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">⏰ Follow-ups Due</h2>
          <div className="space-y-2">
            {followUpsDue.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="bg-white border border-amber-100 rounded-lg p-3 hover:border-amber-300 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-600 font-medium">{e.project.name}</span>
                    <span className="text-xs text-red-500 font-medium">Due: {formatDate(e.followUpAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{e.subject || "(no subject)"}</p>
                  <p className="text-xs text-slate-500 truncate">{e.fromName || e.fromEmail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending queue */}
      {pending.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Pending Queue ({pending.length})</h2>
          <div className="space-y-1.5">
            {pending.map((e) => (
              <Link key={e.id} href={`/dashboard/projects/${e.projectId}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.subject || "(no subject)"}</p>
                    <p className="text-xs text-slate-400 truncate">{e.project.name} · {e.fromName || e.fromEmail}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(e.receivedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projects overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Projects Overview</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition cursor-pointer">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold text-xs">{p.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p._count.emailStatuses} total synced</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
