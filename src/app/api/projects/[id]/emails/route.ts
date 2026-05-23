import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fetchEmailsFromSender } from "@/lib/gmail";

// Auto-routing: certain categories default to l2 routing
function autoRoute(aiCategory: string): string {
  const l2Categories = ["Bug", "Billing", "General"];
  return l2Categories.includes(aiCategory) ? "l2" : "ba";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const project = await prisma.project.findUnique({
    where: { id, userId },
    include: { clientEmails: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gmailToken = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!gmailToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  const allEmails = await Promise.allSettled(
    project.clientEmails.map((ce: { email: string }) => fetchEmailsFromSender(userId, ce.email))
  );

  type FetchedEmail = {
    gmailMessageId: string;
    threadId: string | null;
    subject: string;
    fromEmail: string;
    fromName: string;
    snippet: string;
    receivedAt: Date | null;
    aiCategory: string;
    hasAttachments: boolean;
  };

  const fetched: FetchedEmail[] = [];
  for (const result of allEmails) {
    if (result.status === "fulfilled") fetched.push(...result.value);
    else console.error("[sync] Gmail fetch error:", result.reason);
  }

  for (const email of fetched) {
    const routingTier = autoRoute(email.aiCategory);
    await prisma.emailStatus.upsert({
      where: { gmailMessageId_projectId: { gmailMessageId: email.gmailMessageId, projectId: id } },
      create: {
        gmailMessageId: email.gmailMessageId,
        threadId: email.threadId,
        projectId: id,
        userId,
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        status: "pending",
        routingTier,
        aiCategory: email.aiCategory,
        hasAttachments: email.hasAttachments,
      },
      update: {
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        threadId: email.threadId,
        aiCategory: email.aiCategory,
        hasAttachments: email.hasAttachments,
      },
    });
  }

  const statuses = await prisma.emailStatus.findMany({
    where: { projectId: id, userId },
    orderBy: { receivedAt: "desc" },
    include: { notes: true, emailTags: { include: { tag: true } } },
  });

  return NextResponse.json({ synced: fetched.length, emails: statuses });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const body = await req.json();

  // Bulk action
  if (body.bulk && Array.isArray(body.gmailMessageIds)) {
    const { gmailMessageIds, status, routingTier, tagId } = body;
    const results = await Promise.all(
      gmailMessageIds.map(async (gmailMessageId: string) => {
        const existing = await prisma.emailStatus.findUnique({
          where: { gmailMessageId_projectId: { gmailMessageId, projectId: id } },
        });
        if (!existing) return null;

        const data: Record<string, string> = {};
        if (status) data.status = status;
        if (routingTier) data.routingTier = routingTier;

        const updated = await prisma.emailStatus.update({
          where: { gmailMessageId_projectId: { gmailMessageId, projectId: id } },
          data,
        });

        if (tagId) {
          await prisma.emailTag.upsert({
            where: { emailStatusId_tagId: { emailStatusId: existing.id, tagId } },
            create: { emailStatusId: existing.id, tagId },
            update: {},
          });
        }

        // Audit log
        if (status) {
          await prisma.auditLog.create({
            data: {
              emailStatusId: existing.id,
              userId,
              action: "status_change",
              fromValue: existing.status,
              toValue: status,
            },
          });
        }

        return updated;
      })
    );
    return NextResponse.json({ updated: results.filter(Boolean).length });
  }

  // Single email update
  const { gmailMessageId, status, routingTier, followUpAt, escalationNote, aiCategory } = body;

  const existing = await prisma.emailStatus.findUnique({
    where: { gmailMessageId_projectId: { gmailMessageId, projectId: id } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status && !["pending", "done", "dismissed", "escalated"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (routingTier) updateData.routingTier = routingTier;
  if (followUpAt !== undefined) updateData.followUpAt = followUpAt ? new Date(followUpAt) : null;
  if (escalationNote !== undefined) updateData.escalationNote = escalationNote;
  if (aiCategory) updateData.aiCategory = aiCategory;

  const updated = await prisma.emailStatus.update({
    where: { gmailMessageId_projectId: { gmailMessageId, projectId: id } },
    data: updateData,
  });

  // Audit log
  if (status && status !== existing.status) {
    await prisma.auditLog.create({
      data: {
        emailStatusId: existing.id,
        userId,
        action: status === "escalated" ? "escalated" : "status_change",
        fromValue: existing.status,
        toValue: status,
        note: escalationNote,
      },
    });
  }
  if (routingTier && routingTier !== existing.routingTier) {
    await prisma.auditLog.create({
      data: {
        emailStatusId: existing.id,
        userId,
        action: "routed",
        fromValue: existing.routingTier,
        toValue: routingTier,
      },
    });
  }
  if (followUpAt) {
    await prisma.auditLog.create({
      data: {
        emailStatusId: existing.id,
        userId,
        action: "follow_up_set",
        toValue: followUpAt,
      },
    });
  }

  // Fire webhook if configured
  try {
    const webhookConfig = await prisma.webhookConfig.findUnique({ where: { userId } });
    if (webhookConfig?.enabled && webhookConfig.webhookUrl) {
      const events = webhookConfig.events.split(",");
      const shouldFire = (status === "escalated" && events.includes("escalated")) ||
                         (status === "pending" && events.includes("pending"));
      if (shouldFire) {
        fetch(webhookConfig.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: status,
            gmailMessageId,
            projectId: id,
            subject: existing.subject,
            fromEmail: existing.fromEmail,
          }),
        }).catch(() => {});
      }
    }
  } catch {}

  return NextResponse.json(updated);
}
