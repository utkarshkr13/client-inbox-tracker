import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
