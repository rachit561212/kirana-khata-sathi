import { z } from "zod";

export const XANO_AUTH_URL = "https://x8ki-letl-twmt.n7.xano.io/api:-pi70oJi";
export const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(256),
});
export const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(200) });
export type XanoAccount = { name: string; email: string };

export async function xanoRequest(path: "/auth/login" | "/auth/signup" | "/auth/me", options: { body?: unknown; token?: string } = {}): Promise<unknown> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  let response: Response;
  try {
    response = await fetch(`${XANO_AUTH_URL}${path}`, {
      method: options.body ? "POST" : "GET", headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Xano could not be reached. Please try again.");
  }
  if (!response.ok) {
    // Do not expose upstream payloads: they may contain credentials or user records.
    if (response.status === 401 || response.status === 403) throw new Error("Xano could not sign you in. Check your email and password.");
    if (response.status === 429) throw new Error("Xano is receiving too many requests. Please try again shortly.");
    if (response.status === 400) throw new Error("Xano could not accept these details. Check them and try again.");
    throw new Error(`Xano request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

export function parseXanoAccount(value: unknown): XanoAccount {
  const user = z.object({ name: z.string().optional(), email: z.string() }).parse(value);
  return { name: user.name || "Your shop", email: user.email };
}