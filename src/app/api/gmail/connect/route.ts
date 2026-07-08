import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

// No login gate here on purpose: this is now the single entry point for both
// "Continue with Google" (first-time login) and "Reconnect Gmail" (Settings,
// if a token expires or access is revoked). One consent screen does both.
export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
