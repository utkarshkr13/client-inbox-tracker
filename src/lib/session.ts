import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  isLoggedIn?: boolean;
  email?: string;      // Authenticated Google account email (display only)
  name?: string;       // Google display name
  picture?: string;    // Google avatar URL
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex-password-at-least-32-chars-long-xx",
  cookieName: "cit-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Single-tenant data model — every row is still keyed by this constant userId
// regardless of which Google account authenticates. This keeps the DB schema
// untouched while removing the password gate in favor of Google identity.
export const ADMIN_USER_ID = "utkarsh";

// Legacy password fallback (kept only so the old /api/auth/login route doesn't
// 500 if something still calls it — no longer surfaced in the UI).
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "utkarsh.rajput@salescode.ai";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@1234567890";

/**
 * Access control for the new Google login. Comma-separated list of Google
 * account emails allowed to sign in. Falls back to ADMIN_EMAIL so existing
 * deployments keep working with zero config changes.
 *
 *   ALLOWED_EMAILS="utkarsh@company.com,teammate@company.com"
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ALLOWED_EMAILS || ADMIN_EMAIL;
  const allowed = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
