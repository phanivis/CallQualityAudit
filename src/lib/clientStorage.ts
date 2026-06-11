"use client";

import type { CallAuditRecord } from "@/lib/evaluation";

// Unified per-user persistence. Uses the server storage API (Vercel KV /
// Upstash Redis) when configured; otherwise falls back to localStorage keyed
// by the signed-in user's email, so the app works with zero extra setup.

function lsKey(kind: "criteria" | "history", email: string): string {
  return `cqa:${kind}:${email.trim().toLowerCase()}`;
}

function lsReadHistory(email: string): CallAuditRecord[] {
  try {
    const raw = localStorage.getItem(lsKey("history", email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CallAuditRecord[]) : [];
  } catch {
    return [];
  }
}

function lsWriteHistory(email: string, records: CallAuditRecord[]) {
  // On quota errors, drop the oldest records (and transcripts) until it fits.
  let working = [...records].sort((a, b) =>
    a.evaluated_at < b.evaluated_at ? 1 : -1
  );
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      localStorage.setItem(lsKey("history", email), JSON.stringify(working));
      return;
    } catch {
      if (working.length > 1) {
        working = working.slice(0, Math.ceil(working.length / 2));
      } else {
        working = working.map((r) => ({ ...r, transcript: "" }));
      }
    }
  }
}

export async function loadCriteria(email: string): Promise<string | null> {
  try {
    const res = await fetch("/api/criteria");
    if (res.ok) {
      const data = await res.json();
      if (typeof data.criteria === "string" && data.criteria.trim()) {
        return data.criteria;
      }
      return null; // server storage active but nothing saved yet
    }
  } catch {
    // network error — fall through to local
  }
  try {
    return localStorage.getItem(lsKey("criteria", email));
  } catch {
    return null;
  }
}

export async function saveCriteria(email: string, criteria: string): Promise<void> {
  try {
    const res = await fetch("/api/criteria", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria }),
    });
    if (res.ok) return;
  } catch {
    // fall through to local
  }
  try {
    localStorage.setItem(lsKey("criteria", email), criteria);
  } catch {
    // storage full — nothing further we can do
  }
}

export async function loadHistory(email: string): Promise<CallAuditRecord[]> {
  try {
    const res = await fetch("/api/history");
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.records) ? data.records : [];
    }
  } catch {
    // fall through to local
  }
  return lsReadHistory(email);
}

export async function saveAuditRecord(
  email: string,
  record: CallAuditRecord
): Promise<void> {
  try {
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (res.ok) return;
  } catch {
    // fall through to local
  }
  const existing = lsReadHistory(email).filter((r) => r.id !== record.id);
  lsWriteHistory(email, [record, ...existing]);
}

export async function deleteAuditRecord(
  email: string,
  id: string
): Promise<void> {
  try {
    const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) return;
  } catch {
    // fall through to local
  }
  lsWriteHistory(
    email,
    lsReadHistory(email).filter((r) => r.id !== id)
  );
}
