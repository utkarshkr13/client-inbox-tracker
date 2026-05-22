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
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
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

  // Auto-refresh if expired
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

export async function fetchEmailsFromSender(
  userId: string,
  fromEmail: string,
  maxResults = 50
) {
  const auth = await getAuthedClient(userId);
  if (!auth) throw new Error("Gmail not connected");

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
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = detail.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value ?? fromEmail;
      const date = headers.find((h) => h.name === "Date")?.value;

      const fromName = from.includes("<")
        ? from.split("<")[0].trim().replace(/"/g, "")
        : from;
      const fromAddress = from.includes("<")
        ? from.split("<")[1].replace(">", "").trim()
        : from;

      return {
        gmailMessageId: msg.id!,
        subject,
        fromEmail: fromAddress,
        fromName,
        snippet: detail.data.snippet ?? "",
        receivedAt: date ? new Date(date) : null,
      };
    })
  );

  return detailed;
}
