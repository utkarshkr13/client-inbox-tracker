import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const config = await prisma.webhookConfig.findUnique({ where: { userId } });
  return NextResponse.json(config ?? { webhookUrl: null, events: "pending,escalated", enabled: false });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { webhookUrl, events, enabled } = await req.json();
  const config = await prisma.webhookConfig.upsert({
    where: { userId },
    create: { userId, webhookUrl, events: events ?? "pending,escalated", enabled: enabled ?? false },
    update: { webhookUrl, events, enabled },
  });
  return NextResponse.json(config);
}
