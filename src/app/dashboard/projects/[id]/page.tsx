import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EmailList from "@/components/EmailList";
import SyncButton from "@/components/SyncButton";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const project = await prisma.project.findUnique({
    where: { id, userId },
    include: { clientEmails: true },
  });

  if (!project) notFound();

  const emailStatuses = await prisma.emailStatus.findMany({
    where: { projectId: id, userId },
    orderBy: { receivedAt: "desc" },
  });

  const gmailToken = await prisma.gmailToken.findUnique({ where: { userId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Projects
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {project.clientEmails.length} client email{project.clientEmails.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/projects/${id}/settings`}
            className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Manage Emails
          </Link>
          {gmailToken && (
            <SyncButton projectId={id} clientEmails={project.clientEmails.map((e: { email: string }) => e.email)} />
          )}
        </div>
      </div>

      {!gmailToken && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Gmail not connected.{" "}
          <Link href="/api/gmail/connect" className="underline font-medium">
            Connect Gmail
          </Link>{" "}
          to fetch emails.
        </div>
      )}

      {project.clientEmails.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No client emails added.{" "}
          <Link href={`/dashboard/projects/${id}/settings`} className="underline text-gray-600">
            Add some →
          </Link>
        </div>
      ) : (
        <EmailList
          emailStatuses={emailStatuses}
          clientEmails={project.clientEmails}
          projectId={id}
        />
      )}
    </div>
  );
}
