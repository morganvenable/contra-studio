// Build-time settings read by src/feedback (see docs/feedback.md).
interface ImportMetaEnv {
  readonly VITE_FEEDBACK_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
