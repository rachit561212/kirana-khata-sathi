import { GoogleGenAI } from "@google/genai";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { createLiveConnectConfig, LIVE_MODEL_ID } from "./gemini-live";

export const createLiveVoiceToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ language: z.string().trim().max(35) }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { token: null, model: LIVE_MODEL_ID, error: "Voice service is not configured." };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: LIVE_MODEL_ID,
            config: createLiveConnectConfig(data.language),
          },
          httpOptions: { apiVersion: "v1alpha" },
        },
      });
      if (!token.name) throw new Error("Gemini did not return a live token");
      return { token: token.name, model: LIVE_MODEL_ID, error: null };
    } catch {
      console.error("Gemini Live token creation failed");
      return { token: null, model: LIVE_MODEL_ID, error: "Could not start voice chat. Try again or type the entry." };
    }
  });
