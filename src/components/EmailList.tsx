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
      className={`flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 transition-opacity ${
        isDismissed ? "opacity-40" : ""
      }`}
    >
      {/* Status indicator */}
      <div className="mt-0.5 flex-shrink-0">
        {isPending && (
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 mt-1" />
        )}
        {isDone && (
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mt-1" />
        )}
        {isDismissed && (
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">
            {email.fromName || email.fromEmail}
          </span>
          {email.fromName && (
            <span className="text-xs text-gray-400 truncate">{email.fromEmail}</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 font-medium truncate">
          {email.subject || "(no subject)"}
        </p>
        {email.snippet && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{email.snippet}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatDate(email.receivedAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0" aria-disabled={loading}>
        <button
          onClick={() => setStatus("done")}
          disabled={loading || isDone}
          title="Mark done"
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition border ${
            isDone
              ? "bg-green-100 border-green-300 text-green-600"
              : "border-gray-200 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-gray-400"
          }`}
        >
          ✓
        </button>
        <button
          onClick={() => setStatus(isPending ? "dismissed" : "pending")}
          disabled={loading}
          title={isPending ? "Dismiss" : "Mark pending"}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition border ${
            isDismissed
              ? "bg-gray-100 border-gray-300 text-gray-500"
              : "border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-gray-400"
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

  function handleStatusChange(gmailMessageId: string, newStatus: string) {
    setStatuses((prev) =>
      prev.map((e) =>
        e.gmailMessageId === gmailMessageId ? { ...e, status: newStatus } : e
      )
    );
  }

  const filtered =
    filter === "all" ? statuses : statuses.filter((e) => e.status === filter);

  // Group by sender
  const grouped: Record<string, EmailStatus[]> = {};
  for (const e of filtered) {
    const key = e.fromEmail ?? "unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  const pendingCount = statuses.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {(["all", "pending", "done", "dismissed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full transition capitalize ${
              filter === f
                ? "bg-black text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
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

      {/* Email groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {filter === "all" ? "No emails synced yet. Click Sync Emails." : `No ${filter} emails.`}
        </div>
      ) : (
        Object.entries(grouped).map(([senderEmail, emails]) => {
          const clientEmail = clientEmails.find((ce) => ce.email === senderEmail);
          const label = clientEmail?.label || senderEmail;
          return (
            <div key={senderEmail} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 text-sm">{label}</span>
                  {clientEmail?.label && (
                    <span className="ml-2 text-xs text-gray-400">{senderEmail}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{emails.length} email{emails.length !== 1 ? "s" : ""}</span>
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
