import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateGroqJson,
  GroqRequestError,
  groqFailureMessage,
  transcribeGroqAudio,
} from "../lib/groq";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Groq AI integrations", () => {
  it("transcribes audio with the configured language and keeps the key server-side", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-placeholder");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ text: "राम को 2000 रुपये दिए" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await transcribeGroqAudio(new Uint8Array([1, 2, 3]), "audio/webm;codecs=opus", "hi-IN"),
    ).toBe("राम को 2000 रुपये दिए");
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(options.headers.Authorization).toBe("Bearer test-only-placeholder");
    expect(options.body.get("model")).toBe("whisper-large-v3-turbo");
    expect(options.body.get("language")).toBe("hi");
    expect(options.body.get("file").type).toBe("audio/webm");
  });

  it("requests JSON from Groq chat completions", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-placeholder");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: '{"kind":"collect"}' } }] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateGroqJson("system rules", "Raju paid 50")).toBe('{"kind":"collect"}');
    const [, options] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(options.body);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.max_completion_tokens).toBe(1200);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(options.headers.Authorization).toBe("Bearer test-only-placeholder");
  });

  it("maps quota and authentication errors without exposing provider response data", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-placeholder");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("private provider response", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(transcribeGroqAudio(new Uint8Array([1]), "audio/webm")).rejects.toThrow(
      "Groq request failed (429)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(groqFailureMessage(new GroqRequestError(429), true)).toContain("usage limit");
  });
});
