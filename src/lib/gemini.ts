type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };

/** Calls Gemini from the server without exposing the API key to the browser. */
export async function generateGeminiContent(
  model: string,
  contents: Array<{ parts: GeminiPart[] }>,
  config?: { systemInstruction?: string; responseMimeType?: string; responseJsonSchema?: Record<string, unknown> },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
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
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const result = await response.json() as GeminiResponse;
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}
