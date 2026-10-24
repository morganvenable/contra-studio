/**
 * Feedback entry point for src/ui.ts. The button appears only when the build
 * sets VITE_FEEDBACK_URL to the feedback Worker's address.
 */
import { findNextDance } from "../next/dance.ts";
import { nextEngineRequested } from "../next/switch.ts";
import type { StudioState } from "../types.ts";
import type { FeedbackEngine } from "./context.ts";

declare const __CONTRA_COMMIT__: string;

const endpoint = (import.meta.env.VITE_FEEDBACK_URL ?? "").trim();
const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();
const commit =
  typeof __CONTRA_COMMIT__ === "string" ? __CONTRA_COMMIT__ : "unknown";

/** Mirrors src/next/switch.ts: stored figure-library dances use the next engine. */
function engineFor(state: StudioState): FeedbackEngine {
  return nextEngineRequested(location.search) &&
    findNextDance(state.dance.sourceUrl)
    ? "next"
    : "old";
}

export function mountFeedback(
  host: HTMLElement | null,
  getState: () => StudioState,
) {
  if (!endpoint || !host) return;
  // Loaded on demand so builds without feedback carry none of its code paths.
  void import("./panel.ts").then(({ mountFeedbackPanel }) =>
    mountFeedbackPanel(host, {
      endpoint,
      commit,
      turnstileSiteKey: siteKey || undefined,
      getState,
      engineFor: (state) => engineFor(state as StudioState),
    }),
  );
}
