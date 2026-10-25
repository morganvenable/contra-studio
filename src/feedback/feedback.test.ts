import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FeedbackOutbox,
  feedbackUrl,
  sendFeedback,
  type FeedbackPayload,
} from "./client.ts";
import {
  captureContext,
  describeContext,
  type FeedbackStateView,
} from "./context.ts";

const state: FeedbackStateView = {
  dance: {
    id: "2321",
    title: "Debra's Dance",
    author: "Example Author",
    figures: [
      { label: "Neighbor balance & swing", beats: 16 },
      { label: "Long lines", beats: 8 },
      { label: "Robins chain", beats: 8 },
      { label: "Rory O'More right", beats: 4 },
    ],
  },
  beat: 64 + 33.25,
  totalBeats: 64,
  repeat: 1,
  figureIndex: 3,
  camera: "dancer",
  selectedDancer: 4,
  dancers: Array.from({ length: 12 }, (_, id) => ({
    id,
    name: `Dancer ${id}`,
  })),
};

const env = {
  engine: "next" as const,
  commit: "abc1234",
  now: new Date("2026-10-24T12:00:00Z"),
  page: "/contra/?ready=2321",
  viewport: { width: 1440, height: 1000 },
};

test("captureContext records dance, figure, beat, camera, follow and build", () => {
  const context = captureContext(state, env);
  assert.deepEqual(context, {
    danceId: "2321",
    danceTitle: "Debra's Dance",
    danceAuthor: "Example Author",
    figureIndex: 3,
    figureLabel: "Rory O'More right",
    figureCount: 4,
    phrase: "B1",
    beat: 97.25,
    beatInDance: 33.25,
    totalBeats: 64,
    repeat: 1,
    camera: "dancer",
    followDancerId: 4,
    followDancerName: "Dancer 4",
    couples: 6,
    engine: "next",
    commit: "abc1234",
    clientTime: "2026-10-24T12:00:00.000Z",
    page: "/contra/?ready=2321",
    viewport: { width: 1440, height: 1000 },
  });
});

test("captureContext handles everyone-view and out-of-range figures", () => {
  const context = captureContext(
    {
      ...state,
      selectedDancer: -1,
      figureIndex: 99,
      beat: Number.NaN,
      repeat: 0,
    },
    env,
  );
  assert.equal(context.followDancerId, null);
  assert.equal(context.followDancerName, null);
  assert.equal(context.figureIndex, null);
  assert.equal(context.figureLabel, null);
  assert.equal(context.beat, 0);
});

test("describeContext reads like a sentence a dancer recognizes", () => {
  assert.equal(
    describeContext(captureContext(state, env)),
    "Debra's Dance · figure 4 of 4: Rory O'More right · B1 · beat 34 of 64 · " +
      "time 2 through · following Dancer 4 · dancer view",
  );
});

const payload: FeedbackPayload = {
  message: "The robins bump during the chain.",
  name: null,
  context: captureContext(state, env),
  turnstileToken: null,
};

function fakeFetch(responses: (Response | Error)[]) {
  const calls: { url: string; body: string }[] = [];
  const impl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) });
    const next = responses.shift();
    if (!next || next instanceof Error) throw next ?? new Error("no response");
    return next;
  };
  return { impl, calls };
}

const created = () =>
  new Response(JSON.stringify({ ok: true, id: "note-1" }), { status: 201 });

test("feedbackUrl joins the endpoint without doubling slashes", () => {
  assert.equal(
    feedbackUrl("http://127.0.0.1:8787/"),
    "http://127.0.0.1:8787/feedback",
  );
  assert.equal(
    feedbackUrl("https://x.workers.dev"),
    "https://x.workers.dev/feedback",
  );
});

test("sendFeedback posts JSON and returns the stored id", async () => {
  const { impl, calls } = fakeFetch([created()]);
  const result = await sendFeedback("http://127.0.0.1:8787", payload, impl);
  assert.deepEqual(result, { ok: true, id: "note-1" });
  assert.equal(calls[0].url, "http://127.0.0.1:8787/feedback");
  assert.equal(JSON.parse(calls[0].body).context.figureIndex, 3);
});

test("sendFeedback reports server messages and marks 4xx as not retryable", async () => {
  const { impl } = fakeFetch([
    new Response(
      JSON.stringify({
        ok: false,
        error: "Please write a note before sending.",
      }),
      {
        status: 400,
      },
    ),
  ]);
  const result = await sendFeedback("http://x", payload, impl);
  assert.deepEqual(result, {
    ok: false,
    retryable: false,
    error: "Please write a note before sending.",
  });
});

test("outbox keeps the note after a failed send and retries it intact", async () => {
  const { impl, calls } = fakeFetch([
    new TypeError("Failed to fetch"),
    new Response("Bad gateway", { status: 502 }),
    created(),
  ]);
  const outbox = new FeedbackOutbox("http://x", impl);

  const first = await outbox.submit(payload);
  assert.equal(first.ok, false);
  assert.equal(outbox.status, "failed");
  assert.match(outbox.error, /still here/);
  assert.deepEqual(outbox.pending, payload);

  const second = await outbox.retry();
  assert.equal(second.ok, false);
  assert.equal(outbox.status, "failed");

  const third = await outbox.retry("fresh-token");
  assert.deepEqual(third, { ok: true, id: "note-1" });
  assert.equal(outbox.status, "sent");
  assert.equal(outbox.pending, undefined);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body, calls[1].body, "same note and context resent");
  assert.equal(JSON.parse(calls[2].body).turnstileToken, "fresh-token");
  assert.equal(JSON.parse(calls[2].body).message, payload.message);
});

test("retry with nothing pending does nothing", async () => {
  const { impl, calls } = fakeFetch([]);
  const result = await new FeedbackOutbox("http://x", impl).retry();
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});
