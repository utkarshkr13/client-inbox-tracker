import Link from "next/link";
import { Mail, ShieldCheck, Zap, Users, ArrowRight, AlertTriangle } from "lucide-react";

const ERROR_COPY: Record<string, string> = {
  denied: "You closed the Google sign-in window before granting access.",
  no_code: "Google didn't return an authorization code. Please try again.",
  token_exchange: "We couldn't complete the exchange with Google. Please try again.",
  not_allowed: "That Google account isn't on the access list for this workspace. Ask your admin to add it.",
};

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l4.01-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Left — story panel (hidden on small screens) */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,hsl(243_75%_59%/0.25),transparent_45%),radial-gradient(circle_at_80%_70%,hsl(28_90%_50%/0.18),transparent_40%)] bg-[#0b0e1a]">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(hsl(0_0%_100%)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Mail className="w-4.5 h-4.5 text-primary-fg" />
          </div>
          <span className="text-white font-semibold">Client Inbox Tracker</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold text-white tracking-tight leading-[1.15]">
            Every client email, triaged before it becomes an escalation.
          </h1>
          <p className="text-slate-400 mt-4 text-base leading-relaxed">
            Smart BA/L2 routing, SLA breach alerts, and a shared queue — synced straight
            from Gmail. No API keys to manage, no separate setup step.
          </p>

          <div className="mt-8 space-y-3.5">
            {[
              { icon: Zap, text: "Auto-routes emails to the right responder using To/CC signals" },
              { icon: ShieldCheck, text: "SLA breach detection with amber/red escalation badges" },
              { icon: Users, text: "One shared queue — BA and L2 always see the same picture" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-sm text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">salescode.ai · internal tool</p>
      </div>

      {/* Right — auth panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="w-4.5 h-4.5 text-primary-fg" />
            </div>
            <span className="font-semibold text-fg">Client Inbox Tracker</span>
          </div>

          <h2 className="text-2xl font-bold text-fg tracking-tight">Welcome back</h2>
          <p className="text-sm text-fg-muted mt-1.5">
            Sign in with Google — the same step connects your inbox, so there's nothing else to set up.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2 bg-danger-soft border border-danger/20 rounded-lg p-3 text-xs text-danger">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{ERROR_COPY[error] ?? "Something went wrong. Please try again."}</span>
            </div>
          )}

          <Link
            href="/api/gmail/connect"
            className="mt-6 w-full flex items-center justify-center gap-3 bg-bg-elev border border-border-strong rounded-xl px-5 py-3.5 text-sm font-medium text-fg hover:bg-bg-muted hover:shadow-md transition-all group"
          >
            <GoogleLogo className="w-5 h-5" />
            Continue with Google
            <ArrowRight className="w-4 h-4 text-fg-subtle group-hover:translate-x-0.5 transition-transform ml-auto" />
          </Link>

          <div className="mt-6 flex items-start gap-2 text-xs text-fg-subtle">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              We request read-only Gmail access to sync client threads — we never send email on
              your behalf, and access can be revoked anytime from your Google Account settings.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
