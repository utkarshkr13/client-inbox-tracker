import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const projectId = url.searchParams.get("projectId");

  if (!q) return NextResponse.json([]);

  const results = await prisma.emailStatus.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      OR: [
        { subject: { contains: q, mode: "insensitive" } },
        { snippet: { contains: q, mode: "insensitive" } },
        { fromEmail: { contains: q, mode: "insensitive" } },
        { fromName: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { receivedAt: "desc" },
    take: 50,
    include: {
      project: { select: { name: true } },
      emailTags: { include: { tag: true } },
    },
  });

  return NextResponse.json(results);
}
