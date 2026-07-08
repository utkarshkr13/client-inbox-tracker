"use client";

import { useState } from "react";
import Link from "next/link";

type SearchResult = {
  id: string;
  gmailMessageId: string;
  projectId: string;
  status: string;
  routingTier?: string;
  aiCategory?: string | null;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  snippet: string | null;
  receivedAt: string | null;
  project: { name: string };
  emailTags: { tag: { id: string; name: string; color: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  done: "bg-success-soft text-emerald-700",
  dismissed: "bg-bg-muted text-fg-muted",
  escalated: "bg-danger-soft text-danger",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(await res.json());
      setSearched(true);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-fg-subtle hover:text-fg-muted">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-fg mt-1">Search Emails</h1>
        <p className="text-sm text-fg-subtle mt-0.5">Search across all synced emails, subjects, senders and snippets</p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Search by subject, sender, or content…"
          className="flex-1 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-bg-elev"
          autoFocus
        />
        <button onClick={doSearch} disabled={loading || !query.trim()}
          className="bg-primary text-primary-fg px-5 py-3 rounded-xl hover:bg-primary/90 transition font-medium text-sm disabled:opacity-50">
          {loading ? "…" : "Search"}
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="text-center py-16 text-fg-subtle">No results for "{query}"</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-fg-subtle">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          {results.map((r) => (
            <Link key={r.id} href={`/dashboard/projects/${r.projectId}`}>
              <div className="bg-bg-elev border border-border rounded-xl p-4 hover:border-primary/25 hover:shadow-sm transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status] ?? "bg-bg-muted text-fg-muted"}`}>{r.status}</span>
                      <span className="text-xs bg-primary-soft text-primary border border-primary/20 px-2 py-0.5 rounded-full">{r.project.name}</span>
                      {r.aiCategory && <span className="text-xs bg-bg-muted text-fg-muted px-2 py-0.5 rounded-full">{r.aiCategory}</span>}
                      {r.routingTier && <span className={`text-xs px-2 py-0.5 rounded-full ${r.routingTier === "l2" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}`}>{r.routingTier.toUpperCase()}</span>}
                    </div>
                    <p className="font-semibold text-fg text-sm truncate group-hover:text-primary">{r.subject || "(no subject)"}</p>
                    <p className="text-xs text-fg-muted mt-0.5">{r.fromName || r.fromEmail} · {r.fromEmail}</p>
                    {r.snippet && <p className="text-xs text-fg-subtle mt-1 line-clamp-2">{r.snippet}</p>}
                    {r.emailTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.emailTags.map(({ tag }) => (
                          <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ background: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}>{tag.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-fg-subtle flex-shrink-0">
                    {r.receivedAt ? new Date(r.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
