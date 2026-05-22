import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.gmailToken.deleteMany({ where: { userId: session.userId! } });
  return NextResponse.json({ ok: true });
}
