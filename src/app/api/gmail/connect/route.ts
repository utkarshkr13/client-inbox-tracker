import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
