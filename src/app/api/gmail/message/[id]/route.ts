import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthedClient } from "@/lib/gmail";
import { getSession } from "@/lib/session";

function decodeBase64(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextBody(part: any): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64(part.body.data);
  }
  if (part.parts) {
    for (const sub of part.parts) {
      const text = extractTextBody(sub);
      if (text) return text;
    }
  }
  return "";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await getAuthedClient(session.userId!);
  if (!auth)
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  try {
    const gmail = google.gmail({ version: "v1", auth });
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const body = extractTextBody(msg.data.payload ?? {});
    return NextResponse.json({
      body: body || msg.data.snippet || "(no content)",
      snippet: msg.data.snippet,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
