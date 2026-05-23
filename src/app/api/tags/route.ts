import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name: name.trim() } },
    create: { userId, name: name.trim(), color: color ?? "#6366f1" },
    update: { color: color ?? "#6366f1" },
  });
  return NextResponse.json(tag);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { tagId } = await req.json();
  await prisma.tag.deleteMany({ where: { id: tagId, userId } });
  return NextResponse.json({ ok: true });
}
