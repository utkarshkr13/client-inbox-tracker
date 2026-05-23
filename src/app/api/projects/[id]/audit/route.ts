import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const url = new URL(req.url);
  const emailStatusId = url.searchParams.get("emailStatusId");

  const logs = await prisma.auditLog.findMany({
    where: emailStatusId
      ? { emailStatusId, emailStatus: { userId } }
      : { emailStatus: { projectId: id, userId } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
