"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmailStatus = {
  id: string;
  gmailMessageId: string;
  projectId: string;
  status: string;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  snippet: string | null;
  receivedAt: Date | string | null;
};

type ClientEmail = {
  id: string;
  email: string;
  label: string | null;
};

function formatDate(d: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function EmailRow({
  email,
  projectId,
  onStatusChange,
}: {
  email: EmailStatus;
  projectId: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/emails`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailMessageId: email.gmailMessageId, status }),
      });
      onStatusChange(email.gmailMessageId, status);
    } finally {
      setLoading(false);
    }
  }

  const isPending = email.status === "pending";
  const isDone = email.status === "done";
  const isDismissed = email.status === "dismissed";

  return (
    <div
      className={`flex items-start gap-4 p-4 border-b border-slate-100 last:border-0 transition-opacity ${
        isDismissed ? "opacity-40" : ""
      }`}
    >
      <div className="mt-1 flex-shrink-0">
        {isPending && <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />}
        {isDone && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />}
        {isDismissed && <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />}
      </div>

      {/* Tapping opens the email in Gmail (read-only, no Gmail changes) */}
      <a
        href={`https://mail.google.com/mail/u/0/#all/${email.gmailMessageId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 group/link"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-slate-800 text-sm truncate group-hover/link:text-indigo-600 transition">
            {email.fromName || email.fromEmail}
          </span>
          {email.fromName && (
            <span className="text-xs text-slate-400 truncate">{email.fromEmail}</span>
          )}
        </div>
        <p className="text-sm text-slate-700 mt-0.5 font-medium truncate group-hover/link:text-indigo-700 transition">
          {email.subject || "(no subject)"}
        </p>
        {email.snippet && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{email.snippet}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-slate-400">{formatDate(email.receivedAt)}</p>
          <span className="text-xs text-indigo-400 opacity-0 group-hover/link:opacity-100 transition flex items-center gap-0.5">
            Open in Gmail
            <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        </div>
      </a>

      <div className="flex gap-1.5 flex-shrink-0" aria-disabled={loading}>
        <button
          onClick={() => setStatus("done")}
          disabled={loading || isDone}
          title="Mark done — only affects this app, not Gmail"
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition border ${
            isDone
              ? "bg-emerald-100 border-emerald-300 text-emerald-600"
              : "border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 text-slate-300"
          }`}
        >
          ✓
        </button>
        <button
          onClick={() => setStatus(isPending ? "dismissed" : "pending")}
          disabled={loading}
          title={isPending ? "Dismiss — only affects this app, not Gmail" : "Mark pending"}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition border ${
            isDismissed
              ? "bg-slate-100 border-slate-300 text-slate-500"
              : "border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-slate-300"
          }`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function EmailList({
  emailStatuses,
  clientEmails,
  projectId,
}: {
  emailStatuses: EmailStatus[];
  clientEmails: ClientEmail[];
  projectId: string;
}) {
  const [statuses, setStatuses] = useState<EmailStatus[]>(emailStatuses);
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "dismissed">("all");
  const [fromDate, setFromDate] = useState("2026-05-10");

  function handleStatusChange(gmailMessageId: string, newStatus: string) {
    setStatuses((prev) =>
      prev.map((e) =>
        e.gmailMessageId === gmailMessageId ? { ...e, status: newStatus } : e
      )
    );
  }

  // Date filter
  const dateFiltered = statuses.filter((e) => {
    if (!fromDate) return true;
    if (!e.receivedAt) return false;
    return new Date(e.receivedAt) >= new Date(fromDate);
  });

  // Status filter
  const filtered = filter === "all" ? dateFiltered : dateFiltered.filter((e) => e.status === filter);

  // Group by sender
  const grouped: Record<string, EmailStatus[]> = {};
  for (const e of filtered) {
    const key = (e.fromEmail ?? "unknown").toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  // KPIs from date-filtered set
  const pendingCount = dateFiltered.filter((e) => e.status === "pending").length;
  const doneCount = dateFiltered.filter((e) => e.status === "done").length;
  const dismissedCount = dateFiltered.filter((e) => e.status === "dismissed").length;
  const totalCount = dateFiltered.length;

  // Per-client stats
  const clientStats = clientEmails.map((ce) => {
    const ceEmails = dateFiltered.filter(
      (e) => (e.fromEmail ?? "").toLowerCase() === ce.email.toLowerCase()
    );
    const latestEmail = ceEmails.sort(
      (a, b) => new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime()
    )[0];
    return {
      ...ce,
      total: ceEmails.length,
      latest: latestEmail?.receivedAt ?? null,
    };
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
          <p className="text-xs text-slate-400 mt-1">Total</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs text-orange-500 mt-1">Pending</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{doneCount}</p>
          <p className="text-xs text-emerald-500 mt-1">Done</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">{dismissedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Dismissed</p>
        </div>
      </div>

      {/* Per-client stats */}
      <div className="grid grid-cols-2 gap-3">
        {clientStats.map((cs) => (
          <div key={cs.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-bold text-xs">
                {(cs.label || cs.email).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{cs.label || cs.email}</p>
              <p className="text-xs text-slate-400 truncate">{cs.email}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-medium text-indigo-600">{cs.total} email{cs.total !== 1 ? "s" : ""}</span>
                {cs.latest && (
                  <span className="text-xs text-slate-400">Last: {formatDate(cs.latest)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {(["all", "pending", "done", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Email groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {filter === "all"
            ? fromDate
              ? `No emails from ${new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} onwards. Try an earlier date or sync.`
              : "No emails synced yet. Click Sync Emails."
            : `No ${filter} emails.`}
        </div>
      ) : (
        Object.entries(grouped).map(([senderEmail, emails]) => {
          const clientEmail = clientEmails.find(
            (ce) => ce.email.toLowerCase() === senderEmail
          );
          const label = clientEmail?.label || senderEmail;
          return (
            <div key={senderEmail} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 text-sm">{label}</span>
                  {clientEmail?.label && (
                    <span className="ml-2 text-xs text-slate-400">{senderEmail}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{emails.length} email{emails.length !== 1 ? "s" : ""}</span>
              </div>
              <div>
                {emails.map((email) => (
                  <EmailRow
                    key={email.gmailMessageId}
                    email={email}
                    projectId={projectId}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
