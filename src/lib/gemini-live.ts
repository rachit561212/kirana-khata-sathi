import {
  EndSensitivity,
  Modality,
  StartSensitivity,
  type LiveConnectConfig,
} from "@google/genai";

export const LIVE_MODEL_ID = "gemini-3.8-live";

export const LIVE_SYSTEM_INSTRUCTION = `You are a concise, friendly live voice assistant for an Indian kirana shopkeeper. Help the shopkeeper describe one transaction at a time in whichever language they use. Ask a short follow-up question when the person/shop, amount, paid-or-received direction, or payment method is unclear. Never guess or invent transaction facts. Briefly repeat the details you heard so the shopkeeper can correct them. Do not save, submit, or claim to add an entry. The app will prepare an editable draft only after the shopkeeper presses its review button.`;

export function createLiveConnectConfig(languageHint = "auto"): LiveConnectConfig {
  const languageInstruction = languageHint === "auto"
    ? "Detect the shopkeeper's language from their speech and answer in that language."
    : `The shopkeeper selected language hint ${languageHint}; prefer that language, while following the language they actually speak.`;

  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction: { parts: [{ text: `${LIVE_SYSTEM_INSTRUCTION} ${languageInstruction}` }] },
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        prefixPaddingMs: 20,
        silenceDurationMs: 700,
      },
    },
  };
}
