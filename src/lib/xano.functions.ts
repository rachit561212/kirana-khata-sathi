import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestUrl, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { credentialsSchema, signupSchema, parseXanoAccount, xanoRequest } from "./xano";

const COOKIE = "kk-xano-session";

export const authenticateXano = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.discriminatedUnion("mode", [
    credentialsSchema.extend({ mode: z.literal("login") }),
    signupSchema.extend({ mode: z.literal("signup") }),
  ]).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { mode, ...body } = data;
    try {
      const auth = z.object({ authToken: z.string().min(1) }).parse(await xanoRequest(mode === "login" ? "/auth/login" : "/auth/signup", { body }));
      const account = parseXanoAccount(await xanoRequest("/auth/me", { token: auth.authToken }));
      setCookie(COOKIE, auth.authToken, {
        httpOnly: true, secure: getRequestUrl().protocol === "https:", sameSite: "lax", path: "/",
      });
      return { account, error: null };
    } catch (error) {
      return { account: null, error: error instanceof z.ZodError ? "Xano returned incomplete account details." : error instanceof Error ? error.message : "Unable to connect to Xano." };
    }
  });

export const getXanoAccount = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie(COOKIE);
  if (!token) return null;
  try { return parseXanoAccount(await xanoRequest("/auth/me", { token })); }
  catch { deleteCookie(COOKIE, { path: "/" }); return null; }
});

export const signOutXano = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE, { path: "/" });
  return { success: true };
});