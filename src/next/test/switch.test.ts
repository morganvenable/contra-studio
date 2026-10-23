import { test } from "node:test";
import assert from "node:assert/strict";
import type { CompiledDance, Dance } from "../../types.ts";
import {
  compileWithEngine,
  isNextCompiled,
  nextEngineRequested,
} from "../switch.ts";

const old = { dance: {} } as CompiledDance;
const compileOld = () => old;
const base = (sourceUrl: string): Dance => ({
  id: "x",
  title: "X",
  author: "Y",
  formation: "becket",
  description: "",
  figures: [],
  sourceUrl,
});

test("stored dances use the figure library by default; ?engine=old opts out", () => {
  assert.equal(nextEngineRequested(""), true);
  assert.ok(
    isNextCompiled(
      compileWithEngine(
        base("https://contradb.com/dances/2321"),
        4,
        compileOld,
        "",
      ),
    ),
  );
  assert.equal(nextEngineRequested("?engine=old"), false);
  assert.equal(
    compileWithEngine(
      base("https://contradb.com/dances/2321"),
      4,
      compileOld,
      "?engine=old",
    ),
    old,
  );
});

test("?engine=next compiles supported dances and falls back for the rest", () => {
  const next = compileWithEngine(
    base("https://contradb.com/dances/2321"),
    4,
    compileOld,
    "?engine=next",
  );
  assert.ok(isNextCompiled(next));
  assert.equal(next.dance.id, "x", "keeps the app dance identity");
  const info = console.info;
  console.info = () => {};
  try {
    assert.equal(
      compileWithEngine(
        base("https://contradb.com/dances/1"),
        4,
        compileOld,
        "?engine=next",
      ),
      old,
    );
  } finally {
    console.info = info;
  }
});
