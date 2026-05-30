import { describe, it, expect, vi, afterEach } from "vitest";

// requireAccess captures PUBLIC_READONLY / OPERATOR_ACCESS_TOKEN at module load, so we
// reset modules and re-import per scenario with the env set.
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("../lib/guard");
}

const post = (headers: Record<string, string> = {}) =>
  new Request("https://promoproof.example/api/x", { method: "POST", headers });

afterEach(() => {
  delete process.env.PUBLIC_READONLY;
  delete process.env.OPERATOR_ACCESS_TOKEN;
});

describe("requireAccess", () => {
  it("allows everything when PUBLIC_READONLY is unset (operator-only host / dev)", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: undefined, OPERATOR_ACCESS_TOKEN: "secret" });
    expect(requireAccess(post())).toBeNull();
  });

  it("denies a gated action without a token in public mode", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: "1", OPERATOR_ACCESS_TOKEN: "secret" });
    expect(requireAccess(post())?.status).toBe(403);
  });

  it("allows with the correct operator token (header)", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: "1", OPERATOR_ACCESS_TOKEN: "secret" });
    expect(requireAccess(post({ "x-operator-token": "secret" }))).toBeNull();
  });

  it("allows with the correct operator token (cookie)", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: "1", OPERATOR_ACCESS_TOKEN: "secret" });
    expect(requireAccess(post({ cookie: "op_token=secret" }))).toBeNull();
  });

  it("denies with a wrong token", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: "1", OPERATOR_ACCESS_TOKEN: "secret" });
    expect(requireAccess(post({ "x-operator-token": "nope" }))?.status).toBe(403);
  });

  it("rejects a cross-origin request (CSRF defense)", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: undefined });
    const r = new Request("https://promoproof.example/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example", "x-forwarded-host": "promoproof.example" },
    });
    expect(requireAccess(r)?.status).toBe(403);
  });

  it("accepts a same-origin request", async () => {
    const { requireAccess } = await load({ PUBLIC_READONLY: undefined });
    const r = new Request("https://promoproof.example/api/x", {
      method: "POST",
      headers: { origin: "https://promoproof.example", "x-forwarded-host": "promoproof.example" },
    });
    expect(requireAccess(r)).toBeNull();
  });
});
