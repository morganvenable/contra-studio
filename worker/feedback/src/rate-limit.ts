import type { D1Database } from "./env.ts";

export const WINDOW_SECONDS = 3600;

/**
 * Salted hash of the IP address and the hour. The raw address is never
 * stored, and the same visitor gets an unrelated key every hour.
 */
export async function visitorKey(
  ip: string,
  salt: string,
  windowStart: number,
) {
  const bytes = new TextEncoder().encode(`${salt}\n${ip}\n${windowStart}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Counts one submission and says whether it is within the hourly limit. */
export async function takeRateToken(
  db: D1Database,
  ip: string,
  salt: string,
  limit: number,
  nowMs: number,
): Promise<RateDecision> {
  const now = Math.floor(nowMs / 1000);
  const windowStart = now - (now % WINDOW_SECONDS);
  const key = await visitorKey(ip, salt, windowStart);
  await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(windowStart)
    .run();
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first<{ count: number }>();
  const count = Number(row?.count ?? 1);
  return {
    allowed: count <= limit,
    retryAfterSeconds: windowStart + WINDOW_SECONDS - now,
  };
}
