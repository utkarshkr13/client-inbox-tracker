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
  receivedAt: Date | string | null;
  followUpAt?: Date | string | null;
  escalationNote?: string | null;
  notes?: Note[];
  emailTags?: { tag: Tag }[];
};

type ClientEmail = { id: string; email: string; label: string | null };

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
  Bug: "bg-red-100 text-red-700 border-red-200",
  Feature: "bg-blue-100 text-blue-700 border-blue-200",
  Meeting: "bg-purple-100 text-purple-700 border-purple-200",
  Approval: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Update: "bg-teal-100 text-teal-700 border-teal-200",
  General: "bg-slate-100 text-slate-600 border-slate-200",
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
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${breached ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
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
    <span className="text-xs text-slate-400 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50" title={`To: ${toList.join(", ")}${ccList.length ? `  CC: ${ccList.join(", ")}` : ""}`}>
      {toLabel && <>To: <span className="font-medium text-slate-500">{toLabel}</span></>}
      {toList.length > 1 && ` +${toList.length - 1}`}
      {ccLabel && <>{toLabel ? "  " : ""}CC: <span className="font-medium text-slate-500">{ccLabel}</span></>}
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
    <div className={`border-b border-slate-100 last:border-0 ${isDismissed ? "opacity-40" : ""} ${isEscalated ? "bg-red-50/30" : ""}`}>
      <div className="flex items-start gap-2 p-3 hover:bg-slate-50/60 transition">
        <input type="checkbox" className="mt-1.5 flex-shrink-0 w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
          checked={selected} onChange={(e) => onSelect(email.gmailMessageId, e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <div className="mt-1.5 flex-shrink-0 cursor-pointer" onClick={toggleExpand}>
          {isPending && <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />}
          {isDone && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />}
          {isDismissed && <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />}
          {isEscalated && <span className="inline-block w-2 h-2 rounded-full bg-red-500" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-800 text-sm truncate">{email.fromName || email.fromEmail}</span>
            {email.fromName && <span className="text-xs text-slate-400 truncate">{email.fromEmail}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${email.routingTier === "l2" ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
              {email.routingTier === "l2" ? "L2" : "BA"}
            </span>
            {email.aiCategory && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[email.aiCategory] ?? CATEGORY_COLORS.General}`}>
                {email.aiCategory}
              </span>
            )}
            {isEscalated && <span className="text-xs px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200">🔺 Escalated</span>}
            {email.hasAttachments && <span className="text-xs text-slate-400" title="Has attachments">📎</span>}
            {isFollowUpDue && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">⏰ Follow-up due</span>}
          </div>
          <p className={`text-sm text-slate-700 mt-0.5 font-medium ${expanded ? "" : "truncate"}`}>{email.subject || "(no subject)"}</p>
          {!expanded && email.snippet && <p className="text-xs text-slate-400 mt-0.5 truncate">{email.snippet}</p>}
          {emailTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {emailTags.map((t) => (
                <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ background: t.color + "20", color: t.color, borderColor: t.color + "40" }}>{t.name}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-slate-400">{formatDate(email.receivedAt)}</p>
            <ToCcPill toEmails={email.toEmails} ccEmails={email.ccEmails} />
            {isPending && <SlaIndicator receivedAt={email.receivedAt} thresholdHours={slaThresholdHours} routingTier={email.routingTier} />}
          </div>
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-1.5 cursor-pointer transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={toggleExpand}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setStatus("done")} disabled={statusLoading || isDone} title="Mark done"
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isDone ? "bg-emerald-100 border-emerald-300 text-emerald-600" : "border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 text-slate-300"}`}>✓</button>
          <button onClick={() => setStatus(isPending ? "dismissed" : "pending")} disabled={statusLoading} title={isPending ? "Dismiss" : "Mark pending"}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isDismissed ? "bg-slate-100 border-slate-300 text-slate-500" : "border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-300"}`}>✕</button>
          <button onClick={() => setShowEscalateModal(true)} disabled={isEscalated} title="Escalate"
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition border ${isEscalated ? "bg-red-100 border-red-200 text-red-500" : "border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-300"}`}>🔺</button>
          <a href={`https://mail.google.com/mail/u/0/#all/${email.gmailMessageId}`} target="_blank" rel="noopener noreferrer" title="Open in Gmail"
            className="w-7 h-7 rounded-full flex items-center justify-center transition border border-slate-200 hover:border-red-300 hover:bg-red-50" onClick={(e) => e.stopPropagation()}>
            <GmailIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {showEscalateModal && (
        <div className="px-4 pb-3 ml-12 bg-red-50/60 border-t border-red-100">
          <p className="text-xs font-medium text-red-700 mt-2 mb-1">Escalation note (BA visibility)</p>
          <textarea value={escalationNote} onChange={(e) => setEscalationNote(e.target.value)}
            placeholder="Why are you escalating?" className="w-full text-xs border border-red-200 rounded-lg p-2 focus:outline-none resize-none" rows={2} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={submitEscalation} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">Escalate to BA</button>
            <button onClick={() => setShowEscalateModal(false)} className="text-xs text-slate-500">Cancel</button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 ml-10">
          <div className="flex items-center gap-2 mt-2 mb-2 flex-wrap">
            <button onClick={() => setRouting(email.routingTier === "l2" ? "ba" : "l2")}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
              Route to {email.routingTier === "l2" ? "BA" : "L2"}
            </button>
            <button onClick={() => { closeAll(); setShowNotes(!showNotes); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showNotes ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              📝 Notes{localNotes.length > 0 ? ` (${localNotes.length})` : ""}
            </button>
            <button onClick={() => { closeAll(); setShowTagPicker(!showTagPicker); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showTagPicker ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              🏷 Tags
            </button>
            <button onClick={() => { closeAll(); loadTemplates(); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showTemplates ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              📋 Templates
            </button>
            <button onClick={() => { closeAll(); loadAudit(); }}
              className={`text-xs px-2.5 py-1 rounded-lg border ${showAudit ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              🕵 Audit
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-slate-500">Follow-up:</span>
              <input type="date" value={followUpInput} onChange={(e) => setFollowUpInput(e.target.value)}
                className="text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <button onClick={saveFollowUp} className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">Set</button>
            </div>
          </div>

          {showNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-amber-800 mb-2">Internal Notes (never sent to client)</p>
              {localNotes.length === 0 ? <p className="text-xs text-amber-600 italic mb-2">No notes yet.</p> : (
                <div className="space-y-1.5 mb-2">
                  {localNotes.map((n) => (
                    <div key={n.id} className="bg-white border border-amber-200 rounded-lg p-2">
                      <p className="text-xs text-slate-700">{n.content}</p>
                      <p className="text-xs text-amber-500 mt-0.5">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add a note…"
                  onKeyDown={(e) => e.key === "Enter" && saveNote()}
                  className="flex-1 text-xs border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                <button onClick={saveNote} disabled={noteSaving || !noteInput.trim()}
                  className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50">Add</button>
              </div>
            </div>
          )}

          {showTagPicker && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Tags</p>
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
                {allTags.length === 0 && <p className="text-xs text-slate-400 italic">No tags. Create them in Settings → Tags.</p>}
              </div>
            </div>
          )}

          {showTemplates && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Response Templates — click to copy</p>
              {templates.length === 0 ? <p className="text-xs text-slate-400 italic">No templates. Create them in the Templates page.</p> : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => { navigator.clipboard.writeText(t.body); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="w-full text-left bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:bg-indigo-50 hover:border-indigo-200 transition group">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700">{t.name}</span>
                        <span className="text-xs text-slate-400">{t.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{t.body}</p>
                    </button>
                  ))}
                  {copied && <p className="text-xs text-emerald-600 font-medium">✓ Copied to clipboard!</p>}
                </div>
              )}
            </div>
          )}

          {showAudit && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Activity Log</p>
              {auditLogs.length === 0 ? <p className="text-xs text-slate-400 italic">No activity yet.</p> : (
                <div className="space-y-1.5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-xs text-slate-300 mt-0.5">•</span>
                      <div>
                        <span className="text-xs text-slate-600">
                          {log.action === "status_change" && `Status: ${log.fromValue} → ${log.toValue}`}
                          {log.action === "routed" && `Routed: ${log.fromValue} → ${log.toValue}`}
                          {log.action === "escalated" && "Escalated to BA"}
                          {log.action === "note_added" && "Note added"}
                          {log.action === "tag_added" && "Tag applied"}
                          {log.action === "follow_up_set" && `Follow-up set for ${log.toValue}`}
                        </span>
                        {log.note && <p className="text-xs text-slate-400 italic">"{log.note}"</p>}
                        <p className="text-xs text-slate-300">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1">
            {bodyLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Loading email…
              </div>
            ) : (
              <>
                {email.escalationNote && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-700">
                    🔺 <strong>Escalation note:</strong> {email.escalationNote}
                  </div>
                )}
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">{fullBody}</pre>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
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
}: {
  emailStatuses: EmailStatus[];
  clientEmails: ClientEmail[];
  projectId: string;
  slaThresholdHours?: number;
}) {
  const [statuses, setStatuses] = useState<EmailStatus[]>(emailStatuses);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "dismissed" | "escalated">("all");
  const [routingFilter, setRoutingFilter] = useState<"all" | "ba" | "l2">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("2026-05-10");
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
  const searchFiltered = searchQ ? dateFiltered.filter((e) => {
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
          { label: "Total", value: totalCount, cls: "bg-white border-slate-200 text-slate-800" },
          { label: "Pending", value: pendingCount, cls: "bg-orange-50 border-orange-100 text-orange-600" },
          { label: "Done", value: doneCount, cls: "bg-emerald-50 border-emerald-100 text-emerald-600" },
          { label: "Dismissed", value: dismissedCount, cls: "bg-slate-50 border-slate-200 text-slate-400" },
          { label: "Escalated", value: escalatedCount, cls: "bg-red-50 border-red-100 text-red-600" },
          { label: "L2 Queue", value: l2Count, cls: "bg-orange-50 border-orange-100 text-orange-500" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* BA/L2 routing strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 flex-wrap text-xs">
        <span className="font-semibold text-slate-600">Queue routing:</span>
        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">{baCount} BA</span>
        <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full">{l2Count} L2</span>
        <span className="text-slate-400 ml-auto">BA has full visibility of all emails incl. L2 queue</span>
      </div>

      {/* Per-client cards */}
      {clientStats.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {clientStats.map((cs) => (
            <div key={cs.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-bold text-xs">{(cs.label || cs.email).slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{cs.label || cs.email}</p>
                <p className="text-xs text-slate-400 truncate">{cs.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-indigo-600">{cs.total} email{cs.total !== 1 ? "s" : ""}</span>
                  {cs.pending > 0 && <span className="text-xs text-orange-500">{cs.pending} pending</span>}
                  {cs.latest && <span className="text-xs text-slate-400">Last: {formatDate(cs.latest)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search emails…"
          className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44" />
        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 ml-auto">
          {(["sender", "thread", "category"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`text-xs px-2 py-1 rounded-md transition ${viewMode === m ? "bg-white shadow-sm text-slate-700" : "text-slate-500"}`}>
              {m === "sender" ? "Client" : m === "thread" ? "Thread" : "Category"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar row 2 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "pending", "done", "dismissed", "escalated"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition capitalize ${filter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f}{f === "pending" && pendingCount > 0 && <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>}
            {f === "escalated" && escalatedCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{escalatedCount}</span>}
          </button>
        ))}
        <span className="text-xs text-slate-300 mx-1">|</span>
        {(["all", "ba", "l2"] as const).map((r) => (
          <button key={r} onClick={() => setRoutingFilter(r)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition uppercase ${routingFilter === r ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {r === "all" ? "All Routes" : r}
          </button>
        ))}
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white ml-1">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex-wrap">
          <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
          <button onClick={() => bulkAction("status", "done")} disabled={bulkActionLoading} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">✓ Done</button>
          <button onClick={() => bulkAction("status", "dismissed")} disabled={bulkActionLoading} className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">Dismiss</button>
          <button onClick={() => bulkAction("status", "pending")} disabled={bulkActionLoading} className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">Pending</button>
          <button onClick={() => bulkAction("route", "l2")} disabled={bulkActionLoading} className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-200">→ L2</button>
          <button onClick={() => bulkAction("route", "ba")} disabled={bulkActionLoading} className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-200">→ BA</button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 ml-auto">✕ Clear</button>
        </div>
      )}
      {filtered.length > 0 && selected.size === 0 && (
        <button onClick={() => setSelected(new Set(filtered.map((e) => e.gmailMessageId)))} className="text-xs text-slate-400 hover:text-indigo-600">
          Select all {filtered.length}
        </button>
      )}

      {/* Email groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {searchQ ? `No results for "${searchQ}".` : filter === "all" ? (fromDate ? `No emails from ${new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} onwards.` : "No emails synced yet.") : `No ${filter} emails.`}
        </div>
      ) : (
        Object.entries(grouped).map(([groupKey, emails]) => {
          const clientEmail = clientEmails.find((ce) => ce.email.toLowerCase() === groupKey);
          const label = viewMode === "sender" ? (clientEmail?.label || groupKey)
            : viewMode === "thread" ? `Thread: ${emails[0]?.subject?.slice(0, 40) || groupKey.slice(0, 20)}`
            : groupKey;
          return (
            <div key={groupKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 text-sm">{label}</span>
                  {viewMode === "sender" && clientEmail?.label && <span className="ml-2 text-xs text-slate-400">{groupKey}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{emails.length} email{emails.length !== 1 ? "s" : ""}</span>
                  {emails.filter((e) => e.status === "pending").length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
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
