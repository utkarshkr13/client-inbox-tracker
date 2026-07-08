import { NextResponse } from "next/server";
import { getTeamMemberAuthUrl } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

// Public on purpose: the person granting access (usually L2) has no login or
// session in this app at all — they just need a link that starts the Google
// consent flow for their own mailbox, nothing more.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.redirect(new URL("/", req.url));

  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.redirect(new URL("/", req.url));

  const url = getTeamMemberAuthUrl(memberId);
  return NextResponse.redirect(url);
}
