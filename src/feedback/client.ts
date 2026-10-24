/**
 * Sends a note to the feedback Worker. A failed send keeps the note so the
 * person can retry without retyping it.
 */
import type { FeedbackContext } from "./context.ts";

export interface FeedbackPayload {
  message: string;
  name: string | null;
  context: FeedbackContext;
  turnstileToken: string | null;
}

export type SendResult =
  { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

export const feedbackUrl = (endpoint: string) =>
  `${endpoint.replace(/\/+$/, "")}/feedback`;

const OFFLINE =
  "Could not reach the feedback service. Your note is still here; try again.";

export async function sendFeedback(
  endpoint: string,
  payload: FeedbackPayload,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  timeoutMs = 15000,
): Promise<SendResult> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetchImpl(feedbackUrl(endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abort.signal,
    });
    let body: { ok?: boolean; id?: string; error?: string } = {};
    try {
      body = await response.json();
    } catch {
      // A proxy error page is not JSON; the status code still says enough.
    }
    if (response.ok && body.ok && typeof body.id === "string")
      return { ok: true, id: body.id };
    const retryable = response.status >= 500 || response.status === 429;
    return {
      ok: false,
      retryable: retryable || response.status === 403,
      error:
        body.error ||
        (retryable ? OFFLINE : "The note could not be sent. Please try again."),
    };
  } catch {
    return { ok: false, retryable: true, error: OFFLINE };
  } finally {
    clearTimeout(timer);
  }
}

export type OutboxStatus = "idle" | "sending" | "sent" | "failed";

/**
 * Holds the note being sent. On failure it keeps the exact payload, including
 * the context captured when the panel opened, for `retry()`.
 */
export class FeedbackOutbox {
  status: OutboxStatus = "idle";
  error = "";
  sentId = "";
  pending: FeedbackPayload | undefined;

  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(endpoint: string, fetchImpl?: typeof fetch) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  async submit(payload: FeedbackPayload): Promise<SendResult> {
    if (this.status === "sending")
      return { ok: false, retryable: true, error: "Already sending." };
    this.pending = payload;
    this.status = "sending";
    this.error = "";
    const result = await sendFeedback(this.endpoint, payload, this.fetchImpl);
    if (result.ok) {
      this.status = "sent";
      this.sentId = result.id;
      this.pending = undefined;
    } else {
      this.status = "failed";
      this.error = result.error;
    }
    return result;
  }

  /** Re-sends the kept note, optionally with a fresh spam-check token. */
  retry(turnstileToken?: string | null): Promise<SendResult> {
    if (!this.pending)
      return Promise.resolve({
        ok: false,
        retryable: false,
        error: "Nothing to resend.",
      });
    const payload =
      turnstileToken === undefined
        ? this.pending
        : { ...this.pending, turnstileToken };
    return this.submit(payload);
  }

  reset() {
    this.status = "idle";
    this.error = "";
    this.sentId = "";
    this.pending = undefined;
  }
}
