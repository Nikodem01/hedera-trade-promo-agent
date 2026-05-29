import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure runtime-read fixtures ship in the serverless function bundles on Vercel:
  // the agent route reads proof image bytes from public/proofs; the home page
  // (server component) reads the bespoke contract text from examples/contracts.
  outputFileTracingIncludes: {
    "/api/agent": ["./public/proofs/**"],
    "/": ["./examples/contracts/**"],
    "/api/quality": ["./docs/validation/**"],
  },
};

export default nextConfig;
