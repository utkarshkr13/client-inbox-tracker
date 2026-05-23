import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const templates = await prisma.projectTemplate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { name, description, config } = await req.json();
  const template = await prisma.projectTemplate.create({
    data: { userId, name, description, config: typeof config === "string" ? config : JSON.stringify(config) },
  });
  return NextResponse.json(template);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;
  const { id } = await req.json();
  await prisma.projectTemplate.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
