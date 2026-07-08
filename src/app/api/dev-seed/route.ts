import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, ADMIN_USER_ID } from "@/lib/session";

// Dev/QA sandbox data. Everything created here is clearly labeled so it's
// obvious it's fake and safe to wipe — POST (re)creates it, DELETE removes it.
const SANDBOX_NAME = "🧪 QA Sandbox (safe to delete)";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function wipeSandbox(userId: string) {
  const existing = await prisma.project.findFirst({ where: { userId, name: SANDBOX_NAME } });
  if (!existing) return;
  // Templates use onDelete: SetNull, not Cascade — remove them explicitly first.
  await prisma.responseTemplate.deleteMany({ where: { projectId: existing.id } });
  await prisma.project.delete({ where: { id: existing.id } }); // cascades emails/clients/team/sla
}

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId ?? ADMIN_USER_ID;

  await wipeSandbox(userId);

  const project = await prisma.project.create({
    data: {
      userId,
      name: SANDBOX_NAME,
      l2Email: "l2.sandbox@example.com",
      baEmail: session.email ?? "ba.sandbox@example.com",
      slaConfig: { create: { thresholdHours: 24 } },
      clientEmails: {
        create: [
          { email: "client.acme@example.com", label: "Acme Corp — primary" },
          { email: "billing@acme-example.com", label: "Acme Corp — billing" },
        ],
      },
      clientProfiles: {
        create: [
          { email: "client.acme@example.com", contactName: "Priya Sharma", role: "Product Owner", company: "Acme Corp", riskLevel: "green", contractEndDate: hoursAgo(-24 * 90) },
          { email: "billing@acme-example.com", contactName: "Ravi Mehta", role: "Finance", company: "Acme Corp", riskLevel: "red", notes: "Contract renewal at risk — slow to respond.", contractEndDate: hoursAgo(24 * 10) },
        ],
      },
      teamMembers: {
        create: [
          { userId, name: "Test L2 (Sandbox)", email: "test.l2@example.com", role: "l2" },
        ],
      },
      templates: {
        create: [
          { userId, name: "[TEST] Invoice follow-up", category: "Billing", body: "Hi {{name}},\n\nFollowing up on the invoice below — could you confirm receipt?\n\nThanks!" },
          { userId, name: "[TEST] Bug ack", category: "Bug", body: "Hi {{name}},\n\nThanks for flagging this — we've logged it and will update you shortly." },
        ],
      },
    },
  });

  // A couple of shared tags (idempotent — tags are per-user, not per-project).
  const [urgentTag, vipTag] = await Promise.all([
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Urgent" } }, update: {}, create: { userId, name: "Urgent", color: "#ef4444" } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "VIP" } }, update: {}, create: { userId, name: "VIP", color: "#6366f1" } }),
  ]);

  const rows = [
    { status: "pending", routingTier: "ba", aiCategory: "Billing", subject: "Invoice #4521 — Arabic translation missing", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Can you confirm the Arabic line items on this invoice before we send it out?", receivedAt: hoursAgo(2), hasAttachments: true, tags: [urgentTag.id] },
    { status: "pending", routingTier: "l2", aiCategory: "Bug", subject: "Portal throwing 500 on export", fromName: "Ravi Mehta", fromEmail: "billing@acme-example.com", snippet: "Getting a server error every time I try to export the March report.", receivedAt: hoursAgo(30), seenVia: "test.l2@example.com", note: "Escalated to eng, awaiting fix ETA." },
    { status: "pending", routingTier: "ba", aiCategory: "Feature", subject: "Any chance of a CSV import option?", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Would love to bulk-upload contacts instead of one at a time.", receivedAt: hoursAgo(5) },
    { status: "pending", routingTier: "l2", aiCategory: "Meeting", subject: "Re: QBR scheduling", fromName: "Ravi Mehta", fromEmail: "billing@acme-example.com", snippet: "Next week works for us, Tuesday afternoon preferred.", receivedAt: hoursAgo(50), seenVia: "test.l2@example.com", followUpAt: hoursAgo(-24) },
    { status: "pending", routingTier: "ba", aiCategory: "Approval", subject: "Sign-off needed on scope change", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Please review and approve the attached SOW addendum.", receivedAt: hoursAgo(1), hasAttachments: true, tags: [vipTag.id] },
    { status: "done", routingTier: "ba", aiCategory: "Update", subject: "Monthly status update — June", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Thanks for the update, all looks good on our end.", receivedAt: hoursAgo(80) },
    { status: "done", routingTier: "l2", aiCategory: "Bug", subject: "Re: Login loop on mobile", fromName: "Ravi Mehta", fromEmail: "billing@acme-example.com", snippet: "Confirmed fixed after the last release, thank you!", receivedAt: hoursAgo(120), seenVia: "test.l2@example.com" },
    { status: "done", routingTier: "ba", aiCategory: "General", subject: "Thanks for the quick turnaround", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Really appreciate how fast this was handled.", receivedAt: hoursAgo(200) },
    { status: "dismissed", routingTier: "ba", aiCategory: "General", subject: "Newsletter: product updates", fromName: "Acme Newsletter", fromEmail: "news@acme-example.com", snippet: "Check out what's new this month.", receivedAt: hoursAgo(150) },
    { status: "dismissed", routingTier: "l2", aiCategory: "Update", subject: "Auto-reply: Out of office", fromName: "Ravi Mehta", fromEmail: "billing@acme-example.com", snippet: "I'm out of office until Monday.", receivedAt: hoursAgo(90), seenVia: "test.l2@example.com" },
    { status: "escalated", routingTier: "ba", aiCategory: "Billing", subject: "URGENT: Payment failed, account at risk", fromName: "Ravi Mehta", fromEmail: "billing@acme-example.com", snippet: "Our payment method was declined and we haven't heard back in days.", receivedAt: hoursAgo(60), escalationNote: "SLA breached — client threatening churn, needs leadership attention.", tags: [urgentTag.id, vipTag.id], note: "Escalated to account manager, call scheduled." },
    { status: "escalated", routingTier: "l2", aiCategory: "Bug", subject: "Data loss reported after sync", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Several records disappeared after last night's sync job.", receivedAt: hoursAgo(40), seenVia: "test.l2@example.com", escalationNote: "Potential data integrity issue — eng investigating.", hasAttachments: true },
    { status: "escalated", routingTier: "ba", aiCategory: "Approval", subject: "Contract renewal — need decision today", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "We need your sign-off by EOD or we'll have to pause the renewal.", receivedAt: hoursAgo(3), escalationNote: "Contract renewal on the line, time-sensitive.", followUpAt: hoursAgo(-2) },
    { status: "pending", routingTier: "ba", aiCategory: "General", subject: "Quick question about SSO setup", fromName: "Priya Sharma", fromEmail: "client.acme@example.com", snippet: "Do you support SAML for our identity provider?", receivedAt: hoursAgo(0.5) },
  ];

  let i = 0;
  for (const r of rows) {
    i += 1;
    const { tags, note, ...data } = r as typeof r & { tags?: string[]; note?: string };
    const created = await prisma.emailStatus.create({
      data: {
        ...data,
        gmailMessageId: `sandbox-${project.id}-${i}`,
        projectId: project.id,
        userId,
        emailTags: tags ? { create: tags.map((tagId) => ({ tagId })) } : undefined,
      },
    });
    if (note) {
      await prisma.note.create({ data: { emailStatusId: created.id, userId, content: note } });
    }
  }

  return NextResponse.json({ ok: true, projectId: project.id, emailCount: rows.length });
}

export async function DELETE() {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId ?? ADMIN_USER_ID;
  await wipeSandbox(userId);
  return NextResponse.json({ ok: true });
}
