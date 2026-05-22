"use client";

import Link from "next/link";

export default function GmailConnectBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-medium text-blue-900">Connect Gmail to start tracking emails</p>
        <p className="text-sm text-blue-700 mt-0.5">
          One-time OAuth — read-only access to fetch emails from your clients.
        </p>
      </div>
      <Link
        href="/api/gmail/connect"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition whitespace-nowrap ml-4"
      >
        Connect Gmail
      </Link>
    </div>
  );
}
