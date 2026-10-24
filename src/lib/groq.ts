type GroqPart = { text?: string; inlineData?: { mimeType: string; data: string } };

export class GroqRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Groq request failed (${status})`);
  }
}

export function groqFailureMessage(error: unknown, voice: boolean): string {
  const action = voice ? "Voice reading" : "AI reading";
  if (error instanceof GroqRequestError) {
    if (error.status === 401 || error.status === 403)
      return `${action} cannot access Groq. Check the API key and its permissions.`;
    if (error.status === 429)
      return `${action} has reached Groq's usage limit. Check your Groq account quota, then try again.`;
    if (error.status >= 500)
      return `${action} is temporarily unavailable at Groq. Your details are kept; try again later or enter them manually.`;
  }
  return `${action} is unavailable right now. Your details are kept; you can type them instead.`;
}

function groqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return key;
}

/** Transcribe an in-memory clip using Groq Whisper; the recording is not stored by this app. */
export async function transcribeGroqAudio(
  audio: Uint8Array,
  mimeType: string,
  language?: string,
): Promise<string> {
  const fileType = mimeType.split(";", 1)[0] || "audio/webm";
  const form = new FormData();
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  if (language && language !== "auto") form.append("language", language.split("-", 1)[0]);
  form.append(
    "file",
    new Blob([audio], { type: fileType }),
    `voice.${fileType.split("/")[1] || "webm"}`,
  );

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}` },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new GroqRequestError(response.status);
  const result = (await response.json()) as { text?: string };
  return result.text?.trim() ?? "";
}

/** Server-only Groq chat helper. Keys never reach the browser. */
export async function generateGroqJson(system: string, user: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new GroqRequestError(response.status);
  const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return result.choices?.[0]?.message?.content?.trim() ?? "";
}
