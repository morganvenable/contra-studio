/** Minimal D1 surface this Worker uses, so it needs no extra type packages. */
export interface D1Result<T> {
  results: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
  RATE_LIMIT_PER_HOUR?: string;
  RATE_LIMIT_SALT?: string;
  OWNER_TOKEN?: string;
}

/** Things tests replace: the clock, outbound fetch and id generation. */
export interface Deps {
  now: () => number;
  fetch: typeof fetch;
  randomId: () => string;
}
