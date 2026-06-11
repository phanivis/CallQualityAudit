// Minimal Upstash Redis REST client (compatible with Vercel KV env vars).
// When unconfigured, callers return 501 and the client falls back to
// localStorage keyed by user email.

const url =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvAvailable(): boolean {
  return Boolean(url && token);
}

async function cmd<T>(command: string[]): Promise<T> {
  const res = await fetch(url!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV request failed (${res.status})`);
  }
  const data = (await res.json()) as { result: T; error?: string };
  if (data.error) throw new Error(`KV error: ${data.error}`);
  return data.result;
}

export const kvGet = (key: string) => cmd<string | null>(["GET", key]);

export const kvSet = (key: string, value: string) =>
  cmd<string>(["SET", key, value]);

// Returns a flat [field, value, field, value, ...] array.
export const kvHGetAll = (key: string) => cmd<string[]>(["HGETALL", key]);

export const kvHSet = (key: string, field: string, value: string) =>
  cmd<number>(["HSET", key, field, value]);

export const kvHDel = (key: string, field: string) =>
  cmd<number>(["HDEL", key, field]);

export function userKey(kind: "criteria" | "history", email: string): string {
  return `cqa:${kind}:${email.trim().toLowerCase()}`;
}
