import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByDance, renderMarkdown } from "./feedback-pull.mjs";

const note = (id, danceId, status, createdAt, extra = {}) => ({
  id,
  createdAt,
  updatedAt: createdAt,
  status,
  statusNote: null,
  message: `Note ${id}`,
  name: null,
  context: {
    danceId,
    danceTitle: danceId === "2321" ? "Debra's Dance" : "Another Dance",
    figureIndex: 3,
    figureCount: 11,
    figureLabel: "Rory O'More right",
    phrase: "A2",
    beat: 85,
    beatInDance: 21,
    totalBeats: 64,
    repeat: 1,
    camera: "overhead",
    followDancerId: 2,
    followDancerName: "Robin 2",
    couples: 6,
    engine: "next",
    commit: "abc1234",
    page: "/?ready=2321",
    viewport: { width: 1440, height: 1000 },
    ...extra,
  },
});

const items = [
  note("a", "99", "fixed", "2026-10-20T10:00:00Z"),
  note("b", "2321", "new", "2026-10-21T10:00:00Z"),
  note("c", "2321", "new", "2026-10-22T10:00:00Z"),
];

test("groupByDance puts dances with new notes first, newest note first", () => {
  const groups = groupByDance(items);
  assert.deepEqual(
    groups.map((g) => g.danceId),
    ["2321", "99"],
  );
  assert.deepEqual(
    groups[0].items.map((i) => i.id),
    ["c", "b"],
  );
});

test("renderMarkdown carries the context needed to reproduce a note", () => {
  const md = renderMarkdown(items, {
    pulledAt: "2026-10-24T00:00:00Z",
    source: "http://x",
  });
  assert.match(md, /## Debra's Dance \(2321\)/);
  assert.match(md, /2 notes, 2 new\./);
  assert.match(md, /### new · 2026-10-22T10:00:00Z · c/);
  assert.match(md, /> Note c/);
  assert.match(
    md,
    /figure 4 of 11: Rory O'More right · A2, beat 22 of 64 \(dance beat 21\) · time 2 through/,
  );
  assert.match(md, /following Robin 2 \(id 2\)/);
  assert.match(md, /Engine: next · commit abc1234/);
  assert.match(md, /__contra\.actions\.seek\(85\)/);
  assert.ok(md.indexOf("(2321)") < md.indexOf("(99)"));
});

test("renderMarkdown keeps multi-line notes quoted", () => {
  const multi = [
    {
      ...note("d", "2321", "new", "2026-10-23T00:00:00Z"),
      message: "Line one\nLine two",
    },
  ];
  assert.match(
    renderMarkdown(multi, { pulledAt: "now", source: "x" }),
    /> Line one\n> Line two/,
  );
});
