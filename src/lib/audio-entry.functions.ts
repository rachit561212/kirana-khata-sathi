import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { transcribeGroqAudio, groqFailureMessage } from "./groq";
import { audioInputSchema, decodeAudioBase64 } from "./audio-entry";

export const transcribeEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => audioInputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    try {
      const audio = decodeAudioBase64(data.audio);
      const mimeType = data.mime.split(";", 1)[0] || "audio/webm";
      const text = await transcribeGroqAudio(audio, mimeType, data.language);
      if (!text) {
        return {
          text: "",
          language: null,
          error: "No speech was heard. Try again, or type the details.",
          retryAfter: null,
        };
      }
      return { text, language: null, error: null, retryAfter: null };
    } catch (error) {
      console.error("Groq voice transcription failed");
      return { text: "", language: null, error: groqFailureMessage(error, true), retryAfter: null };
    }
  });
