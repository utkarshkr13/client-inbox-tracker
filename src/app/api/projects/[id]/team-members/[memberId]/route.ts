import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamMember.delete({ where: { id: memberId, projectId: id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Disconnect this member's Gmail token without removing them from the project
  if (body.disconnectGmail) {
    await prisma.teamMemberGmailToken.deleteMany({ where: { teamMemberId: memberId } });
    return NextResponse.json({ ok: true });
  }

  const { name, role } = body;
  const member = await prisma.teamMember.update({
    where: { id: memberId, projectId: id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(role === "ba" || role === "l2" ? { role } : {}),
    },
  });

  return NextResponse.json(member);
}
