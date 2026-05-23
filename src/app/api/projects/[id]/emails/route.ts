import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fetchEmailsFromSender } from "@/lib/gmail";

// -------------------------------------------------------------------
// Routing decision — who should handle this email first?
// -------------------------------------------------------------------
// Scenario A: Email TO the BA (l2 in CC or not present)
//   → BA is primary, but l2 is looped in. routingTier = "ba"
//
// Scenario B: Email TO the L2, BA in CC
//   → L2 must respond first. routingTier = "l2"
//
// Scenario C: Email TO both BA and L2 (joint TO)
//   → Treat as BA primary because BA was explicitly addressed.
//
// Fallback: keyword-based category routing if no To/CC signals.
// -------------------------------------------------------------------
function smartRoute(opts: {
  toEmails: string;
  ccEmails: string;
  baEmail: string | null;
  l2Email: string | null;
  aiCategory: string;
}): string {
  const { toEmails, ccEmails, baEmail, l2Email, aiCategory } = opts;
  const toList = toEmails.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const ccList = ccEmails.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

  const baInTo = baEmail ? toList.includes(baEmail.toLowerCase()) : false;
  const l2InTo = l2Email ? toList.includes(l2Email.toLowerCase()) : false;
  const baInCc = baEmail ? ccList.includes(baEmail.toLowerCase()) : false;
  const l2InCc = l2Email ? ccList.includes(l2Email.toLowerCase()) : false;

  // Explicit To/CC signals take priority
  if (l2Email) {
    // Scenario B: L2 in To, BA in CC → L2 first
    if (l2InTo && baInCc && !baInTo) return "l2";
    // Scenario B variant: L2 in To, BA not present at all → still L2
    if (l2InTo && !baInTo) return "l2";
    // Scenario A: BA in To, L2 in CC → BA primary
    if (baInTo) return "ba";
    // L2 in CC only (no To signal for either) → informational, default BA
    if (l2InCc && !baInTo) return "l2";
  }

  // No To/CC signals — fall back to category-based routing
  const l2Categories = ["Bug", "General"];
  return l2Categories.includes(aiCategory) && l2Email ? "l2" : "ba";
}

// -------------------------------------------------------------------
// Fallback keyword routing (used when no L2 is configured)
// -------------------------------------------------------------------
function autoRoute(aiCategory: string): string {
  const l2Categories = ["Bug", "General"];
  return l2Categories.includes(aiCategory) ? "l2" : "ba";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId!;

  const [project, gmailToken] = await Promise.all([
    prisma.project.findUnique({
      where: { id, userId },
      include: { clientEmails: true },
    }),
    prisma.gmailToken.findUnique({ where: { userId } }),
  ]);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!gmailToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  // BA email: prefer stored on token, fall back to project override
  const baEmail = gmailToken.gmailEmail ?? project.baEmail ?? null;
  const l2Email = project.l2Email ?? null;

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
    toEmails: string;
    ccEmails: string;
  };

  const fetched: FetchedEmail[] = [];
  for (const result of allEmails) {
    if (result.status === "fulfilled") fetched.push(...result.value);
    else console.error("[sync] Gmail fetch error:", result.reason);
  }

  for (const email of fetched) {
    const routingTier = smartRoute({
      toEmails: email.toEmails,
      ccEmails: email.ccEmails,
      baEmail,
      l2Email,
      aiCategory: email.aiCategory,
    });

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
        toEmails: email.toEmails,
        ccEmails: email.ccEmails,
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
        toEmails: email.toEmails,
        ccEmails: email.ccEmails,
        // Re-evaluate routing on each sync in case project L2/BA config changed
        routingTier,
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

        if (status && status !== existing.status) {
          await prisma.auditLog.create({
            data: { emailStatusId: existing.id, userId, action: "status_change", fromValue: existing.status, toValue: status },
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
      data: { emailStatusId: existing.id, userId, action: "routed", fromValue: existing.routingTier, toValue: routingTier },
    });
  }
  if (followUpAt) {
    await prisma.auditLog.create({
      data: { emailStatusId: existing.id, userId, action: "follow_up_set", toValue: followUpAt },
    });
  }

  // Webhook
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
          body: JSON.stringify({ event: status, gmailMessageId, projectId: id, subject: existing.subject, fromEmail: existing.fromEmail }),
        }).catch(() => {});
      }
    }
  } catch {}

  return NextResponse.json(updated);
}
