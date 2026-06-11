import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kvAvailable, kvHGetAll, kvHSet, kvHDel, userKey } from "@/lib/kv";
import type { CallAuditRecord } from "@/lib/evaluation";

export const runtime = "nodejs";

// Keep individual records inside Upstash's request-size comfort zone.
const MAX_RECORD_BYTES = 900_000;

async function requireEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

export async function GET() {
  const email = await requireEmail();
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
    const flat = await kvHGetAll(userKey("history", email));
    const records: CallAuditRecord[] = [];
    for (let i = 1; i < flat.length; i += 2) {
      try {
        records.push(JSON.parse(flat[i]) as CallAuditRecord);
      } catch {
        // skip corrupt entries
      }
    }
    records.sort((a, b) => (a.evaluated_at < b.evaluated_at ? 1 : -1));
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage read failed." },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  const email = await requireEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!kvAvailable()) {
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 501 }
    );
  }
  let record: CallAuditRecord;
  try {
    record = (await req.json()) as CallAuditRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!record?.id || !record.file_name || !record.evaluation || !record.evaluated_at) {
    return NextResponse.json(
      { error: "Record must include id, file_name, evaluation, evaluated_at." },
      { status: 400 }
    );
  }
  let serialized = JSON.stringify(record);
  if (serialized.length > MAX_RECORD_BYTES) {
    // Trim the transcript rather than losing the audit.
    serialized = JSON.stringify({
      ...record,
      transcript: record.transcript.slice(0, 200_000) + "\n…[truncated for storage]",
    });
  }
  try {
    await kvHSet(userKey("history", email), record.id, serialized);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage write failed." },
      { status: 502 }
    );
  }
}

export async function DELETE(req: Request) {
  const email = await requireEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!kvAvailable()) {
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 501 }
    );
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }
  try {
    await kvHDel(userKey("history", email), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage delete failed." },
      { status: 502 }
    );
  }
}
