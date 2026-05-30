// Test shim for the `server-only` package. In Next, importing `server-only` throws if
// a module is bundled for the client (a build-time guard). In Node/vitest there is no
// RSC condition, so the real package throws on import; this no-op shim lets unit tests
// import server-marked modules. The actual client-bundle protection is unaffected.
export {};
