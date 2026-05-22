import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { email, label } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim()))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const clientEmail = await prisma.clientEmail.create({
    data: { projectId: id, email: email.trim().toLowerCase(), label: label?.trim() || null },
  });

  return NextResponse.json(clientEmail, { status: 201 });
}
