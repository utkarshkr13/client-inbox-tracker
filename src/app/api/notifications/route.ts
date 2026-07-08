import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Powers the in-app notification bell. "New" is relative to a client-supplied
// `since` timestamp (stored client-side in localStorage) rather than a
// server-tracked read/unread flag — this is a single-tenant internal tool,
// so a lightweight polling model is proportionate to the problem.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const [pendingTotal, escalatedTotal, newPending, newEscalated, l2PendingAll] = await Promise.all([
    prisma.emailStatus.count({ where: { userId, status: "pending" } }),
    prisma.emailStatus.count({ where: { userId, status: "escalated" } }),
    prisma.emailStatus.findMany({
      where: { userId, status: "pending", createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.emailStatus.findMany({
      where: { userId, status: "escalated", updatedAt: { gt: since } },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.emailStatus.findMany({
      where: { userId, status: "pending", routingTier: "l2" },
      include: { project: { include: { slaConfig: true } } },
    }),
  ]);

  // SLA breaches that crossed into breach *within this window* — not every
  // breach that's ever existed, just the ones that became true recently.
  const newSlaBreach = l2PendingAll.filter((e) => {
    if (!e.receivedAt) return false;
    const slaHours = (e.project as { slaConfig?: { thresholdHours: number } | null }).slaConfig?.thresholdHours ?? 24;
    const breachAt = new Date(new Date(e.receivedAt).getTime() + slaHours * 60 * 60 * 1000);
    return breachAt > since && breachAt <= now;
  });

  type Item = {
    id: string; type: "pending" | "escalated" | "sla_breach";
    projectId: string; projectName: string;
    subject: string; fromName: string | null; fromEmail: string | null;
    timestamp: string;
  };

  const items: Item[] = [
    ...newPending.map((e) => ({
      id: e.id, type: "pending" as const, projectId: e.projectId, projectName: e.project.name,
      subject: e.subject ?? "(no subject)", fromName: e.fromName, fromEmail: e.fromEmail,
      timestamp: e.createdAt.toISOString(),
    })),
    ...newEscalated.map((e) => ({
      id: e.id, type: "escalated" as const, projectId: e.projectId, projectName: e.project.name,
      subject: e.subject ?? "(no subject)", fromName: e.fromName, fromEmail: e.fromEmail,
      timestamp: e.updatedAt.toISOString(),
    })),
    ...newSlaBreach.map((e) => ({
      id: e.id, type: "sla_breach" as const, projectId: e.projectId, projectName: e.project.name,
      subject: e.subject ?? "(no subject)", fromName: e.fromName, fromEmail: e.fromEmail,
      timestamp: e.receivedAt!.toISOString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  return NextResponse.json({ pendingTotal, escalatedTotal, items });
}
