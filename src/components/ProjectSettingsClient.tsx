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
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

export default function ProjectSettingsClient({
  projectId,
  initialSlaHours,
  clientEmails,
  initialProfiles,
}: {
  projectId: string;
  initialSlaHours: number;
  clientEmails: ClientEmail[];
  initialProfiles: ClientProfile[];
}) {
  const [slaHours, setSlaHours] = useState(initialSlaHours);
  const [slaSaved, setSlaSaved] = useState(false);
  const [slaSaving, setSlaSaving] = useState(false);

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
      {/* SLA Configuration */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-800">SLA Configuration</h2>
        <p className="text-sm text-slate-500">
          Pending emails older than this threshold will show SLA warnings in the email list.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Response deadline:</label>
          <input
            type="number"
            value={slaHours}
            onChange={(e) => setSlaHours(parseInt(e.target.value) || 24)}
            min={1}
            max={168}
            className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-sm text-slate-500">hours</span>
          <button
            onClick={saveSla}
            disabled={slaSaving}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${slaSaved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:opacity-50`}
          >
            {slaSaved ? "✓ Saved" : slaSaving ? "Saving…" : "Save SLA"}
          </button>
        </div>
        <p className="text-xs text-slate-400">Orange warning at 75% · Red breach at 100%</p>
      </div>

      {/* Client CRM Profiles */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Client Profiles (CRM)</h2>
        <p className="text-sm text-slate-500">Add contact details, risk levels, and notes for each client email address.</p>

        {clientEmails.map((ce) => {
          const profile = profiles.find((p) => p.email === ce.email);
          const isEditing = editingEmail === ce.email;
          return (
            <div key={ce.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Profile header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ce.label || ce.email}</p>
                  {ce.label && <p className="text-xs text-slate-400">{ce.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {profile && (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${RISK_COLORS[profile.riskLevel] ?? RISK_COLORS.green}`}>
                      {profile.riskLevel} risk
                    </span>
                  )}
                  <button
                    onClick={() => isEditing ? setEditingEmail(null) : startEditProfile(ce.email)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                  >
                    {isEditing ? "Cancel" : profile ? "Edit" : "Add Details"}
                  </button>
                </div>
              </div>

              {/* Profile summary */}
              {!isEditing && profile && (
                <div className="px-4 py-3 grid grid-cols-2 gap-2 text-xs">
                  {profile.contactName && <div><span className="text-slate-400">Contact:</span> <span className="text-slate-700">{profile.contactName}</span></div>}
                  {profile.role && <div><span className="text-slate-400">Role:</span> <span className="text-slate-700">{profile.role}</span></div>}
                  {profile.company && <div><span className="text-slate-400">Company:</span> <span className="text-slate-700">{profile.company}</span></div>}
                  {profile.contractEndDate && <div><span className="text-slate-400">Contract end:</span> <span className="text-slate-700">{new Date(profile.contractEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
                  {profile.notes && <div className="col-span-2"><span className="text-slate-400">Notes:</span> <span className="text-slate-700">{profile.notes}</span></div>}
                </div>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Contact name" value={form.contactName ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="text" placeholder="Role / title" value={form.role ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="text" placeholder="Company" value={form.company ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 whitespace-nowrap">Contract end:</label>
                      <input type="date" value={form.contractEndDate ? new Date(form.contractEndDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => setForm((f) => ({ ...f, contractEndDate: e.target.value }))}
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Risk level:</label>
                    {(["green", "amber", "red"] as const).map((r) => (
                      <button key={r} onClick={() => setForm((f) => ({ ...f, riskLevel: r }))}
                        className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${form.riskLevel === r ? `${RISK_COLORS[r]} font-semibold` : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Notes (internal only)" value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" rows={2} />
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
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
