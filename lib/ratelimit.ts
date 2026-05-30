// Minimal in-memory fixed-window rate limiter — abuse protection for the expensive
// routes (LLM calls, on-chain writes) on a single-instance self-hosted deployment.
// No Redis: a Map keyed by client IP is sufficient for one Node process behind the
// reverse proxy. Not a distributed limiter — documented as such in docs/SECURITY.md.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  // Set by the reverse proxy (nginx/caddy). Falls back to a constant locally.
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0]?.trim() : "") || "local";
}

/** Returns a 429 Response if the caller has exceeded `limit` requests in `windowMs`,
 * else null. Keyed by IP + the caller-supplied bucket name (so routes don't share quota). */
export function rateLimit(req: Request, name: string, limit: number, windowMs: number): Response | null {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    return Response.json({ error: "rate limit exceeded" }, { status: 429, headers: { "retry-after": String(retry) } });
  }
  b.count++;
  return null;
}
