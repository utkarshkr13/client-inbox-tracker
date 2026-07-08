import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.teamMember.findMany({
    where: { projectId: id },
    include: { gmailToken: { select: { gmailEmail: true, updatedAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, role } = await req.json();
  if (!name?.trim() || !email?.trim())
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim()))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const member = await prisma.teamMember.create({
    data: {
      userId: session.userId!,
      projectId: id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role === "ba" ? "ba" : "l2",
    },
  });

  return NextResponse.json(member, { status: 201 });
}
