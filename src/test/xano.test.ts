import { afterEach, describe, expect, it, vi } from "vitest";
import { credentialsSchema, parseXanoAccount, xanoRequest, XANO_AUTH_URL } from "@/lib/xano";

afterEach(() => vi.unstubAllGlobals());
describe("Xano integration", () => {
  it("posts credentials to the documented authentication endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ authToken: "test-only-token" })));
    vi.stubGlobal("fetch", fetcher);
    await xanoRequest("/auth/login", { body: { email: "shop@example.com", password: "test-password" } });
    expect(fetcher.mock.calls[0][0]).toBe(`${XANO_AUTH_URL}/auth/login`);
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ email: "shop@example.com", password: "test-password" });
  });
  it("reports failed authentication without leaking the upstream response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive upstream data", { status: 401 })));
    await expect(xanoRequest("/auth/me", { token: "test-only-token" })).rejects.toThrow("Check your email and password");
  });
  it("rejects null placeholder responses instead of claiming a connection", () => {
    expect(() => parseXanoAccount(null)).toThrow();
  });
  it("rejects malformed email addresses", () => {
    expect(credentialsSchema.safeParse({ email: "not-an-email", password: "password" }).success).toBe(false);
  });
});