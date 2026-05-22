"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClientEmail = {
  id: string;
  email: string;
  label: string | null;
};

export default function ClientEmailManager({
  projectId,
  clientEmails,
}: {
  projectId: string;
  clientEmails: ClientEmail[];
}) {
  const [emails, setEmails] = useState<ClientEmail[]>(clientEmails);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/client-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add");
        return;
      }
      setEmails((prev) => [...prev, data]);
      setEmail("");
      setLabel("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeEmail(id: string) {
    await fetch(`/api/projects/${projectId}/client-emails/${id}`, { method: "DELETE" });
    setEmails((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={addEmail} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Add Client Email</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Zydus — Rahul"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? "Adding..." : "Add Email"}
        </button>
      </form>

      {/* Existing emails */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">
            Client Emails ({emails.length})
          </h2>
        </div>
        {emails.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No emails added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {emails.map((ce) => (
              <li key={ce.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ce.email}</p>
                  {ce.label && <p className="text-xs text-gray-400 mt-0.5">{ce.label}</p>}
                </div>
                <button
                  onClick={() => removeEmail(ce.id)}
                  className="text-gray-300 hover:text-red-500 transition text-xl leading-none ml-4"
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
