/**
 * Validation for POST /feedback. Only known fields survive; everything is
 * bounded so one note can never grow the database by much.
 */

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_NAME_CHARS = 80;

export interface FeedbackContext {
  danceId: string;
  danceTitle: string;
  danceAuthor: string | null;
  figureIndex: number | null;
  figureLabel: string | null;
  figureCount: number | null;
  phrase: string | null;
  beat: number | null;
  beatInDance: number | null;
  totalBeats: number | null;
  repeat: number | null;
  camera: string | null;
  followDancerId: number | null;
  followDancerName: string | null;
  couples: number | null;
  engine: "next" | "old" | "unknown";
  commit: string | null;
  clientTime: string | null;
  page: string | null;
  viewport: { width: number; height: number } | null;
}

export interface FeedbackSubmission {
  message: string;
  name: string | null;
  context: FeedbackContext;
  turnstileToken: string | null;
}

export type Validation =
  { ok: true; value: FeedbackSubmission } | { ok: false; error: string };

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Removes control characters other than newline and tab. */
const clean = (value: string) =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = clean(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function int(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

function real(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? Math.round(value * 1000) / 1000
    : null;
}

function readContext(raw: unknown): FeedbackContext | string {
  if (!isObject(raw)) return "Missing dance context.";
  const danceId = text(raw.danceId, 200);
  const danceTitle = text(raw.danceTitle, 300);
  if (!danceId || !danceTitle) return "Missing dance id or title.";
  const viewport = isObject(raw.viewport)
    ? {
        width: int(raw.viewport.width, 0, 20000),
        height: int(raw.viewport.height, 0, 20000),
      }
    : null;
  const engine =
    raw.engine === "next" || raw.engine === "old" ? raw.engine : "unknown";
  return {
    danceId,
    danceTitle,
    danceAuthor: text(raw.danceAuthor, 200),
    figureIndex: int(raw.figureIndex, 0, 10000),
    figureLabel: text(raw.figureLabel, 300),
    figureCount: int(raw.figureCount, 0, 10000),
    phrase: text(raw.phrase, 20),
    beat: real(raw.beat, 0, 1_000_000),
    beatInDance: real(raw.beatInDance, 0, 100_000),
    totalBeats: real(raw.totalBeats, 0, 100_000),
    repeat: int(raw.repeat, 0, 100_000),
    camera: text(raw.camera, 40),
    followDancerId: int(raw.followDancerId, 0, 1000),
    followDancerName: text(raw.followDancerName, 80),
    couples: int(raw.couples, 0, 100),
    engine,
    commit: text(raw.commit, 64),
    clientTime: text(raw.clientTime, 40),
    page: text(raw.page, 500),
    viewport:
      viewport && viewport.width !== null && viewport.height !== null
        ? { width: viewport.width, height: viewport.height }
        : null,
  };
}

/** Parses and validates a request body that is already within size limits. */
export function validateSubmission(body: string): Validation {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { ok: false, error: "The request was not valid JSON." };
  }
  if (!isObject(raw)) return { ok: false, error: "Expected a JSON object." };
  if (typeof raw.message !== "string")
    return { ok: false, error: "Please write a note before sending." };
  const message = clean(raw.message).trim();
  if (!message)
    return { ok: false, error: "Please write a note before sending." };
  if (message.length > MAX_MESSAGE_CHARS)
    return {
      ok: false,
      error: `Notes can be up to ${MAX_MESSAGE_CHARS} characters.`,
    };
  if (
    raw.name !== undefined &&
    raw.name !== null &&
    typeof raw.name !== "string"
  )
    return { ok: false, error: "Name must be text." };
  if (typeof raw.name === "string" && raw.name.trim().length > MAX_NAME_CHARS)
    return {
      ok: false,
      error: `Names can be up to ${MAX_NAME_CHARS} characters.`,
    };
  const context = readContext(raw.context);
  if (typeof context === "string") return { ok: false, error: context };
  return {
    ok: true,
    value: {
      message,
      name: text(raw.name, MAX_NAME_CHARS),
      context,
      turnstileToken: text(raw.turnstileToken, 4096),
    },
  };
}

export const STATUSES = ["new", "fixed", "wontfix"] as const;
export type FeedbackStatus = (typeof STATUSES)[number];

export function validateStatusUpdate(
  body: string,
):
  | { ok: true; status: FeedbackStatus; note: string | null }
  | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { ok: false, error: "The request was not valid JSON." };
  }
  if (!isObject(raw)) return { ok: false, error: "Expected a JSON object." };
  if (!STATUSES.includes(raw.status as FeedbackStatus))
    return {
      ok: false,
      error: `Status must be one of ${STATUSES.join(", ")}.`,
    };
  return {
    ok: true,
    status: raw.status as FeedbackStatus,
    note: text(raw.note, 1000),
  };
}
