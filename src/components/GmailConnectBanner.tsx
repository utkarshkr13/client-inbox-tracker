"use client";

import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function GmailConnectBanner() {
  return (
    <div className="bg-warning-soft border border-warning/20 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-warning" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-fg text-sm">Gmail access needed</p>
          <p className="text-xs text-fg-muted mt-0.5">We couldn't find a Gmail token for this account — reconnect to resume syncing</p>
        </div>
      </div>
      <Link
        href="/api/gmail/connect"
        className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-fg px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
      >
        Reconnect
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
