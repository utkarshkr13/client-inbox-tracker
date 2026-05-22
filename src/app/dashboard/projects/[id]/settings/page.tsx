import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClientEmailManager from "@/components/ClientEmailManager";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  const userId = session.userId!;

  const project = await prisma.project.findUnique({
    where: { id, userId },
    include: { clientEmails: true },
  });

  if (!project) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Manage Client Emails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Emails added here will be fetched from Gmail when you sync.
        </p>
      </div>

      <ClientEmailManager projectId={id} clientEmails={project.clientEmails} />
    </div>
  );
}
