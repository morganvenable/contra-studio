/**
 * The Feedback button and panel. Plain DOM: one textarea that dictation tools
 * can type into, an optional name, and Send. Context is captured when the
 * panel opens and shown as one line, so nobody has to describe where they are.
 */
import "./feedback.css";
import { FeedbackOutbox } from "./client.ts";
import {
  captureContext,
  describeContext,
  type FeedbackContext,
  type FeedbackEngine,
  type FeedbackStateView,
} from "./context.ts";
import { createTurnstile, type TurnstileHandle } from "./turnstile.ts";
import { MAX_MESSAGE_CHARS, MAX_NAME_CHARS } from "./limits.ts";

export interface FeedbackPanelOptions {
  endpoint: string;
  commit: string;
  turnstileSiteKey?: string;
  getState: () => FeedbackStateView;
  engineFor: (state: FeedbackStateView) => FeedbackEngine;
}

const DRAFT_KEY = "contra-studio.feedback.draft";
const NAME_KEY = "contra-studio.feedback.name";

function readStore(store: () => Storage, key: string): string {
  try {
    return store().getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStore(store: () => Storage, key: string, value: string) {
  try {
    if (value) store().setItem(key, value);
    else store().removeItem(key);
  } catch {
    // Private windows can block storage; the panel still works without it.
  }
}

const session = () => sessionStorage;
const local = () => localStorage;

const bubble =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h5"/></svg>';

/** Dictation states in which text may still be arriving. */
const DICTATING = new Set(["starting", "listening", "landing"]);

/** Lets a running dictation finish typing before the note is read. */
function afterDictationLands(field: HTMLTextAreaElement): Promise<void> {
  if (!DICTATING.has(field.dataset.dictateState ?? ""))
    return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 22000);
    field.addEventListener("dictate:landed", done, { once: true });
    field.dispatchEvent(new CustomEvent("dictate:stop"));
  });
}

export function mountFeedbackPanel(
  host: HTMLElement,
  options: FeedbackPanelOptions,
) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "source-link feedback-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.innerHTML = `${bubble}<span>Feedback</span>`;
  host.append(trigger);

  const panel = document.createElement("dialog");
  panel.className = "feedback-panel";
  panel.setAttribute("aria-labelledby", "feedback-title");
  panel.innerHTML = `
    <form method="dialog" class="feedback-form" novalidate>
      <div class="feedback-heading">
        <h2 id="feedback-title">Send feedback</h2>
        <button type="button" class="icon-button feedback-close" aria-label="Close feedback">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg>
        </button>
      </div>
      <p class="feedback-context" id="feedback-context"></p>
      <div class="feedback-compose">
        <label class="feedback-label" for="feedback-message">What looks wrong, or what would you change?</label>
        <textarea id="feedback-message" class="feedback-message" rows="5" maxlength="${MAX_MESSAGE_CHARS}" data-dictate spellcheck="true"></textarea>
        <label class="feedback-label feedback-name-label" for="feedback-name">Your name <span>(optional)</span></label>
        <input id="feedback-name" class="feedback-name" type="text" maxlength="${MAX_NAME_CHARS}" autocomplete="name" data-dictate>
        <div class="feedback-turnstile" hidden></div>
      </div>
      <p class="feedback-status" role="status" aria-live="polite"></p>
      <div class="feedback-actions">
        <button type="button" class="button button-secondary feedback-cancel">Cancel</button>
        <button type="submit" class="button button-primary feedback-send">Send</button>
      </div>
    </form>`;
  document.body.append(panel);

  const $ = <T extends HTMLElement>(selector: string) =>
    panel.querySelector<T>(selector)!;
  const form = $<HTMLFormElement>(".feedback-form");
  const message = $<HTMLTextAreaElement>("#feedback-message");
  const name = $<HTMLInputElement>("#feedback-name");
  const contextLine = $("#feedback-context");
  const compose = $(".feedback-compose");
  const status = $(".feedback-status");
  const send = $<HTMLButtonElement>(".feedback-send");
  const cancel = $<HTMLButtonElement>(".feedback-cancel");
  const outbox = new FeedbackOutbox(options.endpoint);
  let captured: FeedbackContext | undefined;
  let turnstile: TurnstileHandle | undefined;

  const setStatus = (
    text: string,
    tone: "plain" | "error" | "done" = "plain",
  ) => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  function showCompose() {
    panel.dataset.state = "compose";
    compose.hidden = false;
    contextLine.hidden = false;
    send.hidden = false;
    send.disabled = false;
    send.textContent = "Send";
    cancel.textContent = "Cancel";
    setStatus("");
  }

  function open() {
    const state = options.getState();
    captured = captureContext(state, {
      engine: options.engineFor(state),
      commit: options.commit,
      now: new Date(),
      page: `${location.pathname}${location.search}`,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    contextLine.textContent = describeContext(captured);
    if (outbox.status !== "failed") outbox.reset();
    showCompose();
    if (outbox.status === "failed") {
      send.textContent = "Try again";
      setStatus(outbox.error, "error");
    }
    if (!message.value) message.value = readStore(session, DRAFT_KEY);
    if (!name.value) name.value = readStore(local, NAME_KEY);
    if (options.turnstileSiteKey && !turnstile) {
      const box = $(".feedback-turnstile");
      box.hidden = false;
      turnstile = createTurnstile(box, options.turnstileSiteKey);
    }
    panel.showModal();
    message.focus();
    message.setSelectionRange(message.value.length, message.value.length);
  }

  async function submit() {
    if (outbox.status === "sending" || !captured) return;
    await afterDictationLands(message);
    const text = message.value.trim();
    if (!text) {
      setStatus("Write a note first, then send it.", "error");
      message.focus();
      return;
    }
    send.disabled = true;
    send.textContent = "Sending…";
    setStatus("");
    const result = await outbox.submit({
      message: text,
      name: name.value.trim() || null,
      context: captured,
      turnstileToken: turnstile ? await turnstile.token() : null,
    });
    turnstile?.reset();
    if (result.ok) {
      message.value = "";
      writeStore(session, DRAFT_KEY, "");
      panel.dataset.state = "sent";
      compose.hidden = true;
      contextLine.hidden = true;
      send.hidden = true;
      cancel.textContent = "Close";
      setStatus(
        "Thank you. Your note was sent with this moment in the dance.",
        "done",
      );
      cancel.focus();
    } else {
      send.disabled = false;
      send.textContent = "Try again";
      setStatus(result.error, "error");
    }
  }

  trigger.addEventListener("click", open);
  message.addEventListener("input", () =>
    writeStore(session, DRAFT_KEY, message.value),
  );
  name.addEventListener("change", () =>
    writeStore(local, NAME_KEY, name.value.trim()),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit();
  });
  // Clicking a button must not pull focus out of a field being dictated into.
  for (const button of panel.querySelectorAll("button"))
    button.addEventListener("mousedown", (event) => event.preventDefault());
  const close = () => {
    if (outbox.status === "sent") outbox.reset();
    panel.close();
    trigger.focus();
  };
  cancel.addEventListener("click", close);
  $(".feedback-close").addEventListener("click", close);

  return { trigger, panel, open };
}
