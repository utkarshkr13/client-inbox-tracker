import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthedClient } from "@/lib/gmail";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await getAuthedClient(session.userId!);
  if (!auth) return NextResponse.json({ connected: false, email: null });

  try {
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    return NextResponse.json({
      connected: true,
      email: profile.data.emailAddress,
      messagesTotal: profile.data.messagesTotal,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ connected: false, error: err.message });
  }
}
