import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import NewProjectForm from "@/components/NewProjectForm";
import GmailConnectBanner from "@/components/GmailConnectBanner";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const [projects, gmailToken] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        clientEmails: true,
        _count: { select: { emailStatuses: true } },
      },
    }),
    prisma.gmailToken.findUnique({ where: { userId } }),
  ]);

  const pendingCounts = await prisma.emailStatus.groupBy({
    by: ["projectId"],
    where: { userId, status: "pending" },
    _count: { _all: true },
  });

  const pendingMap: Record<string, number> = {};
  for (const p of pendingCounts) {
    pendingMap[p.projectId] = p._count._all;
  }

  const totalPending = Object.values(pendingMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {!gmailToken && <GmailConnectBanner />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          {totalPending > 0 && (
            <p className="text-sm text-orange-500 mt-0.5">{totalPending} email{totalPending !== 1 ? "s" : ""} awaiting response</p>
          )}
        </div>
        {gmailToken && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Gmail connected
          </span>
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
              pendingCount={pendingMap[project.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
