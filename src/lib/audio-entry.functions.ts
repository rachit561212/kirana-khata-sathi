import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { GatewayError, transcribeAudio } from "@lovable.dev/ai-gateway";
import { audioInputSchema, decodeAudioBase64 } from "./audio-entry";

// Public demo entry tool: transcribes one supplied clip, never reads account or ledger data.
// No language hint means the model works out the spoken language itself, so any language is read.
export const transcribeEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => audioInputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    try {
      const bytes = decodeAudioBase64(data.audio);
      const file = new Blob([bytes], { type: data.mime });
      const result = await transcribeAudio({
        model: "openai/gpt-transcribe",
        file,
        ...(data.language && data.language !== "auto" ? { language: data.language } : {}),
      });
      const text = typeof result === "string" ? result : (result?.text ?? "");
      const heard = typeof result === "string" ? [] : (result?.languages ?? []).map((l) => l.code);
      if (!text.trim()) return { text: "", language: heard[0] ?? null, error: "No speech was heard. Try again, or type the details.", retryAfter: null };
      return { text: text.trim(), language: heard[0] ?? null, error: null, retryAfter: null };
    } catch (error) {
      if (error instanceof GatewayError) {
        console.error("Voice transcription failure", { code: error.code, httpStatus: error.httpStatus, outcome: error.outcome });
        const message = error.code === "payment_required" ? "AI credits are exhausted. The app owner needs to add credits. You can still type the details."
          : error.code === "permission_denied" ? "AI access is restricted by workspace settings. The app owner needs to restore access."
          : error.code === "rate_limited" ? "AI is busy. Wait a moment and speak again, or type the details."
          : error.outcome === "unknown" ? "The recording may not have reached us. Your words are kept; type the details rather than sending again."
          : "Voice reading is unavailable right now. You can type the details instead.";
        return { text: "", language: null, error: message, retryAfter: error.code === "rate_limited" ? (error.retryAfter ?? 30) : null };
      }
      console.error("Voice transcription rejected");
      return { text: "", language: null, error: "That recording could not be read. Type the details instead.", retryAfter: null };
    }
  });
