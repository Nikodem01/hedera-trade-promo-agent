// Defense-in-depth access gate for mutating / expensive route handlers. Enforced
// INSIDE each handler — NOT in middleware, which is bypassable (CVE-2025-29927) and is
// "not a security boundary" per Next's own guidance. The real outer boundary is the
// reverse proxy (see docs/DEPLOY.md); this is the in-app layer.
//
// Modes:
//  - PUBLIC_READONLY unset (local dev / operator-only host): everything allowed.
//  - PUBLIC_READONLY=1 (public deploy): gated routes require the operator token
//    (x-operator-token header or op_token cookie); read-only routes stay open so the
//    public can view the ledger, verify against chain, and see model-risk evidence.
import { timingSafeEqual } from "node:crypto";
import { rateLimit } from "./ratelimit";

export const PUBLIC_READONLY = process.env.PUBLIC_READONLY === "1";
const OPERATOR_TOKEN = process.env.OPERATOR_ACCESS_TOKEN ?? "";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Same-origin check: browsers attach Origin on POST, so a mismatch is a cross-site
 * (CSRF) attempt. A missing Origin means a non-browser caller (curl/server) — not a
 * CSRF vector — so it's allowed (the token check below still applies in public mode). */
export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  // Behind the reverse proxy the real client host is in x-forwarded-host.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

function tokenFrom(req: Request): string | null {
  const header = req.headers.get("x-operator-token");
  if (header) return header;
  const cookie = req.headers.get("cookie");
  const m = cookie?.match(/(?:^|;\s*)op_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export type GateOpts = { rate?: { name: string; limit: number; windowMs: number } };

/** Public-but-expensive routes, such as the limited live demo, do not require the
 * operator token but still reject browser cross-origin posts and enforce a rate cap. */
export function requirePublicAccess(req: Request, opts: GateOpts = {}): Response | null {
  if (!sameOriginOk(req)) {
    return Response.json({ error: "cross-origin request rejected" }, { status: 403 });
  }
  if (opts.rate) {
    const limited = rateLimit(req, opts.rate.name, opts.rate.limit, opts.rate.windowMs);
    if (limited) return limited;
  }
  return null;
}

/** Returns a Response to short-circuit the handler (deny / rate-limit), or null to
 * proceed. Call at the very top of a gated route handler:
 *   const denied = requireAccess(req, { rate: { name: "agent", limit: 8, windowMs: 60000 } });
 *   if (denied) return denied; */
export function requireAccess(req: Request, opts: GateOpts = {}): Response | null {
  if (!sameOriginOk(req)) {
    return Response.json({ error: "cross-origin request rejected" }, { status: 403 });
  }
  if (opts.rate) {
    const limited = rateLimit(req, opts.rate.name, opts.rate.limit, opts.rate.windowMs);
    if (limited) return limited;
  }
  if (!PUBLIC_READONLY) return null; // operator-only host / dev — allow
  const provided = tokenFrom(req);
  if (OPERATOR_TOKEN && provided && safeEqual(provided, OPERATOR_TOKEN)) return null;
  return Response.json({ error: "operator access required" }, { status: 403 });
}
