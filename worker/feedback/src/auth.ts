/** Owner-only access: `Authorization: Bearer <OWNER_TOKEN>`. */
async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

/** Compares fixed-length digests so timing does not reveal the token. */
export async function ownerAuthorized(
  header: string | null,
  token: string | undefined,
): Promise<boolean> {
  if (!token || token.length < 16 || !header) return false;
  const match = /^Bearer\s+(.+)$/.exec(header.trim());
  if (!match) return false;
  const [a, b] = await Promise.all([digest(match[1]), digest(token)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
