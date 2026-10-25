/**
 * Cloudflare Turnstile spam check, loaded only when a site key is configured
 * at build time (VITE_TURNSTILE_SITE_KEY).
 */
interface TurnstileApi {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      appearance?: "always" | "execute" | "interaction-only";
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile missing"));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile did not load"));
    };
    document.head.append(script);
  });
  return loading;
}

export interface TurnstileHandle {
  /** Waits briefly for a token; null if the check has not finished. */
  token(): Promise<string | null>;
  reset(): void;
}

export function createTurnstile(
  container: HTMLElement,
  siteKey: string,
): TurnstileHandle {
  let current: string | null = null;
  let widget: string | undefined;
  let api: TurnstileApi | undefined;
  const waiting: ((token: string) => void)[] = [];
  loadTurnstile()
    .then((loaded) => {
      api = loaded;
      widget = loaded.render(container, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (token) => {
          current = token;
          waiting.splice(0).forEach((resolve) => resolve(token));
        },
        "expired-callback": () => {
          current = null;
        },
        "error-callback": () => {
          current = null;
        },
      });
    })
    .catch(() => {
      // Sending still tries; the Worker explains if the check is required.
    });
  return {
    token() {
      if (current) return Promise.resolve(current);
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 8000);
        waiting.push((token) => {
          clearTimeout(timer);
          resolve(token);
        });
      });
    },
    reset() {
      current = null;
      if (api && widget !== undefined) api.reset(widget);
    },
  };
}
