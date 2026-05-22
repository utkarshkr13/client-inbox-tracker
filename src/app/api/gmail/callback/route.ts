import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
