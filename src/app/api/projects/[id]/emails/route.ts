import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchEmailsFromSender } from "@/lib/gmail";

// GET: fetch & sync emails for a project from Gmail
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id, userId },
    include: { clientEmails: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gmailToken = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!gmailToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  // Fetch emails from each client email address
  const allEmails = await Promise.allSettled(
    project.clientEmails.map((ce: { email: string }) => fetchEmailsFromSender(userId, ce.email))
  );

  const fetched: {
    gmailMessageId: string;
    subject: string;
    fromEmail: string;
    fromName: string;
    snippet: string;
    receivedAt: Date | null;
  }[] = [];

  for (const result of allEmails) {
    if (result.status === "fulfilled") {
      fetched.push(...result.value);
    }
  }

  // Upsert into EmailStatus (preserve existing status)
  for (const email of fetched) {
    await prisma.emailStatus.upsert({
      where: { gmailMessageId_projectId: { gmailMessageId: email.gmailMessageId, projectId: id } },
      create: {
        gmailMessageId: email.gmailMessageId,
        projectId: id,
        userId,
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        status: "pending",
      },
      update: {
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
      },
    });
  }

  const statuses = await prisma.emailStatus.findMany({
    where: { projectId: id, userId },
    orderBy: { receivedAt: "desc" },
  });

  return NextResponse.json({ synced: fetched.length, emails: statuses });
}

// PATCH: update status of a single email
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gmailMessageId, status } = await req.json();
  if (!["pending", "done", "dismissed"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.emailStatus.update({
    where: { gmailMessageId_projectId: { gmailMessageId, projectId: id } },
    data: { status },
  });

  return NextResponse.json(updated);
}
