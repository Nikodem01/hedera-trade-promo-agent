import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Pragmatic static CSP (no nonce → preserves static rendering; allows the app's heavy
// inline styles + inline SVG data: URIs). Shipped as Report-Only first to avoid breaking
// the UI; flip the header key to `Content-Security-Policy` to enforce after a visual
// check (see docs/SECURITY.md). 'unsafe-eval' / ws: are dev-only (HMR + React debugging).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS only in production (TLS terminated at the reverse proxy); omitted in dev so it
  // doesn't pin localhost to HTTPS.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Ensure runtime-read fixtures ship in the serverless function bundles on Vercel:
  // the agent route reads proof image bytes from public/proofs; the home page
  // (server component) reads the bespoke contract text from examples/contracts.
  outputFileTracingIncludes: {
    "/api/agent": ["./public/proofs/**"],
    "/": ["./examples/contracts/**"],
    "/api/quality": ["./docs/validation/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
