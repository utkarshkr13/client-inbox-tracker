"use client";

import Link from "next/link";

export default function GmailConnectBanner() {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-indigo-900 text-sm">Connect Gmail to start tracking</p>
          <p className="text-xs text-indigo-600 mt-0.5">Read-only access · fetches emails from your clients</p>
        </div>
      </div>
      <Link
        href="/api/gmail/connect"
        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex-shrink-0"
      >
        Connect Gmail
      </Link>
    </div>
  );
}
