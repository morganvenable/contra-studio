/**
 * Contra Studio feedback Worker.
 *
 *   POST  /feedback        a dancer's note plus the app's captured context
 *   GET   /feedback        owner only: list notes (?status=&dance=&since=&limit=)
 *   PATCH /feedback/:id    owner only: set status (new, fixed, wontfix)
 *   GET   /health          liveness check
 */
import { ownerAuthorized } from "./auth.ts";
import { corsHeaders, originAllowed, parseOrigins } from "./cors.ts";
import type { Deps, Env } from "./env.ts";
import { takeRateToken } from "./rate-limit.ts";
import { verifyTurnstile } from "./turnstile.ts";
import {
  MAX_BODY_BYTES,
  STATUSES,
  validateStatusUpdate,
  validateSubmission,
  type FeedbackStatus,
} from "./validate.ts";

export type { Env } from "./env.ts";

const defaultDeps: Deps = {
  now: () => Date.now(),
  fetch: (input, init) => fetch(input, init),
  randomId: () => crypto.randomUUID(),
};

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

const fail = (
  status: number,
  error: string,
  headers?: Record<string, string>,
) => json(status, { ok: false, error }, headers);

/** Reads a body up to `limit` bytes; returns null when it is larger. */
async function readLimited(
  request: Request,
  limit: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > limit) return null;
  return new TextDecoder().decode(buffer);
}

async function submit(
  request: Request,
  env: Env,
  deps: Deps,
  cors: Record<string, string>,
) {
  const salt = env.RATE_LIMIT_SALT;
  const turnstileOn = env.TURNSTILE_ENABLED !== "false";
  if (!salt || (turnstileOn && !env.TURNSTILE_SECRET_KEY))
    return fail(503, "Feedback is not set up yet.", cors);

  const body = await readLimited(request, MAX_BODY_BYTES);
  if (body === null) return fail(413, "That note is too long to send.", cors);

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limit = Math.max(1, Number(env.RATE_LIMIT_PER_HOUR) || 10);
  const rate = await takeRateToken(env.DB, ip, salt, limit, deps.now());
  if (!rate.allowed)
    return fail(429, "Too many notes for now. Please try again later.", {
      ...cors,
      "Retry-After": String(rate.retryAfterSeconds),
    });

  const result = validateSubmission(body);
  if (!result.ok) return fail(400, result.error, cors);
  const { message, name, context, turnstileToken } = result.value;

  if (
    turnstileOn &&
    !(await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY!,
      deps.fetch,
    ))
  )
    return fail(403, "The spam check did not pass. Please try again.", cors);

  const id = deps.randomId();
  const now = new Date(deps.now()).toISOString();
  await env.DB.prepare(
    `INSERT INTO feedback (id, created_at, updated_at, status, message, name,
       dance_id, dance_title, figure_index, figure_label, beat, context)
     VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      now,
      now,
      message,
      name,
      context.danceId,
      context.danceTitle,
      context.figureIndex,
      context.figureLabel,
      context.beat,
      JSON.stringify(context),
    )
    .run();
  return json(201, { ok: true, id }, cors);
}

interface FeedbackRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: FeedbackStatus;
  status_note: string | null;
  message: string;
  name: string | null;
  context: string;
}

const present = (row: FeedbackRow) => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  status: row.status,
  statusNote: row.status_note,
  message: row.message,
  name: row.name,
  context: JSON.parse(row.context) as unknown,
});

async function list(url: URL, env: Env) {
  const where: string[] = [];
  const values: unknown[] = [];
  const status = url.searchParams.get("status");
  if (status) {
    if (!STATUSES.includes(status as FeedbackStatus))
      return fail(400, `Status must be one of ${STATUSES.join(", ")}.`);
    where.push("status = ?");
    values.push(status);
  }
  const dance = url.searchParams.get("dance");
  if (dance) {
    where.push("dance_id = ?");
    values.push(dance);
  }
  const since = url.searchParams.get("since");
  if (since) {
    where.push("created_at >= ?");
    values.push(since);
  }
  const limit = Math.min(
    1000,
    Math.max(1, Number(url.searchParams.get("limit")) || 500),
  );
  const rows = await env.DB.prepare(
    `SELECT id, created_at, updated_at, status, status_note, message, name, context
     FROM feedback ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(...values, limit)
    .all<FeedbackRow>();
  return json(200, { ok: true, items: rows.results.map(present) });
}

async function setStatus(id: string, request: Request, env: Env, deps: Deps) {
  const body = await readLimited(request, 4096);
  if (body === null) return fail(413, "Request too large.");
  const update = validateStatusUpdate(body);
  if (!update.ok) return fail(400, update.error);
  const row = await env.DB.prepare(
    `UPDATE feedback SET status = ?, status_note = ?, updated_at = ?
     WHERE id = ?
     RETURNING id, created_at, updated_at, status, status_note, message, name, context`,
  )
    .bind(update.status, update.note, new Date(deps.now()).toISOString(), id)
    .first<FeedbackRow>();
  return row
    ? json(200, { ok: true, item: present(row) })
    : fail(404, "No such note.");
}

export async function handle(
  request: Request,
  env: Env,
  deps: Deps = defaultDeps,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/health" && request.method === "GET")
    return json(200, { ok: true });

  if (
    path === "/feedback" &&
    (request.method === "POST" || request.method === "OPTIONS")
  ) {
    const origin = request.headers.get("Origin");
    if (!originAllowed(origin, parseOrigins(env.ALLOWED_ORIGINS)))
      return fail(403, "This site may not send feedback here.");
    const cors = corsHeaders(origin!);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    return submit(request, env, deps, cors);
  }

  const ownerRoute =
    (path === "/feedback" && request.method === "GET") ||
    (/^\/feedback\/[^/]+$/.test(path) && request.method === "PATCH");
  if (ownerRoute) {
    if (!env.OWNER_TOKEN) return fail(503, "Owner access is not set up.");
    if (
      !(await ownerAuthorized(
        request.headers.get("Authorization"),
        env.OWNER_TOKEN,
      ))
    )
      return fail(401, "Unauthorized.", { "WWW-Authenticate": "Bearer" });
    if (request.method === "GET") return list(url, env);
    return setStatus(
      decodeURIComponent(path.slice("/feedback/".length)),
      request,
      env,
      deps,
    );
  }

  return fail(404, "Not found.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(
        "feedback worker error",
        error instanceof Error ? error.message : error,
      );
      return fail(500, "Something went wrong. Please try again.");
    }
  },
};
