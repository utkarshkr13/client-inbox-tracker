import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight">Client Inbox Tracker</span>
        </Link>
        <LogoutButton />
      </header>
      <main className="px-6 py-8 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
