"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Tag = { id: string; name: string; color: string };
type ProjectTemplate = { id: string; name: string; description: string | null; createdAt: string };

const PRESET_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"tags" | "webhooks" | "templates">("tags");

  // Tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#6366f1");
  const [tagSaving, setTagSaving] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("pending,escalated");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);

  // Project templates
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [ptName, setPtName] = useState("");
  const [ptDesc, setPtDesc] = useState("");
  const [ptSlaHours, setPtSlaHours] = useState("24");
  const [ptSaving, setPtSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setTags(data); });
    fetch("/api/webhooks").then((r) => r.json()).then((data) => {
      if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
      if (data.events) setWebhookEvents(data.events);
      setWebhookEnabled(data.enabled ?? false);
    });
    fetch("/api/project-templates").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setProjectTemplates(data); });
  }, []);

  async function createTag() {
    if (!tagName.trim()) return;
    setTagSaving(true);
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tagName, color: tagColor }) });
    const tag = await res.json();
    setTags((prev) => [...prev.filter((t) => t.id !== tag.id), tag].sort((a, b) => a.name.localeCompare(b.name)));
    setTagName("");
    setTagSaving(false);
  }

  async function deleteTag(id: string) {
    await fetch("/api/tags", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId: id }) });
    setTags((prev) => prev.filter((t) => t.id !== id));
  }

  async function saveWebhook() {
    setWebhookSaving(true);
    await fetch("/api/webhooks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhookUrl, events: webhookEvents, enabled: webhookEnabled }) });
    setWebhookSaving(false);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
  }

  async function createProjectTemplate() {
    if (!ptName.trim()) return;
    setPtSaving(true);
    const res = await fetch("/api/project-templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ptName, description: ptDesc, config: { slaHours: parseInt(ptSlaHours) || 24 } }),
    });
    const pt = await res.json();
    setProjectTemplates((prev) => [pt, ...prev]);
    setPtName(""); setPtDesc(""); setPtSlaHours("24");
    setPtSaving(false);
  }

  async function deleteProjectTemplate(id: string) {
    await fetch("/api/project-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setProjectTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage tags, webhooks, and project templates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["tags", "webhooks", "templates"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-2 rounded-lg transition capitalize ${activeTab === tab ? "bg-white shadow-sm text-slate-800 font-medium" : "text-slate-500 hover:text-slate-700"}`}>
            {tab === "webhooks" ? "Webhooks / Slack" : tab === "templates" ? "Project Templates" : "Tags"}
          </button>
        ))}
      </div>

      {/* Tags tab */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Create Tag</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name"
                onKeyDown={(e) => e.key === "Enter" && createTag()}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-32" />
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setTagColor(c)}
                    className={`w-6 h-6 rounded-full transition ${tagColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : "hover:scale-110"}`}
                    style={{ background: c }} />
                ))}
              </div>
              <button onClick={createTag} disabled={tagSaving || !tagName.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">{tagSaving ? "…" : "Create"}</button>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Existing Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: t.color + "15", borderColor: t.color + "40" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm font-medium" style={{ color: t.color }}>{t.name}</span>
                    <button onClick={() => deleteTag(t.id)} className="text-slate-400 hover:text-red-500 text-xs ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks tab */}
      {activeTab === "webhooks" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Webhook URL</h2>
            <p className="text-xs text-slate-400 mb-3">Send a POST request to this URL when events occur. Works with Slack webhooks, Make, Zapier, etc.</p>
            <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Trigger Events</h2>
            <div className="flex flex-wrap gap-2">
              {["pending", "escalated", "sla_breach"].map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={webhookEvents.includes(ev)}
                    onChange={(e) => {
                      const evts = webhookEvents.split(",").filter(Boolean);
                      setWebhookEvents(e.target.checked ? [...evts, ev].join(",") : evts.filter((x) => x !== ev).join(","));
                    }}
                    className="rounded border-slate-300 text-indigo-600" />
                  <span className="text-sm text-slate-600 capitalize">{ev.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={webhookEnabled} onChange={(e) => setWebhookEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
            <span className="text-sm text-slate-700 font-medium">Enable webhook</span>
          </label>
          <button onClick={saveWebhook} disabled={webhookSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${webhookSaved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:opacity-50`}>
            {webhookSaved ? "✓ Saved" : webhookSaving ? "Saving…" : "Save Webhook"}
          </button>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600 mb-1">Payload format:</p>
            <code className="font-mono">{"{ event, gmailMessageId, projectId, subject, fromEmail }"}</code>
          </div>
        </div>
      )}

      {/* Project Templates tab */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Create Project Template</h2>
            <p className="text-xs text-slate-400">Save a project configuration to reuse when creating new projects.</p>
            <input type="text" value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="Template name (e.g. 'Standard Client')"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="text" value={ptDesc} onChange={(e) => setPtDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Default SLA (hours):</label>
              <input type="number" value={ptSlaHours} onChange={(e) => setPtSlaHours(e.target.value)} min={1} max={168}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <button onClick={createProjectTemplate} disabled={ptSaving || !ptName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {ptSaving ? "Saving…" : "Save Template"}
            </button>
          </div>

          {projectTemplates.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Saved Templates</h2>
              <div className="space-y-2">
                {projectTemplates.map((t) => {
                  const config = (() => { try { return JSON.parse(t.description ?? "{}"); } catch { return {}; } })();
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{t.name}</p>
                        {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                      </div>
                      <button onClick={() => deleteProjectTemplate(t.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200">
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
