import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClientEmailManager from "@/components/ClientEmailManager";
import ProjectSettingsClient from "@/components/ProjectSettingsClient";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const [project, slaConfig, clientProfiles, gmailToken] = await Promise.all([
    prisma.project.findUnique({ where: { id, userId }, include: { clientEmails: true } }),
    prisma.slaConfig.findUnique({ where: { projectId: id } }),
    prisma.clientProfile.findMany({ where: { projectId: id } }),
    prisma.gmailToken.findUnique({ where: { userId } }),
  ]);

  if (!project) notFound();

  // BA email: prefer what's stored on the project, fall back to connected Gmail email
  const detectedBaEmail = gmailToken?.gmailEmail ?? null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-slate-400 hover:text-slate-600">
          ← Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Project Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">{project.name}</p>
      </div>

      <ClientEmailManager projectId={id} clientEmails={project.clientEmails} />

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
