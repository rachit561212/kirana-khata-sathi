import { z } from "zod";

/** A spoken clip, sent as base64 so it can travel through a plain JSON server function.
 * The mime type may carry recorder parameters (`audio/webm;codecs=opus`), which is what browsers actually report. */
export const audioInputSchema = z.object({
  audio: z.string().min(64).max(4_000_000),
  mime: z.string().regex(/^audio\/[a-z0-9.+-]+(;.*)?$/i),
  language: z.string().trim().max(35).optional(),
});
export type AudioEntryInput = z.infer<typeof audioInputSchema>;

/** ~3 minutes of compressed speech; anything longer is rejected before it leaves the phone. */
export const MAX_CLIP_SECONDS = 200;

/** Strips an optional `data:audio/webm;base64,` prefix and decodes to bytes. Throws on junk. */
export function decodeAudioBase64(value: string): Uint8Array<ArrayBuffer> {
  const raw = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const clean = raw.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) throw new Error("Audio clip is not readable");
  const bin = atob(clean);
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read the recording"));
    fr.readAsDataURL(blob);
  });
}
