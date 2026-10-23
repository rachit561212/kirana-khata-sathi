import { expect, it } from "vitest";
import { audioInputSchema, decodeAudioBase64 } from "@/lib/audio-entry";

const clip = btoa("x".repeat(120));

it("accepts only a readable audio clip", () => {
  expect(audioInputSchema.safeParse({ audio: clip, mime: "audio/webm" }).success).toBe(true);
  expect(audioInputSchema.safeParse({ audio: clip, mime: "audio/webm;codecs=opus" }).success).toBe(true);
  expect(audioInputSchema.safeParse({ audio: clip, mime: "audio/mp4" }).success).toBe(true);
  expect(audioInputSchema.safeParse({ audio: clip, mime: "audio/webm", language: "auto" }).success).toBe(true);
  expect(audioInputSchema.safeParse({ audio: clip, mime: "text/html" }).success).toBe(false);
  expect(audioInputSchema.safeParse({ audio: "not base64 at all !!!", mime: "audio/webm" }).success).toBe(false);
  expect(audioInputSchema.safeParse({ audio: "", mime: "audio/webm" }).success).toBe(false);
});

it("decodes a data URL back to exactly the bytes that were recorded", () => {
  const payload = new Uint8Array([1, 2, 3, 250, 255, 128, 64]);
  const dataUrl = `data:audio/webm;base64,${btoa(String.fromCharCode(...payload))}`;
  expect(Array.from(decodeAudioBase64(dataUrl))).toEqual(Array.from(payload));
  expect(Array.from(decodeAudioBase64(btoa(String.fromCharCode(...payload))))).toEqual(Array.from(payload));
  expect(() => decodeAudioBase64("!!!! not audio !!!!")).toThrow();
});
