import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const days = parseInt(url.searchParams.get("days") ?? "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where = {
    userId,
    receivedAt: { gte: since },
    ...(projectId ? { projectId } : {}),
  };

  const [total, byStatus, byCategory, byRouting, byDay, escalated, withFollowUp] = await Promise.all([
    prisma.emailStatus.count({ where }),
    prisma.emailStatus.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.emailStatus.groupBy({ by: ["aiCategory"], where: { ...where, aiCategory: { not: null } }, _count: { _all: true } }),
    prisma.emailStatus.groupBy({ by: ["routingTier"], where, _count: { _all: true } }),
    // Daily volume - last N days
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE("receivedAt")::text AS day, COUNT(*)::int AS count
      FROM "EmailStatus"
      WHERE "userId" = ${userId}
        AND "receivedAt" >= ${since}
        ${projectId ? prisma.$queryRaw`AND "projectId" = ${projectId}` : prisma.$queryRaw``}
      GROUP BY DATE("receivedAt")
      ORDER BY DATE("receivedAt") ASC
    `,
    prisma.emailStatus.count({ where: { ...where, status: "escalated" } }),
    prisma.emailStatus.count({ where: { userId, followUpAt: { not: null, lte: new Date() } } }),
  ]);

  // Average pending duration (hours) for done/dismissed emails
  const resolvedEmails = await prisma.emailStatus.findMany({
    where: { ...where, status: { in: ["done", "dismissed"] } },
    select: { receivedAt: true, updatedAt: true },
  });
  const avgResolutionHours = resolvedEmails.length > 0
    ? resolvedEmails.reduce((sum, e) => {
        if (!e.receivedAt) return sum;
        return sum + (e.updatedAt.getTime() - e.receivedAt.getTime()) / (1000 * 60 * 60);
      }, 0) / resolvedEmails.length
    : 0;

  return NextResponse.json({
    total,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    byCategory: Object.fromEntries(byCategory.map((r) => [r.aiCategory ?? "Unknown", r._count._all])),
    byRouting: Object.fromEntries(byRouting.map((r) => [r.routingTier, r._count._all])),
    byDay,
    escalated,
    withFollowUp,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
  });
}
