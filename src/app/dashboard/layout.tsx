import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const userId = session.userId ?? "";

  // Fast count queries for nav badges — run in parallel
  const [pendingCount, escalatedCount] = userId
    ? await Promise.all([
        prisma.emailStatus.count({ where: { userId, status: "pending" } }),
        prisma.emailStatus.count({ where: { userId, status: "escalated" } }),
      ])
    : [0, 0];

  const totalUrgent = pendingCount + escalatedCount;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight hidden sm:inline">Client Inbox</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          <Link href="/dashboard"
            className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium">
            Projects
          </Link>
          <Link href="/dashboard/search"
            className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium hidden sm:block">
            🔍
          </Link>
          <Link href="/dashboard/analytics"
            className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium hidden sm:block">
            📊
          </Link>
          <Link href="/dashboard/digest"
            className="relative text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium">
            <span>📋 Digest</span>
            {totalUrgent > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {totalUrgent > 99 ? "99+" : totalUrgent}
              </span>
            )}
          </Link>
          <Link href="/dashboard/templates"
            className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium hidden sm:block">
            📝
          </Link>
          <Link href="/dashboard/settings"
            className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium">
            ⚙
          </Link>
        </nav>

        <LogoutButton />
      </header>
      <main className="px-4 py-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
