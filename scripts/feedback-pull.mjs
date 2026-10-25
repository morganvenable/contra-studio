#!/usr/bin/env node
// Downloads dancer feedback from the feedback Worker for triage, grouped by
// dance, and sets a note's status. Needs two environment variables:
//   CONTRA_FEEDBACK_URL    the Worker address, e.g. https://contra-feedback.<you>.workers.dev
//   CONTRA_FEEDBACK_TOKEN  the OWNER_TOKEN secret
//
//   node scripts/feedback-pull.mjs                 all notes -> feedback-inbox/
//   node scripts/feedback-pull.mjs --status new    only new notes
//   node scripts/feedback-pull.mjs --out <dir>     another folder
//   node scripts/feedback-pull.mjs mark <id> fixed "what changed"
//
// feedback-inbox/ is git-ignored: notes can contain names.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const STATUSES = ["new", "fixed", "wontfix"];

/** Groups notes by dance id, newest note first within each dance. */
export function groupByDance(items) {
  const groups = new Map();
  for (const item of items) {
    const id = item.context?.danceId ?? "unknown";
    if (!groups.has(id))
      groups.set(id, {
        danceId: id,
        danceTitle: item.context?.danceTitle ?? id,
        items: [],
      });
    groups.get(id).items.push(item);
  }
  const list = [...groups.values()];
  for (const group of list)
    group.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openCount = (group) =>
    group.items.filter((item) => item.status === "new").length;
  return list.sort(
    (a, b) =>
      openCount(b) - openCount(a) || a.danceTitle.localeCompare(b.danceTitle),
  );
}

function where(context) {
  const parts = [];
  if (context.figureIndex !== null && context.figureIndex !== undefined)
    parts.push(
      `figure ${context.figureIndex + 1}${context.figureCount ? ` of ${context.figureCount}` : ""}: ${context.figureLabel ?? "(no label)"}`,
    );
  if (typeof context.beatInDance === "number")
    parts.push(
      `${context.phrase ? `${context.phrase}, ` : ""}beat ${Math.floor(context.beatInDance) + 1}${context.totalBeats ? ` of ${context.totalBeats}` : ""} (dance beat ${context.beatInDance})`,
    );
  if (context.repeat) parts.push(`time ${context.repeat + 1} through`);
  return parts.join(" · ") || "no position captured";
}

function view(context) {
  const parts = [`camera ${context.camera ?? "unknown"}`];
  parts.push(
    context.followDancerName
      ? `following ${context.followDancerName} (id ${context.followDancerId})`
      : "following everyone",
  );
  if (context.couples) parts.push(`${context.couples} couples`);
  if (context.viewport)
    parts.push(`${context.viewport.width}×${context.viewport.height}`);
  return parts.join(" · ");
}

const quote = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");

/** Markdown a person or Claude can triage: one section per dance. */
export function renderMarkdown(items, { pulledAt, source }) {
  const groups = groupByDance(items);
  const lines = [
    "# Contra Studio feedback",
    "",
    `Pulled ${pulledAt} from ${source}. ${items.length} note${items.length === 1 ? "" : "s"} in ${groups.length} dance${groups.length === 1 ? "" : "s"}.`,
    "",
    'To reproduce a note: open its page, then run `__contra.actions.seek(<beat>)` in the console with the beat shown. Mark it done with `node scripts/feedback-pull.mjs mark <id> fixed "what changed"`.',
  ];
  for (const group of groups) {
    const open = group.items.filter((item) => item.status === "new").length;
    lines.push(
      "",
      `## ${group.danceTitle} (${group.danceId})`,
      "",
      `${group.items.length} note${group.items.length === 1 ? "" : "s"}, ${open} new.`,
    );
    for (const item of group.items) {
      const c = item.context ?? {};
      lines.push(
        "",
        `### ${item.status} · ${item.createdAt} · ${item.id}`,
        "",
        quote(item.message),
        "",
        `- From: ${item.name ?? "anonymous"}`,
        `- Where: ${where(c)}`,
        `- View: ${view(c)}`,
        `- Engine: ${c.engine ?? "unknown"} · commit ${c.commit ?? "unknown"}`,
        `- Page: ${c.page ?? "unknown"}`,
        `- Reproduce: \`__contra.actions.seek(${c.beat ?? 0})\``,
      );
      if (item.statusNote) lines.push(`- Status note: ${item.statusNote}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function settings() {
  const url = process.env.CONTRA_FEEDBACK_URL?.replace(/\/+$/, "");
  const token = process.env.CONTRA_FEEDBACK_TOKEN;
  if (!url || !token)
    throw new Error("Set CONTRA_FEEDBACK_URL and CONTRA_FEEDBACK_TOKEN first.");
  return { url, headers: { Authorization: `Bearer ${token}` } };
}

async function request(path, init = {}) {
  const { url, headers } = settings();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`${response.status}: ${body.error ?? response.statusText}`);
  return body;
}

export async function pull({ status, out }) {
  const query = status
    ? `?status=${encodeURIComponent(status)}&limit=1000`
    : "?limit=1000";
  const { items } = await request(`/feedback${query}`);
  const pulledAt = new Date().toISOString();
  const source = settings().url;
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "feedback.json"),
    `${JSON.stringify({ pulledAt, source, dances: groupByDance(items) }, null, 2)}\n`,
  );
  writeFileSync(
    join(out, "feedback.md"),
    renderMarkdown(items, { pulledAt, source }),
  );
  return items.length;
}

export async function mark(id, status, note) {
  if (!STATUSES.includes(status))
    throw new Error(`Status must be one of ${STATUSES.join(", ")}.`);
  const { item } = await request(`/feedback/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note: note ?? null }),
  });
  return item;
}

async function main(argv) {
  if (argv[0] === "mark") {
    const [, id, status, ...note] = argv;
    if (!id || !status)
      throw new Error(
        "Usage: node scripts/feedback-pull.mjs mark <id> <new|fixed|wontfix> [note]",
      );
    const item = await mark(id, status, note.join(" ") || undefined);
    console.log(`${item.id} is now ${item.status}.`);
    return;
  }
  const option = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const status = option("--status");
  if (status && !STATUSES.includes(status))
    throw new Error(`--status must be one of ${STATUSES.join(", ")}.`);
  const out = resolve(option("--out") ?? "feedback-inbox");
  const count = await pull({ status, out });
  console.log(
    `${count} note${count === 1 ? "" : "s"} written to ${join(out, "feedback.md")} and feedback.json.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
