import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kvAvailable, kvGet, kvSet, userKey } from "@/lib/kv";

export const runtime = "nodejs";

const MAX_CRITERIA_CHARS = 100_000;

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!kvAvailable()) {
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 501 }
    );
  }
  try {
    const criteria = await kvGet(userKey("criteria", email));
    return NextResponse.json({ criteria });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage read failed." },
      { status: 502 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!kvAvailable()) {
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 501 }
    );
  }
  let criteria = "";
  try {
    const body = await req.json();
    criteria = String(body?.criteria ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!criteria.trim() || criteria.length > MAX_CRITERIA_CHARS) {
    return NextResponse.json(
      { error: `Criteria must be 1–${MAX_CRITERIA_CHARS} characters.` },
      { status: 400 }
    );
  }
  try {
    await kvSet(userKey("criteria", email), criteria);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage write failed." },
      { status: 502 }
    );
  }
}
