"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, FolderPlus,
  UserPlus, Mail, X, Loader2, PartyPopper,
} from "lucide-react";
import { Button } from "./ui/button";

type Step = 0 | 1 | 2 | 3;

export default function OnboardingWizard({ gmailEmail }: { gmailEmail?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [dismissed, setDismissed] = useState(false);

  // Step 2 — project
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);

  // Step 3 — client email
  const [clientEmail, setClientEmail] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [clientAdded, setClientAdded] = useState(false);

  // Step 4 — sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjectId(project.id);
        setStep(2);
      }
    } finally {
      setCreatingProject(false);
    }
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientEmail.trim() || !projectId) return;
    setAddingClient(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/client-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail.trim(), label: clientLabel.trim() }),
      });
      if (res.ok) {
        setClientAdded(true);
        setClientEmail("");
        setClientLabel("");
      }
    } finally {
      setAddingClient(false);
    }
  }

  async function syncAndFinish() {
    if (!projectId) return finish();
    setSyncing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/emails`);
      const data = await res.json().catch(() => ({}));
      setSyncResult(res.ok ? `Synced ${data.synced ?? 0} email${data.synced === 1 ? "" : "s"}` : null);
    } finally {
      setSyncing(false);
      setTimeout(finish, 700);
    }
  }

  function finish() {
    router.refresh();
    setDismissed(true);
  }

  if (dismissed) return null;

  const STEPS = ["Welcome", "First project", "Add a client", "Sync"];

  return (
    <div className="bg-bg-elev border border-border rounded-2xl shadow-md overflow-hidden">
      {/* Progress header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-fg" : "bg-bg-muted text-fg-subtle"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? "bg-success" : "bg-border"}`} />}
            </div>
          ))}
        </div>
        <button onClick={finish} className="text-fg-subtle hover:text-fg p-1 rounded-md hover:bg-bg-muted" aria-label="Skip setup">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {step === 0 && (
          <div className="text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-fg">You're in.</h2>
            {gmailEmail && (
              <p className="text-sm text-fg-muted mt-2">
                Gmail connected as <span className="font-medium text-fg">{gmailEmail}</span> — read-only, synced on demand.
              </p>
            )}
            <p className="text-sm text-fg-muted mt-3">
              Two minutes of setup: create a project, tell it which client addresses to watch, and sync.
            </p>
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => setStep(1)}>
              Get started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center mb-4">
              <FolderPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-fg">Name your first project</h2>
            <p className="text-sm text-fg-muted mt-1">Usually a client or account name — e.g. "Zydus" or "Acme Corp".</p>
            <form onSubmit={createProject} className="mt-5 space-y-3">
              <input
                autoFocus
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-3.5 h-3.5" /> Back</Button>
                <Button type="submit" variant="primary" loading={creatingProject} disabled={!projectName.trim()} className="flex-1">
                  Create project <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-fg">Which client should we watch?</h2>
            <p className="text-sm text-fg-muted mt-1">Emails from this address will show up in "{projectName}". You can add more later.</p>
            <form onSubmit={addClient} className="mt-5 space-y-3">
              <input
                autoFocus
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                value={clientLabel}
                onChange={(e) => setClientLabel(e.target.value)}
                placeholder="Label (optional) — e.g. Rahul, Finance lead"
                className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {clientAdded && (
                <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Added — add another or continue.</p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-3.5 h-3.5" /> Back</Button>
                {clientAdded ? (
                  <Button type="button" variant="primary" className="flex-1" onClick={() => setStep(3)}>
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" loading={addingClient} disabled={!clientEmail.trim()} className="flex-1">
                    Add client <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-success-soft flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-xl font-bold text-fg">All set.</h2>
            <p className="text-sm text-fg-muted mt-2">
              "{projectName}" is ready. Run your first sync to pull in existing threads, or jump straight to the dashboard.
            </p>
            {syncResult && <p className="text-xs text-success mt-2 font-medium">{syncResult}</p>}
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="primary" size="lg" loading={syncing} onClick={syncAndFinish}>
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Sync now
              </Button>
              <Button variant="ghost" onClick={finish}>Skip, I'll sync later</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
