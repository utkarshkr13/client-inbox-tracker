"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, RefreshCw, Unlink, CheckCircle2, XCircle, Plus, X, Trash2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Tag = { id: string; name: string; color: string };
type ProjectTemplate = { id: string; name: string; description: string | null; createdAt: string };
type GmailProfile = { connected: boolean; email?: string | null; messagesTotal?: number; error?: string };

const PRESET_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
const TABS = ["account", "tags", "webhooks", "templates", "developer"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  account: "Account",
  tags: "Tags",
  webhooks: "Webhooks / Slack",
  templates: "Project Templates",
  developer: "Developer",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("account");

  // Account / Gmail
  const [gmail, setGmail] = useState<GmailProfile | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

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

  // Developer / QA sandbox
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail/profile").then((r) => r.json()).then(setGmail);
    fetch("/api/tags").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setTags(data); });
    fetch("/api/webhooks").then((r) => r.json()).then((data) => {
      if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
      if (data.events) setWebhookEvents(data.events);
      setWebhookEnabled(data.enabled ?? false);
    });
    fetch("/api/project-templates").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setProjectTemplates(data); });
  }, []);

  async function disconnectGmail() {
    if (!confirm("Disconnect Gmail? Sync will stop until you reconnect.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      setGmail({ connected: false, email: null });
    } finally {
      setDisconnecting(false);
    }
  }

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

  async function seedSandbox() {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/dev-seed", { method: "POST" });
      const data = await res.json();
      setSeedResult(data.ok ? `Created "🧪 QA Sandbox" with ${data.emailCount} sample emails.` : "Failed to seed sandbox.");
    } finally {
      setSeedLoading(false);
    }
  }

  async function deleteSandbox() {
    if (!confirm("Delete the QA Sandbox project and all its test data?")) return;
    setSeedLoading(true);
    setSeedResult(null);
    try {
      await fetch("/api/dev-seed", { method: "DELETE" });
      setSeedResult("QA Sandbox deleted.");
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <p className="text-[11px] font-semibold tracking-widest text-fg-subtle uppercase mt-2 mb-1">Settings</p>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-muted mt-0.5">Account, tags, webhooks, and project templates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-muted rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === tab ? "bg-bg-elev shadow-sm text-fg font-medium" : "text-fg-muted hover:text-fg"}`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Account tab */}
      {activeTab === "account" && (
        <Card key="account" className="p-5 anim-fade-up">
          <h2 className="text-sm font-semibold text-fg mb-1">Gmail connection</h2>
          <p className="text-xs text-fg-muted mb-4">
            Your inbox was connected during sign-in. Reconnect here if syncing stops working, or disconnect to revoke access.
          </p>

          {gmail === null ? (
            <div className="skeleton h-16 rounded-lg" />
          ) : gmail.connected ? (
            <div className="flex items-center justify-between gap-4 bg-success-soft border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{gmail.email}</p>
                  <p className="text-xs text-fg-muted">
                    {gmail.messagesTotal != null ? `${gmail.messagesTotal.toLocaleString()} messages in mailbox` : "Connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => (window.location.href = "/api/gmail/connect")}>
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                </Button>
                <Button variant="ghost" size="sm" loading={disconnecting} onClick={disconnectGmail}>
                  <Unlink className="w-3.5 h-3.5" /> Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-danger-soft border border-danger/20 rounded-lg p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center shrink-0">
                  <XCircle className="w-4.5 h-4.5 text-danger" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">Not connected</p>
                  <p className="text-xs text-fg-muted">Sync is paused until you reconnect Gmail.</p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => (window.location.href = "/api/gmail/connect")}>
                <Mail className="w-3.5 h-3.5" /> Connect Gmail
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Tags tab */}
      {activeTab === "tags" && (
        <div key="tags" className="space-y-4 anim-fade-up">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-fg mb-4">Create tag</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name"
                onKeyDown={(e) => e.key === "Enter" && createTag()}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 flex-1 min-w-32" />
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setTagColor(c)}
                    className={`w-6 h-6 rounded-full transition ${tagColor === c ? "ring-2 ring-offset-2 ring-offset-bg-elev ring-fg-subtle scale-110" : "hover:scale-110"}`}
                    style={{ background: c }} />
                ))}
              </div>
              <Button variant="primary" size="md" loading={tagSaving} disabled={!tagName.trim()} onClick={createTag}>
                <Plus className="w-3.5 h-3.5" /> Create
              </Button>
            </div>
          </Card>

          {tags.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-fg mb-3">Existing tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: t.color + "15", borderColor: t.color + "40" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm font-medium" style={{ color: t.color }}>{t.name}</span>
                    <button onClick={() => deleteTag(t.id)} className="text-fg-subtle hover:text-danger ml-1"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Webhooks tab */}
      {activeTab === "webhooks" && (
        <Card key="webhooks" className="p-5 space-y-4 anim-fade-up">
          <div>
            <h2 className="text-sm font-semibold text-fg mb-1">Webhook URL</h2>
            <p className="text-xs text-fg-muted mb-3">Send a POST request to this URL when events occur. Works with Slack webhooks, Make, Zapier, etc.</p>
            <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg mb-2">Trigger events</h2>
            <div className="flex flex-wrap gap-3">
              {["pending", "escalated", "sla_breach"].map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={webhookEvents.includes(ev)}
                    onChange={(e) => {
                      const evts = webhookEvents.split(",").filter(Boolean);
                      setWebhookEvents(e.target.checked ? [...evts, ev].join(",") : evts.filter((x) => x !== ev).join(","));
                    }}
                    className="rounded border-border text-primary" />
                  <span className="text-sm text-fg-muted capitalize">{ev.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={webhookEnabled} onChange={(e) => setWebhookEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary" />
            <span className="text-sm text-fg font-medium">Enable webhook</span>
          </label>
          <Button variant={webhookSaved ? "success" : "primary"} loading={webhookSaving} onClick={saveWebhook}>
            {webhookSaved ? <>✓ Saved</> : "Save webhook"}
          </Button>
          <div className="bg-bg-muted border border-border rounded-lg p-3 text-xs text-fg-muted">
            <p className="font-medium text-fg mb-1">Payload format:</p>
            <code className="font-mono">{"{ event, gmailMessageId, projectId, subject, fromEmail }"}</code>
          </div>
        </Card>
      )}

      {/* Project Templates tab */}
      {activeTab === "templates" && (
        <div key="templates" className="space-y-4 anim-fade-up">
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-fg">Create project template</h2>
            <p className="text-xs text-fg-muted">Save a project configuration to reuse when creating new projects.</p>
            <input type="text" value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="Template name (e.g. 'Standard Client')"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input type="text" value={ptDesc} onChange={(e) => setPtDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-fg-muted">Default SLA (hours):</label>
              <input type="number" value={ptSlaHours} onChange={(e) => setPtSlaHours(e.target.value)} min={1} max={168}
                className="w-20 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <Button variant="primary" loading={ptSaving} disabled={!ptName.trim()} onClick={createProjectTemplate}>
              Save template
            </Button>
          </Card>

          {projectTemplates.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-fg mb-3">Saved templates</h2>
              <div className="space-y-2">
                {projectTemplates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-bg-muted border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-fg">{t.name}</p>
                      {t.description && <p className="text-xs text-fg-muted mt-0.5">{t.description}</p>}
                    </div>
                    <button onClick={() => deleteProjectTemplate(t.id)} className="text-xs text-danger hover:bg-danger-soft px-2 py-1 rounded-md inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Developer tab */}
      {activeTab === "developer" && (
        <Card key="developer" className="p-5 space-y-4 anim-fade-up">
          <div>
            <h2 className="text-sm font-semibold text-fg mb-1 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> QA Sandbox
            </h2>
            <p className="text-xs text-fg-muted">
              Spin up a fully-populated test project — every status, routing tier, AI category, tag,
              escalation, and follow-up state — so you can click through the whole app without waiting
              on real client emails. Everything it creates is prefixed and easy to tell apart from real
              data, and can be wiped in one click.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="md" loading={seedLoading} onClick={seedSandbox}>
              <FlaskConical className="w-3.5 h-3.5" /> Create / reset QA Sandbox
            </Button>
            <Button variant="ghost" size="md" loading={seedLoading} onClick={deleteSandbox}>
              <Trash2 className="w-3.5 h-3.5" /> Delete QA Sandbox
            </Button>
          </div>
          {seedResult && (
            <div className="bg-success-soft border border-success/20 rounded-lg p-3 text-xs text-success font-medium">
              {seedResult}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
