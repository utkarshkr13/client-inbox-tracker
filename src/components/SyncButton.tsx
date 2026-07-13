"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SyncButton({
  projectId,
  clientEmails,
  lastSyncedAt: initialLastSyncedAt = null,
}: {
  projectId: string;
  clientEmails: string[];
  /** Real timestamp from Project.lastSyncedAt (ISO string), null if never synced. */
  lastSyncedAt?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);
  // Re-render every 30s so the relative "Xm ago" label stays current without a page refresh.
  const [, setTick] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function sync() {
    if (clientEmails.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/emails`);
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Synced ${data.synced} email${data.synced !== 1 ? "s" : ""}` });
        if (data.lastSyncedAt) setLastSyncedAt(data.lastSyncedAt);
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? "Sync failed" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result ? (
        <span
          className={`text-xs font-medium inline-flex items-center gap-1 ${result.ok ? "text-success" : "text-danger"}`}
          role="status"
        >
          {result.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {result.message}
        </span>
      ) : (
        <span className="text-xs text-fg-subtle">
          {lastSyncedAt ? `Last synced ${relativeTime(lastSyncedAt)}` : "Never synced"}
        </span>
      )}
      <Button
        variant="primary"
        size="md"
        loading={loading}
        disabled={clientEmails.length === 0}
        onClick={sync}
      >
        {!loading && <RefreshCw className="w-3.5 h-3.5" />}
        {loading ? "Syncing…" : "Sync emails"}
      </Button>
    </div>
  );
}
