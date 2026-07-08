"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Link2, Check, Trash2, CircleCheck, CircleDashed } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  gmailToken: { gmailEmail: string | null; updatedAt: string | Date } | null;
};

export default function TeamMembersManager({
  projectId,
  initialMembers,
}: {
  projectId: string;
  initialMembers: TeamMember[];
}) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ba" | "l2">("l2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/team-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add");
        return;
      }
      setMembers((prev) => [...prev, { ...data, gmailToken: null }]);
      setName("");
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(id: string) {
    if (!confirm("Remove this person from the project?")) return;
    await fetch(`/api/projects/${projectId}/team-members/${id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  function copyConnectLink(id: string) {
    const url = `${window.location.origin}/api/team/gmail-connect?memberId=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <div className="bg-bg-elev border border-border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-fg">Team</h2>
        <p className="text-sm text-fg-muted mt-1">
          Add L2 (or other) team members and share their connect link so emails sent only to
          them — never CC&apos;d to you — still show up here instead of getting missed.
        </p>
      </div>

      {members.length > 0 && (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg truncate">{m.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded border border-border uppercase text-fg-muted">{m.role}</span>
                </div>
                <p className="text-xs text-fg-subtle truncate">{m.email}</p>
                <p className="text-xs mt-0.5 flex items-center gap-1">
                  {m.gmailToken ? (
                    <span className="text-success flex items-center gap-1">
                      <CircleCheck className="w-3 h-3" /> Gmail connected
                      {m.gmailToken.gmailEmail && m.gmailToken.gmailEmail !== m.email ? ` (${m.gmailToken.gmailEmail})` : ""}
                    </span>
                  ) : (
                    <span className="text-fg-subtle flex items-center gap-1">
                      <CircleDashed className="w-3 h-3" /> Not connected yet
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!m.gmailToken && (
                  <button
                    onClick={() => copyConnectLink(m.id)}
                    title="Copy connect link to send them"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-muted transition inline-flex items-center gap-1"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copiedId === m.id ? "Copied" : "Copy link"}
                  </button>
                )}
                <button
                  onClick={() => removeMember(m.id)}
                  title="Remove"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-fg-subtle hover:text-danger hover:bg-danger-soft transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addMember} className="flex items-end gap-2 flex-wrap pt-1">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-fg-muted mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full text-sm bg-bg border border-border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-fg-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className="w-full text-sm bg-bg border border-border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs text-fg-muted mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ba" | "l2")}
            className="text-sm bg-bg border border-border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="l2">L2</option>
            <option value="ba">BA</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="bg-primary text-primary-fg px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
