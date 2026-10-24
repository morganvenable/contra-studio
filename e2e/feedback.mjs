// End-to-end flow for Feedback: start the feedback Worker under wrangler dev
// (local D1, Turnstile off), start Vite with VITE_FEEDBACK_URL pointing at it,
// open Debra's Dance, step to a figure, send a note (after one failed send to
// check the retry keeps the text), then read it back through the owner GET
// and check the dance, figure and beat. Also checks the panel fits a phone.
// node e2e/feedback.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const workerDir = fileURLToPath(
  new URL("../worker/feedback/", import.meta.url),
);
const wrangler = join(
  workerDir,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
const port = Number(process.env.FEEDBACK_E2E_PORT || 8793);
const workerUrl = `http://127.0.0.1:${port}`;
const ownerToken = randomBytes(24).toString("hex");
const state = mkdtempSync(join(tmpdir(), "contra-feedback-e2e-"));
const quiet = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" };

const migrate = spawnSync(
  process.execPath,
  [
    wrangler,
    "d1",
    "migrations",
    "apply",
    "contra-feedback",
    "--local",
    "--persist-to",
    state,
  ],
  { cwd: workerDir, env: quiet, encoding: "utf8" },
);
assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);

const worker = spawn(
  process.execPath,
  [
    wrangler,
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--persist-to",
    state,
    "--var",
    "TURNSTILE_ENABLED:false",
    "--var",
    "RATE_LIMIT_SALT:e2e-salt",
    "--var",
    `OWNER_TOKEN:${ownerToken}`,
  ],
  { cwd: workerDir, env: quiet, stdio: ["ignore", "pipe", "pipe"] },
);
let workerLog = "";
worker.stdout.on("data", (d) => (workerLog += d));
worker.stderr.on("data", (d) => (workerLog += d));

function stopWorker() {
  if (worker.exitCode !== null) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(worker.pid), "/t", "/f"]);
  else worker.kill("SIGTERM");
}

