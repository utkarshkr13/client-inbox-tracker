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

  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer group relative">
        {/* Delete button */}
        <button
          onClick={deleteProject}
          className="absolute top-3.5 right-3.5 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 text-base leading-none"
          title="Delete project"
        >
          ×
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition">
            <span className="text-indigo-600 font-bold text-sm">{initials}</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-800 text-sm truncate pr-4 group-hover:text-indigo-700 transition">
              {project.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {project.clientEmails.length} client email{project.clientEmails.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          {pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-100 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
              {pendingCount} pending
            </span>
          ) : project._count.emailStatuses > 0 ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              All clear
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">No emails synced</span>
          )}

          <span className="text-xs text-slate-300 group-hover:text-indigo-400 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
