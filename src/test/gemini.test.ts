import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiRequestError, geminiFailureMessage, transcribeGeminiAudio } from "../lib/gemini";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Gemini transcription", () => {
  it("uses transient inline audio and automatic language detection", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-placeholder");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ steps: [{ type: "model_output", content: [{ type: "text", text: "राम को 2000 रुपये दिए" }] }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await transcribeGeminiAudio("YXVkaW8=", "audio/webm", "auto")).toBe("राम को 2000 रुपये दिए");
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    const body = JSON.parse(options.body);
    expect(body.store).toBe(false);
    expect(body.input).toEqual([{ type: "audio", data: "YXVkaW8=", mime_type: "audio/webm" }]);
    expect(body.generation_config.transcription_config.language_codes).toEqual([]);
  });
  it("passes an optional language hint and normalizes Safari audio", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-placeholder");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ steps: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await transcribeGeminiAudio("YXVkaW8=", "audio/mp4", "hi");
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body.input[0].mime_type).toBe("audio/m4a");
    expect(body.generation_config.transcription_config.language_codes).toEqual(["hi"]);
  });
  it("does not replay rejected requests or reveal provider response content", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-placeholder");
    const fetchMock = vi.fn().mockResolvedValue(new Response("private provider response", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(transcribeGeminiAudio("YXVkaW8=", "audio/webm")).rejects.toThrow("Gemini request failed (403)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(geminiFailureMessage(new GeminiRequestError(429), true)).toContain("usage limit");
  });
});