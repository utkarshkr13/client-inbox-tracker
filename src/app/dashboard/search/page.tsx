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
  pending: "bg-orange-100 text-orange-700",
  done: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-500",
  escalated: "bg-red-100 text-red-700",
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
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Search Emails</h1>
        <p className="text-sm text-slate-400 mt-0.5">Search across all synced emails, subjects, senders and snippets</p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Search by subject, sender, or content…"
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          autoFocus
        />
        <button onClick={doSearch} disabled={loading || !query.trim()}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
          {loading ? "…" : "Search"}
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="text-center py-16 text-slate-400">No results for "{query}"</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          {results.map((r) => (
            <Link key={r.id} href={`/dashboard/projects/${r.projectId}`}>
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{r.project.name}</span>
                      {r.aiCategory && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.aiCategory}</span>}
                      {r.routingTier && <span className={`text-xs px-2 py-0.5 rounded-full ${r.routingTier === "l2" ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-600"}`}>{r.routingTier.toUpperCase()}</span>}
                    </div>
                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-700">{r.subject || "(no subject)"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.fromName || r.fromEmail} · {r.fromEmail}</p>
                    {r.snippet && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.snippet}</p>}
                    {r.emailTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.emailTags.map(({ tag }) => (
                          <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-full border" style={{ background: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}>{tag.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
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
