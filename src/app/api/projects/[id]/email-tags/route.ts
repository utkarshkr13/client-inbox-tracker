import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const { emailStatusId, tagId, remove } = await req.json();

  const emailStatus = await prisma.emailStatus.findFirst({
    where: { id: emailStatusId, projectId: id, userId },
  });
  if (!emailStatus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (remove) {
    await prisma.emailTag.deleteMany({ where: { emailStatusId, tagId } });
  } else {
    await prisma.emailTag.upsert({
      where: { emailStatusId_tagId: { emailStatusId, tagId } },
      create: { emailStatusId, tagId },
      update: {},
    });
    await prisma.auditLog.create({
      data: { emailStatusId, userId, action: "tag_added", toValue: tagId },
    });
  }

  return NextResponse.json({ ok: true });
}
