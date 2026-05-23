import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const templates = await prisma.responseTemplate.findMany({
    where: { userId, ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { name, body, category, projectId } = await req.json();
  if (!name?.trim() || !body?.trim()) return NextResponse.json({ error: "Name and body required" }, { status: 400 });
  const template = await prisma.responseTemplate.create({
    data: { userId, name: name.trim(), body: body.trim(), category: category ?? "General", projectId: projectId ?? null },
  });
  return NextResponse.json(template);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { id } = await req.json();
  await prisma.responseTemplate.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { id, name, body, category } = await req.json();
  const template = await prisma.responseTemplate.updateMany({
    where: { id, userId },
    data: { name, body, category },
  });
  return NextResponse.json(template);
}
