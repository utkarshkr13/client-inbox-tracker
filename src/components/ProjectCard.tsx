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

  async function deleteProject(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${project.name}"?`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition cursor-pointer group relative">
        <button
          onClick={deleteProject}
          className="absolute top-4 right-4 text-slate-300 hover:text-red-400 transition text-lg leading-none opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          ×
        </button>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition">
            <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-800 truncate pr-4">{project.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {project.clientEmails.length} email{project.clientEmails.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
              {pendingCount} pending
            </span>
          ) : project._count.emailStatuses > 0 ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              All clear
            </span>
          ) : (
            <span className="text-xs text-slate-400">No emails synced</span>
          )}
        </div>
      </div>
    </Link>
  );
}
