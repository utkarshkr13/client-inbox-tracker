import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const { id, emailId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clientEmail.delete({ where: { id: emailId, projectId: id } });
  return NextResponse.json({ ok: true });
}
