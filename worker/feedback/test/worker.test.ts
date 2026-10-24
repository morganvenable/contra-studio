import assert from "node:assert/strict";
import { test } from "node:test";
import { handle, type Env } from "../src/index.ts";
import { originAllowed, parseOrigins } from "../src/cors.ts";
import { ownerAuthorized } from "../src/auth.ts";
import { MAX_MESSAGE_CHARS, validateSubmission } from "../src/validate.ts";
import type { Deps } from "../src/env.ts";
import { createTestDb, type TestDb } from "./d1-sqlite.ts";

const SITE = "https://morganvenable.github.io";
const TOKEN = "owner-token-for-tests-0123456789";
const ORIGINS = [
  "https://morganvenable.github.io",
  "http://localhost:*",
  "http://127.0.0.1:*",
  "http://sval.localhost",
  "http://sval.localhost:*",
].join(",");

const context = {
  danceId: "2321",
  danceTitle: "Debra's Dance",
  figureIndex: 3,
  figureLabel: "Rory O'More right",
  beat: 21.5,
  beatInDance: 21.5,
  totalBeats: 64,
  repeat: 0,
  camera: "perspective",
  followDancerId: null,
  engine: "next",
  commit: "9a270b0",
  clientTime: "2026-10-24T12:00:00.000Z",
  page: "/contra/?ready=2321",
  viewport: { width: 1440, height: 1000 },
};

