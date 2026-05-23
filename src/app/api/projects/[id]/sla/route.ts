import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await prisma.slaConfig.findUnique({ where: { projectId: id } });
  return NextResponse.json(config ?? { thresholdHours: 24 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { thresholdHours } = await req.json();
  const config = await prisma.slaConfig.upsert({
    where: { projectId: id },
    create: { projectId: id, thresholdHours },
    update: { thresholdHours },
  });
  return NextResponse.json(config);
}
