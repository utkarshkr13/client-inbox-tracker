import LogoutButton from "@/components/LogoutButton";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
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

  const urgentCount = pendingCount + escalatedCount;

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar urgentCount={urgentCount} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — only the right-side controls. Nav lives in sidebar on desktop, bottom bar on mobile. */}
        <header className="sticky top-0 z-20 h-14 px-4 md:px-6 flex items-center justify-end gap-2 border-b border-border bg-bg-elev/80 backdrop-blur-md">
          {/* Mobile brand */}
          <div className="md:hidden mr-auto flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary-fg" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-fg">Inbox Tracker</span>
          </div>

          <ThemeToggle />
          <LogoutButton />
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-6xl w-full mx-auto pb-24 md:pb-12">
          {children}
        </main>
      </div>

      <MobileNav urgentCount={urgentCount} />
    </div>
  );
}
