import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { l2Email, baEmail, name } = await req.json();
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(l2Email !== undefined ? { l2Email: l2Email || null } : {}),
      ...(baEmail !== undefined ? { baEmail: baEmail || null } : {}),
    },
  });
  return NextResponse.json(updated);
}
