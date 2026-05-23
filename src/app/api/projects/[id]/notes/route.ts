import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const { emailStatusId, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Verify the email belongs to this project
  const emailStatus = await prisma.emailStatus.findFirst({
    where: { id: emailStatusId, projectId: id, userId },
  });
  if (!emailStatus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = await prisma.note.create({
    data: { emailStatusId, userId, content: content.trim() },
  });

  await prisma.auditLog.create({
    data: { emailStatusId, userId, action: "note_added", toValue: content.trim().slice(0, 100) },
  });

  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const { noteId } = await req.json();
  await prisma.note.deleteMany({ where: { id: noteId, userId } });
  return NextResponse.json({ ok: true });
}
