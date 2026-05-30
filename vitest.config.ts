import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws when imported outside a React Server Component context;
      // alias it to a no-op so unit tests can import server-marked modules. The guard
      // it provides is a build-time check on the CLIENT bundle, not a Node-test concern.
      "server-only": fileURLToPath(new URL("./tests/shims/server-only.ts", import.meta.url)),
    },
  },
});
