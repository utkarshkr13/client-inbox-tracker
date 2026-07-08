"use client";

import { useState, useEffect } from "react";

type Tag = { id: string; name: string; color: string };
type Note = { id: string; content: string; createdAt: string | Date; userId: string };
type AuditLog = { id: string; action: string; fromValue: string | null; toValue: string | null; note: string | null; createdAt: string | Date };

type EmailStatus = {
  id: string;
  gmailMessageId: string;
  threadId?: string | null;
  projectId: string;
  status: string;
  routingTier?: string;
  aiCategory?: string | null;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  snippet: string | null;
  hasAttachments?: boolean;
  toEmails?: string | null;
  ccEmails?: string | null;
  seenVia?: string | null;
  receivedAt: Date | string | null;
  followUpAt?: Date | string | null;
  escalationNote?: string | null;
  notes?: Note[];
  emailTags?: { tag: Tag }[];
};

type ClientEmail = { id: string; email: string; label: string | null };
type TeamMember = { id: string; name: string; email: string; role: string; gmailToken: { gmailEmail: string | null } | null };

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M2 6C2 4.895 2.895 4 4 4H20C21.105 4 22 4.895 22 6V18C22 19.105 21.105 20 20 20H4C2.895 20 2 19.105 2 18V6Z" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
      <path d="M2 6L12 13L22 6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Billing: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Bug: "bg-danger-soft text-danger border-danger/25",
  Feature: "bg-blue-100 text-blue-700 border-blue-200",
  Meeting: "bg-purple-100 text-purple-700 border-purple-200",
  Approval: "bg-indigo-100 text-primary border-primary/25",
  Update: "bg-teal-100 text-teal-700 border-teal-200",
  General: "bg-bg-muted text-fg-muted border-border",
};