async function waitForWorker() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${workerUrl}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not start:\n${workerLog}`);
}

let failed = false;
let server, browser;
try {
  await waitForWorker();
  process.env.VITE_FEEDBACK_URL = workerUrl;
  const { createServer } = await import("vite");
  server = await createServer({
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${base}?ready=2321`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Debra's Dance", exact: true }),
  ).toBeVisible({ timeout: 60000 });

  // Seek to the fourth figure with the transport's Next figure button.
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Next figure" }).click();
  await page.waitForFunction(() => window.__contra.state.figureIndex === 3);
  const at = await page.evaluate(() => {
    const s = window.__contra.state;
    return {
      beat: s.beat,
      figureIndex: s.figureIndex,
      label: s.dance.figures[s.figureIndex].label,
      id: s.dance.id,
    };
  });

  const trigger = page.getByRole("button", { name: "Feedback" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Send feedback" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("#feedback-context")).toContainText(at.label);
  await expect(panel.locator("#feedback-context")).toContainText(
    "Debra's Dance",
  );
  const box = panel.getByLabel("What looks wrong, or what would you change?");
  await expect(box).toBeFocused();

  // Dictation tools insert text as input events; space must not toggle playback.
  await box.pressSequentially("The robins ");
  await page.keyboard.insertText("cross too early in the Rory.");
  const note = "The robins cross too early in the Rory.";
  await expect(box).toHaveValue(note);
  assert.equal(
    await page.evaluate(() => window.__contra.state.playing),
    false,
    "typing did not start playback",
  );
  await panel.getByLabel(/Your name/).fill("E2E Dancer");

  // First send fails at the network: the text stays and the button offers a retry.
  await page.route("**/feedback", (route) => route.abort("connectionrefused"), {
    times: 1,
  });
  await panel.getByRole("button", { name: "Send", exact: true }).click();
  await expect(panel.locator(".feedback-status")).toContainText("still here");
  await expect(box).toHaveValue(note);
  await panel.getByRole("button", { name: "Try again" }).click();
  await expect(panel.locator(".feedback-status")).toContainText("Thank you");
  await expect(box).toBeHidden();

  // Layout: the panel sits inside the viewport.
  const rect = await panel.boundingBox();
  assert.ok(
    rect &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= 1440 &&
      rect.y + rect.height <= 1000,
    "panel within viewport",
  );
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await expect(panel).toBeHidden();

  const listed = await (
    await fetch(`${workerUrl}/feedback`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
  ).json();
  assert.equal(
    listed.items.length,
    1,
    "exactly one note stored (the failed send never arrived)",
  );
  const [item] = listed.items;
  assert.equal(item.message, note);
  assert.equal(item.name, "E2E Dancer");
  assert.equal(item.status, "new");
  assert.equal(item.context.danceId, at.id);
  assert.equal(item.context.danceTitle, "Debra's Dance");
  assert.equal(item.context.figureIndex, 3);
  assert.equal(item.context.figureLabel, at.label);
  assert.equal(item.context.beat, Math.round(at.beat * 1000) / 1000);
  assert.equal(item.context.engine, "next");
  assert.equal(item.context.camera, "perspective");
  assert.match(item.context.commit, /^[0-9a-f]{7,}|unknown$/);
  assert.match(item.context.page, /ready=2321/);

  // The pull script writes a triage file, and `mark` sets the status.
  const pullEnv = {
    ...process.env,
    CONTRA_FEEDBACK_URL: workerUrl,
    CONTRA_FEEDBACK_TOKEN: ownerToken,
  };
  const inbox = join(state, "inbox");
  const script = fileURLToPath(
    new URL("../scripts/feedback-pull.mjs", import.meta.url),
  );
  const pulled = spawnSync(process.execPath, [script, "--out", inbox], {
    env: pullEnv,
    encoding: "utf8",
  });
  assert.equal(pulled.status, 0, pulled.stderr);
  const markdown = readFileSync(join(inbox, "feedback.md"), "utf8");
  assert.ok(
    markdown.includes(`## Debra's Dance (${at.id})`),
    "grouped under the dance",
  );
  assert.ok(
    markdown.includes(note) && markdown.includes(at.label),
    "markdown has the note and figure",
  );
  const marked = spawnSync(
    process.execPath,
    [script, "mark", item.id, "fixed", "Checked in e2e"],
    { env: pullEnv, encoding: "utf8" },
  );
  assert.equal(marked.status, 0, marked.stderr);
  const open = await (
    await fetch(`${workerUrl}/feedback?status=new`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
  ).json();
  assert.equal(open.items.length, 0, "marked note is no longer new");

  const anonymous = await fetch(`${workerUrl}/feedback`);
  assert.equal(anonymous.status, 401, "GET is owner-only");

  // Phone width: the panel fits with no horizontal scroll.
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await phone.goto(`${base}?ready=2321`, { waitUntil: "networkidle" });
  await expect(
    phone.getByRole("heading", { name: "Debra's Dance", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await phone.getByRole("button", { name: "Feedback" }).click();
  const phonePanel = phone.getByRole("dialog", { name: "Send feedback" });
  await expect(phonePanel).toBeVisible();
  const phoneRect = await phonePanel.boundingBox();
  assert.ok(
    phoneRect && phoneRect.x >= 0 && phoneRect.x + phoneRect.width <= 390,
    "panel fits a phone",
  );
  await phone.screenshot({
    path: fileURLToPath(new URL("feedback-phone.png", import.meta.url)),
  });
  await page.goto(`${base}?ready=2321`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Debra's Dance", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Feedback" }).click();
  await page.screenshot({
    path: fileURLToPath(new URL("feedback-desktop.png", import.meta.url)),
  });

  assert.deepEqual(errors, [], "no page errors");
  console.log(
    JSON.stringify({
      ok: true,
      stored: {
        figureIndex: item.context.figureIndex,
        figureLabel: item.context.figureLabel,
        beat: item.context.beat,
        engine: item.context.engine,
      },
    }),
  );
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await browser?.close();
  await server?.close();
  stopWorker();
  await new Promise((r) => setTimeout(r, 1000));
  try {
    rmSync(state, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 500,
    });
  } catch {
    console.warn(`Could not remove ${state}; it is a temporary folder.`);
  }
}
process.exit(failed ? 1 : 0);
