import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EmailList from "@/components/EmailList";
import SyncButton from "@/components/SyncButton";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const [project, slaConfig, gmailToken, teamMembers] = await Promise.all([
    prisma.project.findUnique({ where: { id, userId }, include: { clientEmails: true } }),
    prisma.slaConfig.findUnique({ where: { projectId: id } }),
    prisma.gmailToken.findUnique({ where: { userId } }),
    prisma.teamMember.findMany({
      where: { projectId: id },
      include: { gmailToken: { select: { gmailEmail: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  const emailStatuses = await prisma.emailStatus.findMany({
    where: { projectId: id, userId },
    orderBy: { receivedAt: "desc" },
    include: { notes: true, emailTags: { include: { tag: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Projects</Link>
          <h1 className="text-2xl font-bold text-fg mt-1">{project.name}</h1>
          <p className="text-sm text-fg-subtle mt-0.5">
            {project.clientEmails.length} client email{project.clientEmails.length !== 1 ? "s" : ""}
            {emailStatuses.length > 0 && <span className="ml-2 text-fg-subtle">· {emailStatuses.length} total synced</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Link href={`/dashboard/projects/${id}/settings`}
            className="text-sm border border-border text-fg-muted px-3 py-2 rounded-xl hover:bg-bg-muted transition">
            Settings
          </Link>
          {gmailToken && (
            <SyncButton projectId={id} clientEmails={project.clientEmails.map((e: { email: string }) => e.email)} />
          )}
        </div>
      </div>

      {!gmailToken && (
        <div className="bg-warning-soft border border-warning/25 rounded-xl p-4 text-sm text-warning">
          Gmail not connected.{" "}
          <Link href="/api/gmail/connect" className="underline font-medium">Connect Gmail</Link>{" "}
          to fetch emails.
        </div>
      )}

      {project.clientEmails.length === 0 ? (
        <div className="text-center py-16 text-fg-subtle">
          No client emails added.{" "}
          <Link href={`/dashboard/projects/${id}/settings`} className="underline text-fg-muted">Add some →</Link>
        </div>
      ) : (
        <EmailList
          emailStatuses={emailStatuses}
          clientEmails={project.clientEmails}
          projectId={id}
          slaThresholdHours={slaConfig?.thresholdHours ?? 24}
          teamMembers={JSON.parse(JSON.stringify(teamMembers))}
          baEmail={gmailToken?.gmailEmail ?? project.baEmail ?? null}
        />
      )}
    </div>
  );
}
