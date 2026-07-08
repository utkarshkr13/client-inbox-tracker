"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function UserMenu({ name, email }: { name: string | null; email: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = name || email || "Account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary text-primary-fg text-xs font-semibold flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition"
        title={displayName}
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-elev border border-border rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="px-3.5 py-3 border-b border-border">
            <p className="text-sm font-semibold text-fg truncate">{name || "Account"}</p>
            {email && <p className="text-xs text-fg-subtle truncate mt-0.5">{email}</p>}
          </div>
          <button
            onClick={logout}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-danger hover:bg-danger-soft transition disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {loading ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
