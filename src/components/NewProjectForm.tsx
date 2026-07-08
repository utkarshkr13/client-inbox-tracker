"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setName("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New project name…"
        className="flex-1 bg-bg-elev text-fg placeholder-slate-400 border border-border rounded-xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 transition shadow-sm"
      >
        {loading ? "Creating…" : "Create Project"}
      </button>
    </form>
  );
}
