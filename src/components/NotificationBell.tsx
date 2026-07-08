"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AlertOctagon, Clock, Flame, Check } from "lucide-react";

type Item = {
  id: string; type: "pending" | "escalated" | "sla_breach";
  projectId: string; projectName: string;
  subject: string; fromName: string | null; fromEmail: string | null;
  timestamp: string;
};

const STORAGE_KEY = "cit-notifications-last-checked";
const POLL_MS = 45_000;

function iconFor(type: Item["type"]) {
  if (type === "sla_breach") return <Flame className="w-3.5 h-3.5 text-danger" />;
  if (type === "escalated") return <AlertOctagon className="w-3.5 h-3.5 text-danger" />;
  return <Clock className="w-3.5 h-3.5 text-warning" />;
}
function labelFor(type: Item["type"]) {
  if (type === "sla_breach") return "SLA breached";
  if (type === "escalated") return "Escalated";
  return "New pending";
}

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function poll() {
    const since = localStorage.getItem(STORAGE_KEY) ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const res = await fetch(`/api/notifications?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {}
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function markAllRead() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setItems([]);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-fg-muted hover:bg-bg-muted hover:text-fg transition"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {items.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-danger text-white text-[9px] font-semibold flex items-center justify-center">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-bg-elev border border-border rounded-xl shadow-lg z-30">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-sm font-semibold text-fg">Notifications</span>
            {items.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-fg-subtle text-center py-8">Nothing new</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={`/dashboard/projects/${item.projectId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-bg-muted transition"
                  >
                    <span className="mt-0.5 shrink-0">{iconFor(item.type)}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-fg-subtle">{labelFor(item.type)} · {item.projectName}</p>
                      <p className="text-sm text-fg truncate">{item.subject}</p>
                      <p className="text-xs text-fg-subtle truncate">{item.fromName || item.fromEmail}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
