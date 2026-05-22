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

  return (
    <div className="space-y-6">
      {!gmailToken && <GmailConnectBanner />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </div>

      <NewProjectForm />

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No projects yet. Create one above.
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
