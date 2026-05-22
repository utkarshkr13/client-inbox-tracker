"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton({
  projectId,
  clientEmails,
}: {
  projectId: string;
  clientEmails: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function sync() {
    if (clientEmails.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/emails`);
      const data = await res.json();
      if (res.ok) {
        setResult(`Synced ${data.synced} email${data.synced !== 1 ? "s" : ""}`);
        router.refresh();
      } else {
        setResult(data.error ?? "Sync failed");
      }
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-sm text-gray-500">{result}</span>}
      <button
        onClick={sync}
        disabled={loading || clientEmails.length === 0}
        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {loading ? "Syncing..." : "Sync Emails"}
      </button>
    </div>
  );
}