function setup(overrides: Partial<Env> = {}) {
  let clock = Date.parse("2026-10-24T12:00:00Z");
  let ids = 0;
  const turnstileCalls: string[] = [];
  const env: Env = {
    DB: createTestDb(),
    ALLOWED_ORIGINS: ORIGINS,
    TURNSTILE_ENABLED: "false",
    RATE_LIMIT_PER_HOUR: "3",
    RATE_LIMIT_SALT: "salt",
    OWNER_TOKEN: TOKEN,
    ...overrides,
  };
  const deps: Deps = {
    now: () => clock,
    randomId: () => `note-${++ids}`,
    fetch: async (_url, init) => {
      const token = (init?.body as FormData).get("response") as string;
      turnstileCalls.push(token);
      return new Response(JSON.stringify({ success: token === "good" }));
    },
  };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    handle(
      new Request("https://feedback.example/feedback", {
        method: "POST",
        headers: {
          Origin: SITE,
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.7",
          ...headers,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      env,
      deps,
    );
  const owner = (path: string, init: RequestInit = {}, token = TOKEN) =>
    handle(
      new Request(`https://feedback.example${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
      deps,
    );
  const advance = (ms: number) => {
    clock += ms;
  };
  return { env, deps, post, owner, turnstileCalls, advance };
}

test("validation accepts a note and keeps only known context fields", () => {
  const result = validateSubmission(
    JSON.stringify({
      message: "  The swing\u0007 drifts.  ",
      name: "Ana",
      context: { ...context, secret: "dropped", beat: "21" },
    }),
  );
  assert.ok(result.ok);
  assert.equal(result.value.message, "The swing drifts.");
  assert.equal(result.value.context.figureLabel, "Rory O'More right");
  assert.equal(result.value.context.beat, null);
  assert.equal("secret" in result.value.context, false);
});

test("validation rejects empty, oversized and context-free notes", () => {
  const bad = [
    "not json",
    "[]",
    JSON.stringify({ message: "   ", context }),
    JSON.stringify({ message: "x".repeat(MAX_MESSAGE_CHARS + 1), context }),
    JSON.stringify({ message: "ok", name: 5, context }),
    JSON.stringify({ message: "ok", name: "n".repeat(81), context }),
    JSON.stringify({ message: "ok" }),
    JSON.stringify({ message: "ok", context: { danceTitle: "No id" } }),
  ];
  for (const body of bad)
    assert.equal(validateSubmission(body).ok, false, body);
});

test("POST stores the note with its dance, figure and beat", async () => {
  const { post, owner } = setup();
  const response = await post({
    message: "Robins collide here",
    name: "Ana",
    context,
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), SITE);
  assert.deepEqual(await response.json(), { ok: true, id: "note-1" });

  const listed = await (await owner("/feedback")).json();
  assert.equal(listed.items.length, 1);
  const [item] = listed.items;
  assert.equal(item.message, "Robins collide here");
  assert.equal(item.name, "Ana");
  assert.equal(item.status, "new");
  assert.equal(item.context.danceId, "2321");
  assert.equal(item.context.figureIndex, 3);
  assert.equal(item.context.beat, 21.5);
});

test("POST rejects bodies over the size limit", async () => {
  const { post } = setup();
  const response = await post({
    message: "a",
    context,
    pad: "x".repeat(20_000),
  });
  assert.equal(response.status, 413);
});

test("CORS allows only the listed origins", async () => {
  const allowed = parseOrigins(ORIGINS);
  assert.equal(originAllowed(SITE, allowed), true);
  assert.equal(originAllowed("http://localhost:5173", allowed), true);
  assert.equal(originAllowed("http://sval.localhost", allowed), true);
  assert.equal(originAllowed("http://localhost", allowed), false);
  assert.equal(originAllowed("https://evil.github.io", allowed), false);
  assert.equal(
    originAllowed("https://morganvenable.github.io.evil.com", allowed),
    false,
  );
  assert.equal(originAllowed(`${SITE}/path`, allowed), false);
  assert.equal(originAllowed(null, allowed), false);

  const { post, env } = setup();
  const blocked = await post(
    { message: "hi", context },
    { Origin: "https://evil.example" },
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("Access-Control-Allow-Origin"), null);
  const noOrigin = await handle(
    new Request("https://feedback.example/feedback", {
      method: "POST",
      body: JSON.stringify({ message: "hi", context }),
    }),
    env,
  );
  assert.equal(noOrigin.status, 403);

  const preflight = await handle(
    new Request("https://feedback.example/feedback", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    }),
    env,
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  assert.match(preflight.headers.get("Access-Control-Allow-Methods")!, /POST/);
});

test("rate limit allows the hourly quota, then resets next hour", async () => {
  const { post, advance, env } = setup();
  for (let i = 0; i < 3; i++)
    assert.equal((await post({ message: `note ${i}`, context })).status, 201);
  const limited = await post({ message: "one too many", context });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);

  const other = await post(
    { message: "different visitor", context },
    { "CF-Connecting-IP": "198.51.100.2" },
  );
  assert.equal(other.status, 201);

  advance(3600_000);
  assert.equal((await post({ message: "next hour", context })).status, 201);

  const raw = (env.DB as TestDb).raw;
  const keys = raw
    .prepare("SELECT key, window_start FROM rate_limits")
    .all() as {
    key: string;
  }[];
  assert.equal(keys.length, 1, "last hour's counters were deleted");
  assert.ok(
    keys.every((row) => /^[0-9a-f]{64}$/.test(row.key)),
    "only hashes stored",
  );
  const dump = JSON.stringify(raw.prepare("SELECT * FROM feedback").all());
  assert.equal(
    dump.includes("203.0.113.7"),
    false,
    "no IP address in feedback rows",
  );
});

test("Turnstile is verified when enabled", async () => {
  const { post, turnstileCalls } = setup({
    TURNSTILE_ENABLED: "true",
    TURNSTILE_SECRET_KEY: "secret",
  });
  assert.equal((await post({ message: "no token", context })).status, 403);
  assert.equal(
    (await post({ message: "bad", context, turnstileToken: "bad" })).status,
    403,
  );
  assert.equal(
    (await post({ message: "ok", context, turnstileToken: "good" })).status,
    201,
  );
  assert.deepEqual(turnstileCalls, ["bad", "good"]);
});

test("Turnstile enabled without a secret refuses rather than skipping", async () => {
  const { post } = setup({ TURNSTILE_ENABLED: "true" });
  assert.equal((await post({ message: "hi", context })).status, 503);
});

test("owner endpoints need the bearer token", async () => {
  const { owner, post, env } = setup();
  await post({ message: "hi", context });
  assert.equal(
    (await owner("/feedback", {}, "wrong-token-wrong-token")).status,
    401,
  );
  const anonymous = await handle(
    new Request("https://feedback.example/feedback"),
    env,
  );
  assert.equal(anonymous.status, 401);
  const patchAnonymous = await handle(
    new Request("https://feedback.example/feedback/note-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "fixed" }),
    }),
    env,
  );
  assert.equal(patchAnonymous.status, 401);
  assert.equal(
    await ownerAuthorized("Bearer short", "short"),
    false,
    "short tokens refused",
  );
  assert.equal(await ownerAuthorized(`Bearer ${TOKEN}`, TOKEN), true);
  const unset = setup({ OWNER_TOKEN: undefined });
  assert.equal((await unset.owner("/feedback")).status, 503);
});

test("owner can filter and set status", async () => {
  const { owner, post } = setup();
  await post({ message: "first", context });
  await post({
    message: "other dance",
    context: { ...context, danceId: "99" },
  });

  const byDance = await (await owner("/feedback?dance=99")).json();
  assert.deepEqual(
    byDance.items.map((item: { message: string }) => item.message),
    ["other dance"],
  );

  const patched = await owner("/feedback/note-1", {
    method: "PATCH",
    body: JSON.stringify({ status: "fixed", note: "Swing radius corrected" }),
  });
  assert.equal(patched.status, 200);
  const { item } = await patched.json();
  assert.equal(item.status, "fixed");
  assert.equal(item.statusNote, "Swing radius corrected");

  const fresh = await (await owner("/feedback?status=new")).json();
  assert.deepEqual(
    fresh.items.map((entry: { id: string }) => entry.id),
    ["note-2"],
  );

  const invalid = await owner("/feedback/note-1", {
    method: "PATCH",
    body: JSON.stringify({ status: "done" }),
  });
  assert.equal(invalid.status, 400);
  const missing = await owner("/feedback/nope", {
    method: "PATCH",
    body: JSON.stringify({ status: "wontfix" }),
  });
  assert.equal(missing.status, 404);
});

test("POST without a salt is refused", async () => {
  const { post } = setup({ RATE_LIMIT_SALT: undefined });
  assert.equal((await post({ message: "hi", context })).status, 503);
});
