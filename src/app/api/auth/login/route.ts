import { NextResponse } from "next/server";
import { getSession, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.userId = ADMIN_USER_ID;
  await session.save();

  return NextResponse.json({ ok: true });
}
