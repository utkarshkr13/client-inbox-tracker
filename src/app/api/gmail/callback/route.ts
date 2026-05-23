import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));
  const userId = session.userId!;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch the BA's Gmail address so we can use it for To/CC routing
  let gmailEmail: string | null = null;
  try {
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    gmailEmail = profile.data.emailAddress ?? null;
  } catch {}

  await prisma.gmailToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      gmailEmail,
    },
    update: {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
      ...(gmailEmail ? { gmailEmail } : {}),
    },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
