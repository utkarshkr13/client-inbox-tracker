"use client";

import { useState } from "react";

type ClientEmail = { id: string; email: string; label: string | null };
type ClientProfile = {
  id: string;
  email: string;
  contactName: string | null;
  role: string | null;
  company: string | null;
  contractEndDate: string | Date | null;
  riskLevel: string;
  notes: string | null;
};

const RISK_COLORS: Record<string, string> = {
  green: "bg-success-soft text-emerald-700 border-success/25",
  amber: "bg-warning-soft text-warning border-warning/25",
  red: "bg-danger-soft text-danger border-danger/25",
};

export default function ProjectSettingsClient({
  projectId,
  initialSlaHours,
  clientEmails,
  initialProfiles,
  initialL2Email,
  initialBaEmail,
  detectedBaEmail,
}: {
  projectId: string;
  initialSlaHours: number;
  clientEmails: ClientEmail[];
  initialProfiles: ClientProfile[];
  initialL2Email: string;
  initialBaEmail: string;
  detectedBaEmail: string | null;
}) {
  // SLA
  const [slaHours, setSlaHours] = useState(initialSlaHours);
  const [slaSaved, setSlaSaved] = useState(false);
  const [slaSaving, setSlaSaving] = useState(false);

  // L2 / BA email routing
  const [l2Email, setL2Email] = useState(initialL2Email);
  const [baEmail, setBaEmail] = useState(initialBaEmail);
  const [routingSaved, setRoutingSaved] = useState(false);
  const [routingSaving, setRoutingSaving] = useState(false);

  // CRM profiles
  const [profiles, setProfiles] = useState<ClientProfile[]>(initialProfiles);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClientProfile>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  async function saveSla() {
    setSlaSaving(true);
    await fetch(`/api/projects/${projectId}/sla`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholdHours: slaHours }),
    });
    setSlaSaving(false);
    setSlaSaved(true);
    setTimeout(() => setSlaSaved(false), 2000);
  }

  async function saveRouting() {
    setRoutingSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ l2Email: l2Email.trim(), baEmail: baEmail.trim() }),
    });
    setRoutingSaving(false);
    setRoutingSaved(true);
    setTimeout(() => setRoutingSaved(false), 2000);
  }

  function startEditProfile(email: string) {
    const existing = profiles.find((p) => p.email === email);
    setEditingEmail(email);
    setForm(existing ?? { email, riskLevel: "green" });
  }

  async function saveProfile() {
    if (!editingEmail) return;
    setProfileSaving(true);
    const res = await fetch(`/api/projects/${projectId}/client-profiles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editingEmail, ...form }),
    });
    const saved = await res.json();
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.email === editingEmail);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
    setEditingEmail(null);
    setForm({});
    setProfileSaving(false);
  }

  return (
    <>
      {/* ── L2 / BA Email Routing ───────────────────────────────────── */}
      <div className="bg-bg-elev border border-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-fg">L2 & BA Routing</h2>
          <p className="text-sm text-fg-muted mt-1">
            When an email is synced, the app automatically detects who is in the <strong>To</strong> and <strong>CC</strong> fields
            and routes accordingly. Set the email addresses below so the routing engine knows who is who.
          </p>
        </div>

        {/* Routing diagram */}
        <div className="bg-bg-muted border border-border rounded-xl p-4 text-xs space-y-2 text-fg-muted">
          <p className="font-semibold text-fg mb-1">How routing works:</p>
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold mt-0.5">▸</span>
            <span><strong>Scenario 1 — Email TO the BA</strong> (L2 in CC or not present): BA is responsible first. L2 is looped in but BA leads.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-warning font-bold mt-0.5">▸</span>
            <span><strong>Scenario 2 — Email TO the L2</strong> (BA in CC): L2 must respond first within the SLA window. If L2 doesn't act, it is flagged as an <span className="text-danger font-semibold">L2 SLA breach</span> and the BA is alerted.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-fg-subtle font-bold mt-0.5">▸</span>
            <span><strong>Scenario 3 — Email TO both BA and L2</strong>: BA is treated as primary since they were explicitly addressed.</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border text-fg-subtle">
            If neither is in the To/CC headers, routing falls back to the email category (Bug / General → L2, everything else → BA).
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* BA Email */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              Your email (BA)
              <span className="ml-1 text-xs font-normal text-fg-subtle">— the email you check Gmail on</span>
            </label>
            <input
              type="email"
              value={baEmail}
              onChange={(e) => setBaEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {detectedBaEmail && detectedBaEmail !== baEmail && (
              <button onClick={() => setBaEmail(detectedBaEmail)} className="text-xs text-indigo-500 hover:underline mt-1">
                Use connected Gmail: {detectedBaEmail}
              </button>
            )}
            {detectedBaEmail && detectedBaEmail === baEmail && (
              <p className="text-xs text-success mt-1">✓ Matches your connected Gmail</p>
            )}
          </div>

          {/* L2 Email */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              L2 email address
              <span className="ml-1 text-xs font-normal text-fg-subtle">— your support agent for this project</span>
            </label>
            <input
              type="email"
              value={l2Email}
              onChange={(e) => setL2Email(e.target.value)}
              placeholder="support@company.com"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {!l2Email && (
              <p className="text-xs text-warning mt-1">⚠ No L2 set — all emails will route to BA by default</p>
            )}
            {l2Email && (
              <p className="text-xs text-success mt-1">✓ Smart routing active for this project</p>
            )}
          </div>
        </div>

        <button
          onClick={saveRouting}
          disabled={routingSaving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${routingSaved ? "bg-success text-primary-fg" : "bg-primary text-primary-fg hover:bg-primary/90"} disabled:opacity-50`}
        >
          {routingSaved ? "✓ Routing saved" : routingSaving ? "Saving…" : "Save Routing Config"}
        </button>

        <p className="text-xs text-fg-subtle">
          Routing is re-evaluated on every sync, so you can update these emails at any time and re-sync to apply.
        </p>
      </div>

      {/* ── SLA Configuration ──────────────────────────────────────── */}
      <div className="bg-bg-elev border border-border rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-fg">SLA Configuration</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Pending emails older than this threshold show SLA warnings. For L2-routed emails, a breach means
            the L2 has not acted — this surfaces as an <span className="text-danger font-medium">L2 SLA breach</span> badge
            so the BA can step in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-fg-muted">Response deadline:</label>
          <input
            type="number"
            value={slaHours}
            onChange={(e) => setSlaHours(parseInt(e.target.value) || 24)}
            min={1}
            max={168}
            className="w-20 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-sm text-fg-muted">hours</span>
          <button
            onClick={saveSla}
            disabled={slaSaving}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${slaSaved ? "bg-success text-primary-fg" : "bg-primary text-primary-fg hover:bg-primary/90"} disabled:opacity-50`}
          >
            {slaSaved ? "✓ Saved" : slaSaving ? "Saving…" : "Save SLA"}
          </button>
        </div>
        <p className="text-xs text-fg-subtle">Orange warning at 75% of threshold · Red breach at 100%</p>
      </div>

      {/* ── Client CRM Profiles ─────────────────────────────────────── */}
      <div className="bg-bg-elev border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-fg">Client Profiles (CRM)</h2>
        <p className="text-sm text-fg-muted">Contact details, risk level and notes for each client email address.</p>

        {clientEmails.map((ce) => {
          const profile = profiles.find((p) => p.email === ce.email);
          const isEditing = editingEmail === ce.email;
          return (
            <div key={ce.id} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-bg-muted border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-fg">{ce.label || ce.email}</p>
                  {ce.label && <p className="text-xs text-fg-subtle">{ce.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {profile && (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${RISK_COLORS[profile.riskLevel] ?? RISK_COLORS.green}`}>
                      {profile.riskLevel} risk
                    </span>
                  )}
                  <button
                    onClick={() => isEditing ? setEditingEmail(null) : startEditProfile(ce.email)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-muted transition"
                  >
                    {isEditing ? "Cancel" : profile ? "Edit" : "Add Details"}
                  </button>
                </div>
              </div>

              {!isEditing && profile && (
                <div className="px-4 py-3 grid grid-cols-2 gap-2 text-xs">
                  {profile.contactName && <div><span className="text-fg-subtle">Contact:</span> <span className="text-fg">{profile.contactName}</span></div>}
                  {profile.role && <div><span className="text-fg-subtle">Role:</span> <span className="text-fg">{profile.role}</span></div>}
                  {profile.company && <div><span className="text-fg-subtle">Company:</span> <span className="text-fg">{profile.company}</span></div>}
                  {profile.contractEndDate && <div><span className="text-fg-subtle">Contract end:</span> <span className="text-fg">{new Date(profile.contractEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
                  {profile.notes && <div className="col-span-2"><span className="text-fg-subtle">Notes:</span> <span className="text-fg">{profile.notes}</span></div>}
                </div>
              )}

              {isEditing && (
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Contact name" value={form.contactName ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                      className="border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="text" placeholder="Role / title" value={form.role ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      className="border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="text" placeholder="Company" value={form.company ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      className="border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-fg-muted whitespace-nowrap">Contract end:</label>
                      <input type="date" value={form.contractEndDate ? new Date(form.contractEndDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => setForm((f) => ({ ...f, contractEndDate: e.target.value }))}
                        className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-fg-muted">Risk level:</label>
                    {(["green", "amber", "red"] as const).map((r) => (
                      <button key={r} onClick={() => setForm((f) => ({ ...f, riskLevel: r }))}
                        className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${form.riskLevel === r ? `${RISK_COLORS[r]} font-semibold` : "border-border text-fg-muted hover:bg-bg-muted"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Notes (internal only)" value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" rows={2} />
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="bg-primary text-primary-fg px-4 py-1.5 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                    {profileSaving ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
