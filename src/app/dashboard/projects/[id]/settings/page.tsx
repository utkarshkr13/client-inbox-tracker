import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClientEmailManager from "@/components/ClientEmailManager";
import TeamMembersManager from "@/components/TeamMembersManager";
import ProjectSettingsClient from "@/components/ProjectSettingsClient";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const [project, slaConfig, clientProfiles, gmailToken, teamMembers] = await Promise.all([
    prisma.project.findUnique({ where: { id, userId }, include: { clientEmails: true } }),
    prisma.slaConfig.findUnique({ where: { projectId: id } }),
    prisma.clientProfile.findMany({ where: { projectId: id } }),
    prisma.gmailToken.findUnique({ where: { userId } }),
    prisma.teamMember.findMany({
      where: { projectId: id },
      include: { gmailToken: { select: { gmailEmail: true, updatedAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  // BA email: prefer what's stored on the project, fall back to connected Gmail email
  const detectedBaEmail = gmailToken?.gmailEmail ?? null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-fg-subtle hover:text-fg-muted">
          ← Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-fg mt-1">Project Settings</h1>
        <p className="text-sm text-fg-subtle mt-0.5">{project.name}</p>
      </div>

      <ClientEmailManager projectId={id} clientEmails={project.clientEmails} />

      <TeamMembersManager projectId={id} initialMembers={JSON.parse(JSON.stringify(teamMembers))} />

      <ProjectSettingsClient
        projectId={id}
        initialSlaHours={slaConfig?.thresholdHours ?? 24}
        clientEmails={project.clientEmails}
        initialProfiles={clientProfiles}
        initialL2Email={project.l2Email ?? ""}
        initialBaEmail={project.baEmail ?? detectedBaEmail ?? ""}
        detectedBaEmail={detectedBaEmail}
      />
    </div>
  );
}
