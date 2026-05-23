import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profiles = await prisma.clientProfile.findMany({ where: { projectId: id } });
  return NextResponse.json(profiles);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email, contactName, role, company, contractEndDate, riskLevel, notes } = await req.json();
  const profile = await prisma.clientProfile.upsert({
    where: { projectId_email: { projectId: id, email } },
    create: { projectId: id, email, contactName, role, company, contractEndDate: contractEndDate ? new Date(contractEndDate) : null, riskLevel: riskLevel ?? "green", notes },
    update: { contactName, role, company, contractEndDate: contractEndDate ? new Date(contractEndDate) : null, riskLevel, notes },
  });
  return NextResponse.json(profile);
}
