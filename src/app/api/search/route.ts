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

  if (!q) return NextResponse.json({ results: [], totalCount: 0 });

  const where = {
    userId,
    ...(projectId ? { projectId } : {}),
    OR: [
      { subject: { contains: q, mode: "insensitive" as const } },
      { snippet: { contains: q, mode: "insensitive" as const } },
      { fromEmail: { contains: q, mode: "insensitive" as const } },
      { fromName: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const [results, totalCount] = await Promise.all([
    prisma.emailStatus.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: {
        project: { select: { name: true } },
        emailTags: { include: { tag: true } },
      },
    }),
    prisma.emailStatus.count({ where }),
  ]);

  return NextResponse.json({ results, totalCount });
}
