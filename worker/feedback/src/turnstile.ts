const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Server-side Turnstile check (Cloudflare's siteverify endpoint). */
export async function verifyTurnstile(
  token: string | null,
  secret: string,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  try {
    const response = await fetchImpl(SITEVERIFY, {
      method: "POST",
      body: form,
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