function SlaIndicator({ receivedAt, thresholdHours, routingTier }: {
  receivedAt: Date | string | null;
  thresholdHours: number;
  routingTier?: string;
}) {
  if (!receivedAt) return null;
  const hoursAgo = (Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < thresholdHours * 0.75) return null;
  const breached = hoursAgo >= thresholdHours;
  const isL2 = routingTier === "l2";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${breached ? "bg-danger-soft text-danger border-danger/25" : "bg-warning-soft text-warning border-warning/25"}`}>
      {breached
        ? (isL2 ? "🔴 L2 SLA breach — BA to step in" : "⚠ SLA breached")
        : (isL2 ? "⏱ L2 SLA due soon" : "⏱ SLA due soon")}
    </span>
  );
}

// Show a compact To/CC context pill so the BA can instantly see who was addressed
function ToCcPill({ toEmails, ccEmails }: { toEmails?: string | null; ccEmails?: string | null }) {
  if (!toEmails && !ccEmails) return null;
  const toList = (toEmails ?? "").split(",").filter(Boolean);
  const ccList = (ccEmails ?? "").split(",").filter(Boolean);
  if (toList.length === 0 && ccList.length === 0) return null;
  // Show only the first address from each field, truncated
  const toLabel = toList[0] ? toList[0].split("@")[0] : null;
  const ccLabel = ccList[0] ? ccList[0].split("@")[0] : null;
  return (
    <span className="text-xs text-fg-subtle border border-border rounded px-1.5 py-0.5 bg-bg-muted" title={`To: ${toList.join(", ")}${ccList.length ? `  CC: ${ccList.join(", ")}` : ""}`}>
      {toLabel && <>To: <span className="font-medium text-fg-muted">{toLabel}</span></>}
      {toList.length > 1 && ` +${toList.length - 1}`}
      {ccLabel && <>{toLabel ? "  " : ""}CC: <span className="font-medium text-fg-muted">{ccLabel}</span></>}
      {ccList.length > 1 && ` +${ccList.length - 1}`}
    </span>
  );
}

function EmailRow({
  email, projectId, onStatusChange, slaThresholdHours, allTags, selected, onSelect,
}: {
  email: EmailStatus;
  projectId: string;
  onStatusChange: (id: string, updates: Partial<EmailStatus>) => void;
  slaThresholdHours: number;
  allTags: Tag[];
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [localNotes, setLocalNotes] = useState<Note[]>(email.notes ?? []);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; body: string; category: string }[]>([]);
  const [followUpInput, setFollowUpInput] = useState(email.followUpAt ? new Date(email.followUpAt).toISOString().slice(0, 10) : "");
  const [escalationNote, setEscalationNote] = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPending = email.status === "pending";
  const isDone = email.status === "done";
  const isDismissed = email.status === "dismissed";
  const isEscalated = email.status === "escalated";
  const emailTags = email.emailTags?.map((et) => et.tag) ?? [];
  const isFollowUpDue = email.followUpAt && new Date(email.followUpAt) <= new Date();

  async function setStatus(status: string, extra?: Record<string, unknown>) {
    setStatusLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/emails`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailMessageId: email.gmailMessageId, status, ...extra }),
      });
      onStatusChange(email.gmailMessageId, { status, ...extra });
    } finally { setStatusLoading(false); }
  }

  async function setRouting(routingTier: string) {
    await fetch(`/api/projects/${projectId}/emails`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmailMessageId: email.gmailMessageId, routingTier }),
    });
    onStatusChange(email.gmailMessageId, { routingTier });
  }

  async function toggleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!fullBody) {
      setBodyLoading(true);
      try {
        const res = await fetch(`/api/gmail/message/${email.gmailMessageId}`);
        const data = await res.json();
        setFullBody(data.body ?? data.error ?? "(no content)");
      } catch { setFullBody("Failed to load."); }
      finally { setBodyLoading(false); }
    }
  }

  async function saveNote() {
    if (!noteInput.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailStatusId: email.id, content: noteInput }),
      });
      const note = await res.json();
      setLocalNotes((prev) => [...prev, note]);
      setNoteInput("");
    } finally { setNoteSaving(false); }
  }

  async function loadAudit() {
    const res = await fetch(`/api/projects/${projectId}/audit?emailStatusId=${email.id}`);
    setAuditLogs(await res.json());
    setShowAudit(true);
  }

  async function loadTemplates() {
    const res = await fetch(`/api/templates?projectId=${projectId}`);
    setTemplates(await res.json());
    setShowTemplates(true);
  }

  async function toggleTag(tagId: string, hasTag: boolean) {
    await fetch(`/api/projects/${projectId}/email-tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailStatusId: email.id, tagId, remove: hasTag }),
    });
    onStatusChange(email.gmailMessageId, {
      emailTags: hasTag
        ? (email.emailTags ?? []).filter((et) => et.tag.id !== tagId)
        : [...(email.emailTags ?? []), { tag: allTags.find((t) => t.id === tagId)! }],
    });
  }

  async function saveFollowUp() {
    await fetch(`/api/projects/${projectId}/emails`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmailMessageId: email.gmailMessageId, followUpAt: followUpInput || null }),
    });
    onStatusChange(email.gmailMessageId, { followUpAt: followUpInput ? new Date(followUpInput) : null });
  }

  async function submitEscalation() {
    await setStatus("escalated", { escalationNote });
    onStatusChange(email.gmailMessageId, { escalationNote });
    setShowEscalateModal(false);
    setEscalationNote("");
  }

  function closeAll() { setShowNotes(false); setShowAudit(false); setShowTagPicker(false); setShowTemplates(false); }

  return (
    <div className={`border-b border-border last:border-0 ${isDismissed ? "opacity-40" : ""} ${isEscalated ? "bg-danger-soft/30" : ""}`}>
      <div className="flex items-start gap-2 p-3 hover:bg-bg-muted/60 transition">
        <input type="checkbox" className="mt-1.5 flex-shrink-0 w-3.5 h-3.5 rounded border-border-strong text-primary cursor-pointer"
          checked={selected} onChange={(e) => onSelect(email.gmailMessageId, e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <div className="mt-1.5 flex-shrink-0 cursor-pointer" onClick={toggleExpand}>
          {isPending && <span className="inline-block w-2 h-2 rounded-full bg-warning" />}
          {isDone && <span className="inline-block w-2 h-2 rounded-full bg-success" />}
          {isDismissed && <span className="inline-block w-2 h-2 rounded-full bg-border-strong" />}
          {isEscalated && <span className="inline-block w-2 h-2 rounded-full bg-danger" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-fg text-sm truncate">{email.fromName || email.fromEmail}</span>
            {email.fromName && <span className="text-xs text-fg-subtle truncate">{email.fromEmail}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${email.routingTier === "l2" ? "bg-warning-soft text-warning border-warning/25" : "bg-primary-soft text-primary border-primary/25"}`}>
              {email.routingTier === "l2" ? "L2" : "BA"}
            </span>
            {email.aiCategory && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[email.aiCategory] ?? CATEGORY_COLORS.General}`}>
                {email.aiCategory}
              </span>
            )}
            {isEscalated && <span className="text-xs px-1.5 py-0.5 rounded border bg-danger-soft text-danger border-danger/25">🔺 Escalated</span>}
            {email.hasAttachments && <span className="text-xs text-fg-subtle" title="Has attachments">📎</span>}
            {isFollowUpDue && <span className="text-xs px-1.5 py-0.5 rounded bg-warning-soft text-warning border border-warning/25">⏰ Follow-up due</span>}
          </div>
          <p className={`text-sm text-fg mt-0.5 font-medium ${expanded ? "" : "truncate"}`}>{email.subject || "(no subject)"}</p>
          {!expanded && email.snippet && <p className="text-xs text-fg-subtle mt-0.5 truncate">{email.snippet}</p>}
          {emailTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {emailTags.map((t) => (
                <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ background: t.color + "20", color: t.color, borderColor: t.color + "40" }}>{t.name}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-fg-subtle">{formatDate(email.receivedAt)}</p>
            <ToCcPill toEmails={email.toEmails} ccEmails={email.ccEmails} />
            {isPending && <SlaIndicator receivedAt={email.receivedAt} thresholdHours={slaThresholdHours} routingTier={email.routingTier} />}
          </div>
        </div>
        <svg className={`w-3.5 h-3.5 text-fg-subtle flex-shrink-0 mt-1.5 cursor-pointer transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={toggleExpand}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setStatus("done")} disabled={statusLoading || isDone} title="Mark done"
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isDone ? "bg-success-soft border-success/40 text-success" : "border-border hover:bg-success-soft hover:text-success text-fg-subtle"}`}>✓</button>
          <button onClick={() => setStatus(isPending ? "dismissed" : "pending")} disabled={statusLoading} title={isPending ? "Dismiss" : "Mark pending"}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isDismissed ? "bg-bg-muted border-border-strong text-fg-muted" : "border-border hover:bg-danger-soft hover:text-danger text-fg-subtle"}`}>✕</button>
          <button onClick={() => setShowEscalateModal(true)} disabled={isEscalated} title="Escalate"
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isEscalated ? "bg-danger-soft border-danger/25 text-danger" : "border-border hover:bg-danger-soft hover:text-danger text-fg-subtle"}`}>🔺</button>
          <a href={`https://mail.google.com/mail/u/0/#all/${email.gmailMessageId}`} target="_blank" rel="noopener noreferrer" title="Open in Gmail"
            className="w-7 h-7 rounded-full flex items-center justify-center transition border border-border hover:border-danger/40 hover:bg-danger-soft" onClick={(e) => e.stopPropagation()}>
            <GmailIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {showEscalateModal && (
        <div className="px-4 pb-3 ml-12 bg-danger-soft/60 border-t border-danger/20">
          <p className="text-xs font-medium text-danger mt-2 mb-1">Escalation note (BA visibility)</p>
          <textarea value={escalationNote} onChange={(e) => setEscalationNote(e.target.value)}
            placeholder="Why are you escalating?" className="w-full text-xs border border-danger/25 rounded-lg p-2 focus:outline-none resize-none" rows={2} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={submitEscalation} className="text-xs bg-danger text-white px-3 py-1.5 rounded-lg hover:bg-danger/90">Escalate to BA</button>
            <button onClick={() => setShowEscalateModal(false)} className="text-xs text-fg-muted">Cancel</button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 ml-10">
          <div className="flex items-center gap-2 mt-2 mb-2 flex-wrap">
            <button onClick={() => setRouting(email.routingTier === "l2" ? "ba" : "l2")}
              className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-bg-muted text-fg-muted">
              Route to {email.routingTier === "l2" ? "BA" : "L2"}
            </button>
            <button onClick={() => { closeAll(); setShowNotes(!showNotes); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showNotes ? "bg-primary text-white border-primary" : "border-border text-fg-muted hover:bg-bg-muted"}`}>
              📝 Notes{localNotes.length > 0 ? ` (${localNotes.length})` : ""}
            </button>
            <button onClick={() => { closeAll(); setShowTagPicker(!showTagPicker); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showTagPicker ? "bg-primary text-white border-primary" : "border-border text-fg-muted hover:bg-bg-muted"}`}>
              🏷 Tags
            </button>
            <button onClick={() => { closeAll(); loadTemplates(); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showTemplates ? "bg-primary text-white border-primary" : "border-border text-fg-muted hover:bg-bg-muted"}`}>
              📋 Templates
            </button>
            <button onClick={() => { closeAll(); loadAudit(); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showAudit ? "bg-primary text-white border-primary" : "border-border text-fg-muted hover:bg-bg-muted"}`}>
              🕵 Audit
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-fg-muted">Follow-up:</span>
              <input type="date" value={followUpInput} onChange={(e) => setFollowUpInput(e.target.value)}
                className="text-xs border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <button onClick={saveFollowUp} className="text-xs bg-primary text-primary-fg px-2 py-0.5 rounded hover:bg-primary/90">Set</button>
            </div>
          </div>

          {showNotes && (
            <div className="bg-warning-soft border border-warning/25 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-warning mb-2">Internal Notes (never sent to client)</p>
              {localNotes.length === 0 ? <p className="text-xs text-warning italic mb-2">No notes yet.</p> : (
                <div className="space-y-1.5 mb-2">
                  {localNotes.map((n) => (
                    <div key={n.id} className="bg-bg-elev border border-warning/25 rounded-lg p-2">
                      <p className="text-xs text-fg">{n.content}</p>
                      <p className="text-xs text-warning mt-0.5">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add a note…"
                  onKeyDown={(e) => e.key === "Enter" && saveNote()}
                  className="flex-1 text-xs border border-warning/25 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-warning/50 bg-bg-elev" />
                <button onClick={saveNote} disabled={noteSaving || !noteInput.trim()}
                  className="text-xs bg-warning text-white px-3 py-1.5 rounded-lg hover:bg-warning/90 disabled:opacity-50">Add</button>
              </div>
            </div>
          )}

          {showTagPicker && (
            <div className="bg-bg-elev border border-border rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-fg mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const hasTag = emailTags.some((t) => t.id === tag.id);
                  return (
                    <button key={tag.id} onClick={() => toggleTag(tag.id, hasTag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${hasTag ? "font-semibold" : "opacity-60"}`}
                      style={{ background: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}>
                      {hasTag ? "✓ " : ""}{tag.name}
                    </button>
                  );
                })}
                {allTags.length === 0 && <p className="text-xs text-fg-subtle italic">No tags. Create them in Settings → Tags.</p>}
              </div>
            </div>
          )}

          {showTemplates && (
            <div className="bg-bg-elev border border-border rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-fg mb-2">Response Templates — click to copy</p>
              {templates.length === 0 ? <p className="text-xs text-fg-subtle italic">No templates. Create them in the Templates page.</p> : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => { navigator.clipboard.writeText(t.body); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="w-full text-left bg-bg-muted border border-border rounded-lg p-2.5 hover:bg-primary-soft hover:border-primary/25 transition group">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium text-fg group-hover:text-primary">{t.name}</span>
                        <span className="text-xs text-fg-subtle">{t.category}</span>
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5 truncate">{t.body}</p>
                    </button>
                  ))}
                  {copied && <p className="text-xs text-success font-medium">✓ Copied to clipboard!</p>}
                </div>
              )}
            </div>
          )}

          {showAudit && (
            <div className="bg-bg-elev border border-border rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-fg mb-2">Activity Log</p>
              {auditLogs.length === 0 ? <p className="text-xs text-fg-subtle italic">No activity yet.</p> : (
                <div className="space-y-1.5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-xs text-fg-subtle mt-0.5">•</span>
                      <div>
                        <span className="text-xs text-fg-muted">
                          {log.action === "status_change" && `Status: ${log.fromValue} → ${log.toValue}`}
                          {log.action === "routed" && `Routed: ${log.fromValue} → ${log.toValue}`}
                          {log.action === "escalated" && "Escalated to BA"}
                          {log.action === "note_added" && "Note added"}
                          {log.action === "tag_added" && "Tag applied"}
                          {log.action === "follow_up_set" && `Follow-up set for ${log.toValue}`}
                        </span>
                        {log.note && <p className="text-xs text-fg-subtle italic">"{log.note}"</p>}
                        <p className="text-xs text-fg-subtle">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-bg-muted border border-border rounded-xl p-4 mt-1">
            {bodyLoading ? (
              <div className="flex items-center gap-2 text-xs text-fg-subtle">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Loading email…
              </div>
            ) : (
              <>
                {email.escalationNote && (
                  <div className="bg-danger-soft border border-danger/25 rounded-lg p-2 mb-3 text-xs text-danger">
                    🔺 <strong>Escalation note:</strong> {email.escalationNote}
                  </div>
                )}
                <pre className="text-xs text-fg whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">{fullBody}</pre>
                <div className="mt-3 pt-3 border-t border-border flex justify-end">
                  <a href={`https://mail.google.com/mail/u/0/#all/${email.gmailMessageId}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#EA4335] hover:bg-[#c8362a] px-3 py-1.5 rounded-lg transition">
                    <GmailIcon className="w-3.5 h-3.5 brightness-0 invert" />
                    Open in Gmail
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailList({
  emailStatuses,
  clientEmails,
  projectId,
  slaThresholdHours = 24,
  teamMembers = [],
  baEmail = null,
}: {
  emailStatuses: EmailStatus[];
  clientEmails: ClientEmail[];
  projectId: string;
  slaThresholdHours?: number;
  teamMembers?: TeamMember[];
  baEmail?: string | null;
}) {
  const [statuses, setStatuses] = useState<EmailStatus[]>(emailStatuses);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "dismissed" | "escalated">("all");
  const [routingFilter, setRoutingFilter] = useState<"all" | "ba" | "l2">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // Default to showing full history — a 7-day default silently hid months
  // of backlog behind a filter with no indication anything was hidden.
  const [fromDate, setFromDate] = useState("");
  const [personFilter, setPersonFilter] = useState<{ type: "seenVia" | "fromEmail"; value: string; label: string } | null>(null);
  const [viewMode, setViewMode] = useState<"sender" | "thread" | "category">("sender");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setAllTags(data); });
  }, []);

  function handleStatusChange(gmailMessageId: string, updates: Partial<EmailStatus>) {
    setStatuses((prev) => prev.map((e) => e.gmailMessageId === gmailMessageId ? { ...e, ...updates } : e));
  }
  function handleSelect(gmailMessageId: string, checked: boolean) {
    setSelected((prev) => { const n = new Set(prev); if (checked) n.add(gmailMessageId); else n.delete(gmailMessageId); return n; });
  }

  const dateFiltered = statuses.filter((e) => !fromDate || !e.receivedAt ? true : new Date(e.receivedAt) >= new Date(fromDate));
  const personFiltered = !personFilter ? dateFiltered : dateFiltered.filter((e) =>
    personFilter.type === "seenVia"
      ? (e.seenVia ?? "").toLowerCase() === personFilter.value.toLowerCase()
      : (e.fromEmail ?? "").toLowerCase() === personFilter.value.toLowerCase()
  );
  const searchFiltered = searchQ ? personFiltered.filter((e) => {
    const q = searchQ.toLowerCase();
    return e.subject?.toLowerCase().includes(q) || e.snippet?.toLowerCase().includes(q) || e.fromEmail?.toLowerCase().includes(q) || e.fromName?.toLowerCase().includes(q);
  }) : dateFiltered;
  const routingFiltered = routingFilter === "all" ? searchFiltered : searchFiltered.filter((e) => e.routingTier === routingFilter);
  const categoryFiltered = categoryFilter === "all" ? routingFiltered : routingFiltered.filter((e) => e.aiCategory === categoryFilter);
  const filtered = filter === "all" ? categoryFiltered : categoryFiltered.filter((e) => e.status === filter);

  function groupBy(key: (e: EmailStatus) => string) {
    const map: Record<string, EmailStatus[]> = {};
    for (const e of filtered) { const k = key(e); if (!map[k]) map[k] = []; map[k].push(e); }
    return map;
  }
  const grouped = viewMode === "sender"
    ? groupBy((e) => (e.fromEmail ?? "unknown").toLowerCase())
    : viewMode === "thread"
    ? groupBy((e) => e.threadId ?? e.gmailMessageId)
    : groupBy((e) => e.aiCategory ?? "General");

  const pendingCount = dateFiltered.filter((e) => e.status === "pending").length;
  const doneCount = dateFiltered.filter((e) => e.status === "done").length;
  const dismissedCount = dateFiltered.filter((e) => e.status === "dismissed").length;
  const escalatedCount = dateFiltered.filter((e) => e.status === "escalated").length;
  const totalCount = dateFiltered.length;
  const l2Count = dateFiltered.filter((e) => e.routingTier === "l2").length;
  const baCount = dateFiltered.filter((e) => e.routingTier === "ba").length;
  const categories = Array.from(new Set(dateFiltered.map((e) => e.aiCategory).filter(Boolean))) as string[];

  // Legacy rows synced before multi-account ingestion existed have no
  // seenVia — they all came through the BA's mailbox, so treat a blank
  // seenVia as "BA" rather than showing them as invisible/unaccounted for.
  const teamStats = [
    ...(baEmail ? [{
      id: "__ba__",
      name: "You (BA)",
      role: "ba",
      matchEmail: baEmail,
      connected: true,
      pending: dateFiltered.filter((e) => {
        const via = (e.seenVia ?? "").toLowerCase();
        return (via === baEmail.toLowerCase() || !via) && e.status === "pending";
      }).length,
    }] : []),
    ...teamMembers.map((tm) => {
      const matchEmail = tm.gmailToken?.gmailEmail ?? tm.email;
      return {
        id: tm.id,
        name: tm.name,
        role: tm.role,
        matchEmail,
        connected: !!tm.gmailToken,
        pending: dateFiltered.filter((e) => (e.seenVia ?? "").toLowerCase() === matchEmail.toLowerCase() && e.status === "pending").length,
      };
    }),
  ];

  const clientStats = clientEmails.map((ce) => {
    const ceEmails = dateFiltered.filter((e) => (e.fromEmail ?? "").toLowerCase() === ce.email.toLowerCase());
    const latest = [...ceEmails].sort((a, b) => new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime())[0];
    return { ...ce, total: ceEmails.length, latest: latest?.receivedAt ?? null, pending: ceEmails.filter((e) => e.status === "pending").length };
  });

  async function bulkAction(action: string, value?: string) {
    if (selected.size === 0) return;
    setBulkActionLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/emails`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, gmailMessageIds: Array.from(selected), ...(action === "status" ? { status: value } : {}), ...(action === "route" ? { routingTier: value } : {}) }),
      });
      if (action === "status") setStatuses((prev) => prev.map((e) => selected.has(e.gmailMessageId) ? { ...e, status: value! } : e));
      if (action === "route") setStatuses((prev) => prev.map((e) => selected.has(e.gmailMessageId) ? { ...e, routingTier: value! } : e));
      setSelected(new Set());
    } finally { setBulkActionLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total", value: totalCount, cls: "bg-bg-elev border-border text-fg" },
          { label: "Pending", value: pendingCount, cls: "bg-warning-soft border-warning/20 text-warning" },
          { label: "Done", value: doneCount, cls: "bg-success-soft border-success/20 text-success" },
          { label: "Dismissed", value: dismissedCount, cls: "bg-bg-muted border-border text-fg-subtle" },
          { label: "Escalated", value: escalatedCount, cls: "bg-danger-soft border-danger/20 text-danger" },
          { label: "L2 Queue", value: l2Count, cls: "bg-warning-soft border-warning/20 text-warning" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* BA/L2 routing strip */}
      <div className="bg-bg-elev border border-border rounded-xl p-3 flex items-center gap-3 flex-wrap text-xs">
        <span className="font-semibold text-fg-muted">Queue routing:</span>
        <span className="px-2.5 py-1 bg-primary-soft text-primary border border-primary/25 rounded-full">{baCount} BA</span>
        <span className="px-2.5 py-1 bg-warning-soft text-warning border border-warning/25 rounded-full">{l2Count} L2</span>
        <span className="text-fg-subtle ml-auto">BA has full visibility of all emails incl. L2 queue</span>
      </div>

      {/* People — tap a team member or client to see just their queue.
          Team members are filtered by which mailbox actually ingested the
          email (seenVia), so multiple L2s each show their own real inbox
          instead of a shared "l2" bucket. */}
      {(teamStats.length > 0 || clientStats.length > 0) && (
        <div className="space-y-2">
          {teamStats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teamStats.map((tm) => {
                const active = personFilter?.type === "seenVia" && personFilter.value.toLowerCase() === tm.matchEmail.toLowerCase();
                return (
                  <button
                    key={tm.id}
                    onClick={() => setPersonFilter(active ? null : { type: "seenVia", value: tm.matchEmail, label: tm.name })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition text-left ${active ? "border-primary bg-primary-soft" : "border-border bg-bg-elev hover:border-primary/40"}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.role === "ba" ? "bg-primary-soft" : "bg-warning-soft"}`}>
                      <span className={`font-bold text-[10px] ${tm.role === "ba" ? "text-primary" : "text-warning"}`}>{tm.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">{tm.name} <span className="font-normal text-fg-subtle uppercase">· {tm.role}</span></p>
                      <p className="text-[11px] text-fg-subtle truncate">
                        {tm.connected ? `${tm.pending} pending` : "not connected"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {clientStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {clientStats.map((cs) => {
                const active = personFilter?.type === "fromEmail" && personFilter.value.toLowerCase() === cs.email.toLowerCase();
                return (
                  <button
                    key={cs.id}
                    onClick={() => setPersonFilter(active ? null : { type: "fromEmail", value: cs.email, label: cs.label || cs.email })}
                    className={`bg-bg-elev border rounded-xl p-4 flex items-center gap-3 text-left transition ${active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">{(cs.label || cs.email).slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{cs.label || cs.email}</p>
                      <p className="text-xs text-fg-subtle truncate">{cs.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium text-primary">{cs.total} email{cs.total !== 1 ? "s" : ""}</span>
                        {cs.pending > 0 && <span className="text-xs text-warning">{cs.pending} pending</span>}
                        {cs.latest && <span className="text-xs text-fg-subtle">Last: {formatDate(cs.latest)}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {personFilter && (
            <button onClick={() => setPersonFilter(null)} className="text-xs text-primary hover:underline">
              Clear filter — showing only {personFilter.label}
            </button>
          )}
        </div>
      )}

      {/* Filter bar row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search emails…"
          className="text-xs bg-bg-elev border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 w-44" />
        <div className="flex items-center gap-1">
          <label className="text-xs text-fg-muted">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="text-xs bg-bg-elev border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {fromDate && (
            <button onClick={() => setFromDate("")} className="text-xs text-primary hover:underline">Clear</button>
          )}
        </div>
        {fromDate && statuses.length > dateFiltered.length && (
          <span className="text-xs text-fg-subtle italic">
            {statuses.length - dateFiltered.length} older email{statuses.length - dateFiltered.length !== 1 ? "s" : ""} hidden by date filter
          </span>
        )}
        <div className="flex items-center gap-0.5 bg-bg-muted rounded-lg p-0.5 ml-auto">
          {(["sender", "thread", "category"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`text-xs px-2 py-1 rounded-md transition ${viewMode === m ? "bg-bg-elev shadow-sm text-fg" : "text-fg-muted"}`}>
              {m === "sender" ? "Client" : m === "thread" ? "Thread" : "Category"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar row 2 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "pending", "done", "dismissed", "escalated"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition capitalize ${filter === f ? "bg-primary text-white" : "bg-bg-elev border border-border text-fg-muted hover:bg-bg-muted"}`}>
            {f}{f === "pending" && pendingCount > 0 && <span className="ml-1 bg-warning text-white text-xs rounded-full px-1.5">{pendingCount}</span>}
            {f === "escalated" && escalatedCount > 0 && <span className="ml-1 bg-danger text-white text-xs rounded-full px-1.5">{escalatedCount}</span>}
          </button>
        ))}
        <span className="text-xs text-fg-subtle mx-1">|</span>
        {(["all", "ba", "l2"] as const).map((r) => (
          <button key={r} onClick={() => setRoutingFilter(r)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition uppercase ${routingFilter === r ? "bg-primary text-white" : "bg-bg-elev border border-border text-fg-muted hover:bg-bg-muted"}`}>
            {r === "all" ? "All Routes" : r}
          </button>
        ))}
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none bg-bg-elev ml-1">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-primary-soft border border-primary/25 rounded-xl p-3 flex-wrap">
          <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
          <button onClick={() => bulkAction("status", "done")} disabled={bulkActionLoading} className="text-xs bg-success text-white px-3 py-1.5 rounded-lg hover:bg-success/90">✓ Done</button>
          <button onClick={() => bulkAction("status", "dismissed")} disabled={bulkActionLoading} className="text-xs bg-fg-muted text-bg px-3 py-1.5 rounded-lg hover:bg-fg/90">Dismiss</button>
          <button onClick={() => bulkAction("status", "pending")} disabled={bulkActionLoading} className="text-xs bg-warning text-white px-3 py-1.5 rounded-lg hover:bg-warning/90">Pending</button>
          <button onClick={() => bulkAction("route", "l2")} disabled={bulkActionLoading} className="text-xs bg-warning-soft text-warning border border-warning/25 px-3 py-1.5 rounded-lg hover:bg-warning-soft">→ L2</button>
          <button onClick={() => bulkAction("route", "ba")} disabled={bulkActionLoading} className="text-xs bg-primary-soft text-primary border border-primary/25 px-3 py-1.5 rounded-lg hover:bg-primary-soft">→ BA</button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-fg-muted hover:text-fg ml-auto">✕ Clear</button>
        </div>
      )}
      {filtered.length > 0 && selected.size === 0 && (
        <button onClick={() => setSelected(new Set(filtered.map((e) => e.gmailMessageId)))} className="text-xs text-fg-subtle hover:text-primary">
          Select all {filtered.length}
        </button>
      )}

      {/* Email groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-fg-subtle text-sm">
          {searchQ ? `No results for "${searchQ}".` : filter === "all" ? (fromDate ? `No emails from ${new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} onwards.` : "No emails synced yet.") : `No ${filter} emails.`}
        </div>
      ) : (
        Object.entries(grouped).map(([groupKey, emails]) => {
          const clientEmail = clientEmails.find((ce) => ce.email.toLowerCase() === groupKey);
          const label = viewMode === "sender" ? (clientEmail?.label || groupKey)
            : viewMode === "thread" ? `Thread: ${emails[0]?.subject?.slice(0, 40) || groupKey.slice(0, 20)}`
            : groupKey;
          return (
            <div key={groupKey} className="bg-bg-elev border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-bg-muted border-b border-border flex items-center justify-between">
                <div>
                  <span className="font-semibold text-fg text-sm">{label}</span>
                  {viewMode === "sender" && clientEmail?.label && <span className="ml-2 text-xs text-fg-subtle">{groupKey}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-subtle">{emails.length} email{emails.length !== 1 ? "s" : ""}</span>
                  {emails.filter((e) => e.status === "pending").length > 0 && (
                    <span className="text-xs bg-warning-soft text-warning border border-warning/25 px-2 py-0.5 rounded-full">
                      {emails.filter((e) => e.status === "pending").length} pending
                    </span>
                  )}
                </div>
              </div>
              {emails.map((email) => (
                <EmailRow key={email.gmailMessageId} email={email} projectId={projectId}
                  onStatusChange={handleStatusChange} slaThresholdHours={slaThresholdHours}
                  allTags={allTags} selected={selected.has(email.gmailMessageId)} onSelect={handleSelect} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
