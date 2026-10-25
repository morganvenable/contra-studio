/**
 * Captures where a dancer is in the app when they open Feedback, so they never
 * have to describe it. Pure: everything it reads is passed in.
 */

/** The slice of StudioState that feedback reads. */
export interface FeedbackStateView {
  dance: {
    id: string;
    title: string;
    author?: string;
    figures: readonly { label: string; beats: number }[];
  };
  beat: number;
  totalBeats: number;
  repeat: number;
  figureIndex: number;
  camera: string;
  selectedDancer: number;
  dancers: readonly { id: number; name: string }[];
}

export type FeedbackEngine = "next" | "old";

/** Field names match the Worker's validator (worker/feedback/src/validate.ts). */
export interface FeedbackContext {
  danceId: string;
  danceTitle: string;
  danceAuthor: string | null;
  figureIndex: number | null;
  figureLabel: string | null;
  figureCount: number;
  phrase: string | null;
  beat: number;
  beatInDance: number;
  totalBeats: number;
  repeat: number;
  camera: string;
  followDancerId: number | null;
  followDancerName: string | null;
  couples: number;
  engine: FeedbackEngine;
  commit: string;
  clientTime: string;
  page: string;
  viewport: { width: number; height: number } | null;
}

export interface CaptureEnvironment {
  engine: FeedbackEngine;
  commit: string;
  now: Date;
  /** Path and query only, e.g. `/contra/?ready=2321`. */
  page: string;
  viewport?: { width: number; height: number };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const phraseName = (index: number) =>
  ["A1", "A2", "B1", "B2"][index] ?? `P${index + 1}`;

export function captureContext(
  state: FeedbackStateView,
  env: CaptureEnvironment,
): FeedbackContext {
  const figures = state.dance.figures;
  const figure = figures[state.figureIndex];
  const beat = Math.max(0, Number.isFinite(state.beat) ? state.beat : 0);
  const total = state.totalBeats > 0 ? state.totalBeats : 0;
  const beatInDance = total ? Math.max(0, beat - state.repeat * total) : beat;
  const follow =
    state.selectedDancer >= 0
      ? state.dancers.find((dancer) => dancer.id === state.selectedDancer)
      : undefined;
  return {
    danceId: state.dance.id,
    danceTitle: state.dance.title,
    danceAuthor: state.dance.author || null,
    figureIndex: figure ? state.figureIndex : null,
    figureLabel: figure ? figure.label : null,
    figureCount: figures.length,
    phrase: total ? phraseName(Math.floor(beatInDance / 16)) : null,
    beat: round(beat),
    beatInDance: round(beatInDance),
    totalBeats: total,
    repeat: state.repeat,
    camera: state.camera,
    followDancerId: follow ? follow.id : null,
    followDancerName: follow ? follow.name : null,
    couples: Math.floor(state.dancers.length / 2),
    engine: env.engine,
    commit: env.commit,
    clientTime: env.now.toISOString(),
    page: env.page.slice(0, 500),
    viewport: env.viewport ?? null,
  };
}

/** One line the panel shows so people can see what will be attached. */
export function describeContext(context: FeedbackContext): string {
  const parts = [context.danceTitle];
  if (context.figureLabel !== null && context.figureIndex !== null)
    parts.push(
      `figure ${context.figureIndex + 1} of ${context.figureCount}: ${context.figureLabel}`,
    );
  const beat = Math.floor(context.beatInDance) + 1;
  parts.push(
    context.totalBeats
      ? `${context.phrase} · beat ${beat} of ${context.totalBeats}`
      : `beat ${beat}`,
  );
  if (context.repeat > 0) parts.push(`time ${context.repeat + 1} through`);
  if (context.followDancerName)
    parts.push(`following ${context.followDancerName}`);
  parts.push(`${context.camera} view`);
  return parts.join(" · ");
}
