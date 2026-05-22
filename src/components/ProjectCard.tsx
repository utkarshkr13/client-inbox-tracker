"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  clientEmails: { id: string; email: string; label: string | null }[];
  _count: { emailStatuses: number };
};

export default function ProjectCard({
  project,
  pendingCount,
}: {
  project: Project;
  pendingCount: number;
}) {
  const router = useRouter();

  async function deleteProject() {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition group">
      <div className="flex items-start justify-between">
        <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
          <h2 className="font-semibold text-gray-900 group-hover:text-black">{project.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {project.clientEmails.length} email{project.clientEmails.length !== 1 ? "s" : ""}
          </p>
        </Link>
        <button
          onClick={deleteProject}
          className="text-gray-300 hover:text-red-500 transition ml-2 text-lg leading-none"
          title="Delete project"
        >
          ×
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="mt-3">
          <span className="inline-flex items-center bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {pendingCount} pending
          </span>
        </div>
      )}

      {pendingCount === 0 && project._count.emailStatuses > 0 && (
        <div className="mt-3">
          <span className="inline-flex items-center bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            All clear
          </span>
        </div>
      )}
    </div>
  );
}
