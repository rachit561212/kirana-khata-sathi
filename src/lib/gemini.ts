type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };

export class GeminiRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Gemini request failed (${status})`);
  }
}

export function geminiFailureMessage(error: unknown, voice: boolean): string {
  const action = voice ? "Voice reading" : "AI reading";
  if (error instanceof GeminiRequestError) {
    if (error.status === 401 || error.status === 403) return `${action} cannot access Gemini. Check the API key and its permissions in Google AI Studio.`;
    if (error.status === 429) return `${action} has reached Google's usage limit. Check your Google AI Studio quota, then try again later.`;
    if (error.status === 503) return `${action} is temporarily unavailable at Google. Your details are kept; try again later or enter them manually.`;
  }
  return `${action} is unavailable right now. Your details are kept; you can type them instead.`;
}

/** Transcribe inline audio without uploading or retaining the recording. */
export async function transcribeGeminiAudio(audio: string, mimeType: string, language?: string): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error("Gemini is not configured");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: "gemini-3.5-transcribe",
      input: [{ type: "audio", data: audio, mime_type: mimeType === "audio/mp4" ? "audio/m4a" : mimeType }],
      generation_config: { transcription_config: { language_codes: language && language !== "auto" ? [language] : [] } },
      store: false,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new GeminiRequestError(response.status);
  const result: { steps?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> } = await response.json();
  return result.steps?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? []).filter((part) => part.type === "text")
    .map((part) => part.text ?? "").join("").trim() ?? "";
}

/** Calls Gemini from the server without exposing the API key to the browser. */
export async function generateGeminiContent(
  model: string,
  contents: Array<{ parts: GeminiPart[] }>,
  config?: { systemInstruction?: string; responseMimeType?: string; responseJsonSchema?: Record<string, unknown> },
): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents,
      ...(config?.systemInstruction ? { systemInstruction: { parts: [{ text: config.systemInstruction }] } } : {}),
      ...(config?.responseMimeType || config?.responseJsonSchema
        ? { generationConfig: {
            ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
            ...(config.responseJsonSchema ? { responseJsonSchema: config.responseJsonSchema } : {}),
          } }
        : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new GeminiRequestError(response.status);
  const result = await response.json() as GeminiResponse;
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}
