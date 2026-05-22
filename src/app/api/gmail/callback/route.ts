import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));
  const userId = session.userId!;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  await prisma.gmailToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
    },
    update: {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
    },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
