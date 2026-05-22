import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  isLoggedIn?: boolean;
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

// Single-user credentials (set via env vars)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "utkarsh.rajput@salescode.ai";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@1234567890";
export const ADMIN_USER_ID = "utkarsh";
