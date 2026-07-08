import { NextResponse } from "next/server";
import { getOAuthClient, getUserInfo } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

/**
 * Callback for a team member connecting their own mailbox. Unlike the
 * primary login flow, this never touches the session — it only stores a
 * Gmail token scoped to that TeamMember row so the next sync can read
 * their inbox too.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(new URL(`/team-connected?error=1`, req.url));
  }

  let teamMemberId: string;
  try {
    ({ teamMemberId } = JSON.parse(state));
  } catch {
    return NextResponse.redirect(new URL(`/team-connected?error=1`, req.url));
  }

  const member = await prisma.teamMember.findUnique({ where: { id: teamMemberId } });
  if (!member) return NextResponse.redirect(new URL(`/team-connected?error=1`, req.url));

  const client = getOAuthClient();
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    return NextResponse.redirect(new URL(`/team-connected?error=1`, req.url));
  }
  client.setCredentials(tokens);

  let identity: { email: string | null } = { email: null };
  try {
    identity = await getUserInfo(client);
  } catch {}

  await prisma.teamMemberGmailToken.upsert({
    where: { teamMemberId },
    create: {
      teamMemberId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      gmailEmail: identity.email ?? member.email,
    },
    update: {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
      gmailEmail: identity.email ?? member.email,
    },
  });

  return NextResponse.redirect(new URL(`/team-connected?ok=1&name=${encodeURIComponent(member.name)}`, req.url));
}
