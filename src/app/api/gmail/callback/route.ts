import { NextResponse } from "next/server";
import { getOAuthClient, getUserInfo } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { getSession, ADMIN_USER_ID, isAllowedEmail } from "@/lib/session";
import { google } from "googleapis";

/**
 * Single callback for the unified Google flow.
 *
 * - First-time visitor (no session yet): this doubles as login. We check the
 *   Google account's email against the allow-list, and if it passes we create
 *   the session right here — no separate password step.
 * - Already logged in (Settings → Reconnect Gmail): same code path just
 *   refreshes the stored token instead of creating a new session.
 *
 * Either way the token we receive already carries the gmail.readonly scope,
 * so there's nothing further for the user to configure.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/login?error=denied`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=no_code`, req.url));
  }

  const client = getOAuthClient();
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    return NextResponse.redirect(new URL(`/login?error=token_exchange`, req.url));
  }
  client.setCredentials(tokens);

  // Identify the Google account. This is what makes the login step
  // unnecessary — the same grant tells us both "who" and "can we read mail."
  let identity: { email: string | null; name: string | null; picture: string | null };
  try {
    identity = await getUserInfo(client);
  } catch {
    identity = { email: null, name: null, picture: null };
  }

  const session = await getSession();
  const alreadyLoggedIn = !!session.isLoggedIn;

  if (!alreadyLoggedIn) {
    if (!isAllowedEmail(identity.email)) {
      return NextResponse.redirect(new URL(`/login?error=not_allowed`, req.url));
    }
    session.isLoggedIn = true;
    session.userId = ADMIN_USER_ID;
    session.email = identity.email ?? undefined;
    session.name = identity.name ?? undefined;
    session.picture = identity.picture ?? undefined;
    await session.save();
  }

  const userId = session.userId ?? ADMIN_USER_ID;

  // Prefer the Gmail profile address for To/CC routing (it's the mailbox
  // being read, which is what matters for BA/L2 matching), falling back to
  // the OAuth identity email.
  let gmailEmail: string | null = identity.email;
  try {
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    gmailEmail = profile.data.emailAddress ?? gmailEmail;
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

  const dest = alreadyLoggedIn ? "/dashboard/settings?reconnected=1" : "/dashboard?welcome=1";
  return NextResponse.redirect(new URL(dest, req.url));
}
