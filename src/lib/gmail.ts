import { google } from "googleapis";
import { prisma } from "./prisma";

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    // One consent screen grants both identity (who is this) and Gmail read
    // access — no separate "connect Gmail" step after login.
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
}

/**
 * OAuth flow for a team member (usually L2) connecting their own inbox so
 * emails sent only to them — never CC'd to the BA — stop being invisible.
 * This is a data-access grant, not a login: it never creates a session,
 * it only stores a Gmail token scoped to that team member.
 */
export function getTeamMemberAuthUrl(teamMemberId: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    state: JSON.stringify({ teamMemberId }),
  });
}

/** Fetch the authenticated Google account's identity (email, name, picture). */
export async function getUserInfo(client: InstanceType<typeof google.auth.OAuth2>) {
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return { email: data.email ?? null, name: data.name ?? null, picture: data.picture ?? null };
}

export async function getAuthedClient(userId: string) {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiryDate ? Number(token.expiryDate) : undefined,
  });

  client.on("tokens", async (tokens) => {
    await prisma.gmailToken.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token ?? token.accessToken,
        refreshToken: tokens.refresh_token ?? token.refreshToken,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}

/** Same as getAuthedClient, but for a team member's independently connected mailbox. */
export async function getTeamMemberAuthedClient(teamMemberId: string) {
  const token = await prisma.teamMemberGmailToken.findUnique({ where: { teamMemberId } });
  if (!token) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiryDate ? Number(token.expiryDate) : undefined,
  });

  client.on("tokens", async (tokens) => {
    await prisma.teamMemberGmailToken.update({
      where: { teamMemberId },
      data: {
        accessToken: tokens.access_token ?? token.accessToken,
        refreshToken: tokens.refresh_token ?? token.refreshToken,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
      },
    });
  });

  return client;
}

/** Keyword-based AI category detection */
export function detectCategory(subject: string, snippet: string): string {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (/invoice|billing|payment|charge|refund|receipt|cost|price|quote|subscription/.test(text)) return "Billing";
  if (/bug|error|issue|broken|crash|fail|not working|problem|fix|defect/.test(text)) return "Bug";
  if (/feature|request|enhancement|improvement|suggest|add|new functionality|roadmap/.test(text)) return "Feature";
  if (/meeting|call|schedule|calendar|invite|discuss|sync|chat|catch up/.test(text)) return "Meeting";
  if (/approve|approval|sign off|sign-off|review|confirm|authorize|permission/.test(text)) return "Approval";
  if (/update|status|progress|report|milestone|release|deploy|shipped|done/.test(text)) return "Update";
  return "General";
}

/** Detect if a Gmail message has non-text attachments */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasRealAttachments(payload: any): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0) return true;
  if (payload.parts) {
    for (const part of payload.parts) {
      if (hasRealAttachments(part)) return true;
    }
  }
  return false;
}

/**
 * Fetch emails from a given sender using an already-authenticated client.
 * Used for both the primary BA mailbox and any connected team-member mailbox,
 * so the same fetch/parse logic covers every inbox we ingest from.
 */
export async function fetchEmailsFromSenderWithClient(
  auth: InstanceType<typeof google.auth.OAuth2>,
  fromEmail: string,
  maxResults = 50
) {
  const gmail = google.gmail({ version: "v1", auth });
  const query = `from:${fromEmail}`;

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messages = listRes.data.messages ?? [];

  const detailed = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date", "To", "Cc", "Message-Id", "Message-ID"],
      });

      const headers = detail.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value ?? fromEmail;
      const date = headers.find((h) => h.name === "Date")?.value;
      const toRaw = headers.find((h) => h.name === "To")?.value ?? "";
      const ccRaw = headers.find((h) => h.name === "Cc")?.value ?? "";
      const messageIdHeader = headers.find((h) => h.name?.toLowerCase() === "message-id")?.value ?? null;

      const fromName = from.includes("<")
        ? from.split("<")[0].trim().replace(/"/g, "")
        : from;
      const fromAddress = from.includes("<")
        ? from.split("<")[1].replace(">", "").trim()
        : from;

      const snippet = detail.data.snippet ?? "";
      const aiCategory = detectCategory(subject, snippet);
      const hasAttachments = hasRealAttachments(detail.data.payload);

      // Normalise To/Cc to comma-separated lowercase email lists
      const extractEmails = (raw: string) =>
        raw.split(",").map((p) => {
          const m = p.match(/<([^>]+)>/);
          return (m ? m[1] : p).trim().toLowerCase();
        }).filter(Boolean).join(",");

      return {
        gmailMessageId: msg.id!,
        threadId: detail.data.threadId ?? null,
        messageIdHeader,
        subject,
        fromEmail: fromAddress,
        fromName,
        snippet,
        receivedAt: date ? new Date(date) : null,
        aiCategory,
        hasAttachments,
        toEmails: extractEmails(toRaw),
        ccEmails: extractEmails(ccRaw),
      };
    })
  );

  return detailed;
}

/** Back-compat wrapper: fetch using the primary BA (login session) mailbox. */
export async function fetchEmailsFromSender(
  userId: string,
  fromEmail: string,
  maxResults = 50
) {
  const auth = await getAuthedClient(userId);
  if (!auth) throw new Error("Gmail not connected");
  return fetchEmailsFromSenderWithClient(auth, fromEmail, maxResults);
}
