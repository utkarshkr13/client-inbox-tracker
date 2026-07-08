import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default async function Home() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/dashboard");
  redirect("/login");

  // Unreachable — kept for type completeness / possible future marketing page.
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-primary-fg" />
        </div>
        <h1 className="text-3xl font-bold text-fg">Client Inbox Tracker</h1>
        <p className="text-fg-muted">Track client emails per project — routed, SLA-tracked, escalation-ready.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-primary-fg px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition">
          Sign in <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
