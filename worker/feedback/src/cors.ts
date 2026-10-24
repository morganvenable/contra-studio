/**
 * Exact-origin CORS. An entry ending in `:*` allows any port on that host,
 * which is only meant for localhost review copies.
 */
export function parseOrigins(list: string | undefined): string[] {
  return (list ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function originAllowed(origin: string | null, allowed: string[]) {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;
  return allowed.some((entry) => {
    if (!entry.endsWith(":*")) return entry === origin;
    const base = entry.slice(0, -2);
    return `${url.protocol}//${url.hostname}` === base && url.port !== "";
  });
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
