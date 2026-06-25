"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

export default function SyncButton({
  projectId,
  clientEmails,
}: {
  projectId: string;
  clientEmails: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  async function sync() {
    if (clientEmails.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/emails`);
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Synced ${data.synced} email${data.synced !== 1 ? "s" : ""}` });
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
      {result && (
        <span
          className={`text-xs font-medium inline-flex items-center gap-1 ${result.ok ? "text-success" : "text-danger"}`}
          role="status"
        >
          {result.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {result.message}
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
