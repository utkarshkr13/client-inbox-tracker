"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Template = { id: string; name: string; category: string; body: string; projectId: string | null; createdAt: string };

const CATEGORIES = ["General", "Billing", "Bug", "Feature", "Meeting", "Approval", "Update"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setTemplates(data); setLoading(false); });
  }, []);

  async function saveTemplate() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch("/api/templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, name, body, category }) });
        setTemplates((prev) => prev.map((t) => t.id === editId ? { ...t, name, body, category } : t));
      } else {
        const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, body, category }) });
        const created = await res.json();
        setTemplates((prev) => [created, ...prev]);
      }
      setName(""); setBody(""); setCategory("General"); setShowForm(false); setEditId(null);
    } finally { setSaving(false); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(t: Template) {
    setEditId(t.id); setName(t.name); setBody(t.body); setCategory(t.category); setShowForm(true);
  }

  function copy(t: Template) {
    navigator.clipboard.writeText(t.body);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-fg mt-1">Response Templates</h1>
          <p className="text-sm text-fg-subtle mt-0.5">Pre-built replies for common queries. Click any template to copy to clipboard.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setName(""); setBody(""); setCategory("General"); }}
          className="bg-primary text-primary-fg px-4 py-2 rounded-xl hover:bg-primary/90 text-sm font-medium transition">
          + New Template
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-elev border border-primary/25 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-fg">{editId ? "Edit Template" : "New Template"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-bg-elev">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Template body (will be copied to clipboard)"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" rows={5} />
          <div className="flex gap-2">
            <button onClick={saveTemplate} disabled={saving || !name.trim() || !body.trim()}
              className="bg-primary text-primary-fg px-4 py-2 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-sm text-fg-muted hover:text-fg px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      {loading && <div className="text-fg-subtle text-sm">Loading templates…</div>}

      {!loading && templates.length === 0 && !showForm && (
        <div className="text-center py-16 text-fg-subtle">
          <p className="text-sm">No templates yet.</p>
          <p className="text-xs mt-1">Create your first template to speed up L2 responses.</p>
        </div>
      )}

      {/* Templates grouped by category */}
      {CATEGORIES.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="text-xs font-semibold text-fg-subtle uppercase tracking-wide mb-2">{cat}</h2>
            <div className="space-y-2">
              {catTemplates.map((t) => (
                <div key={t.id} className="bg-bg-elev border border-border rounded-xl p-4 group hover:border-primary/25 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg text-sm">{t.name}</p>
                      <p className="text-xs text-fg-muted mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => copy(t)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${copiedId === t.id ? "bg-success-soft text-success border-success/25" : "border-border text-fg-muted hover:bg-primary-soft hover:border-primary/25 hover:text-primary"}`}>
                        {copiedId === t.id ? "✓ Copied" : "Copy"}
                      </button>
                      <button onClick={() => startEdit(t)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-muted">Edit</button>
                      <button onClick={() => deleteTemplate(t.id)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-danger hover:bg-danger-soft hover:border-danger/25">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
