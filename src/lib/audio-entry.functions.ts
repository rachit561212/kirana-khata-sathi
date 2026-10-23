import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { generateGeminiContent } from "./gemini";
import { audioInputSchema, decodeAudioBase64 } from "./audio-entry";

export const transcribeEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => audioInputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    try {
      const audio = Buffer.from(decodeAudioBase64(data.audio)).toString("base64");
      const mimeType = data.mime.split(";", 1)[0] || "audio/webm";
      const languageHint = data.language && data.language !== "auto"
        ? ` Optional language hint: ${data.language}.`
        : "";
      const text = await generateGeminiContent("gemini-3.5-transcribe", [{ parts: [
        { text: `Transcribe this Indian kirana shop recording accurately. Preserve vendor and item names, numbers, and amounts in the spoken language. Return only the plain-text transcription.${languageHint}` },
        { inlineData: { mimeType, data: audio } },
      ] }]);
      if (!text) {
        return { text: "", language: null, error: "No speech was heard. Try again, or type the details.", retryAfter: null };
      }
      return { text, language: null, error: null, retryAfter: null };
    } catch {
      console.error("Gemini voice transcription failed");
      return { text: "", language: null, error: "Voice reading is unavailable right now. You can type the details instead.", retryAfter: null };
    }
  });
