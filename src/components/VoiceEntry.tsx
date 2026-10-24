import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Pencil, Square } from "lucide-react";
import { toast } from "sonner";
import { GoogleGenAI, type Session } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionReview } from "@/components/TransactionReview";
import { extractTransaction } from "@/lib/transaction-entry.functions";
import { createLiveVoiceToken } from "@/lib/gemini-live.functions";
import { createLiveConnectConfig } from "@/lib/gemini-live";
import { arrayBufferToBase64, mergeTranscriptChunk } from "../../vendor/gemini-live-audio-nextjs-template/apps/web/src/components/realtime-voice-chat/audio-utils";
import { useAudioIo } from "../../vendor/gemini-live-audio-nextjs-template/apps/web/src/components/realtime-voice-chat/use-audio-io";
import { AUTO_LANGUAGE, INDIAN_LANGUAGES, WORLD_LANGUAGES, languageLabel } from "@/lib/speech-languages";
import { flushKhata, khata, type Item } from "@/lib/khata";
import type { TransactionDraft } from "@/lib/transaction-entry";

export function VoiceEntry({ onAdded }: { onAdded: (id: string) => void }) {
  const [hint, setHint] = useState(AUTO_LANGUAGE);
  const [note, setNote] = useState("");
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [assistantText, setAssistantText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [manual, setManual] = useState(false);

  const sessionRef = useRef<Session | undefined>(undefined);
  const generationRef = useRef(0);
  const audio = useAudioIo({
    onInputLevel: () => {},
    onOutputLevel: () => {},
    onPcmInput: (buffer) => {
      try {
        sessionRef.current?.sendRealtimeInput({
          audio: { data: arrayBufferToBase64(buffer), mimeType: "audio/pcm;rate=16000" },
        });
      } catch {
        // Ignore the last capture chunk if the live connection is closing.
      }
    },
  });
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const hi = /[\u0900-\u097F]/.test(note) || hint.startsWith("hi");

  useEffect(() => () => {
    generationRef.current += 1;
    sessionRef.current?.close();
    audioRef.current.stopCapture();
    void audioRef.current.cleanupAudio();
  }, []);

  async function startLive() {
    setError("");
    setDraft(null);
    setAssistantText("");
    setLiveStatus("connecting");
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    try {
      const tokenResult = await createLiveVoiceToken({ data: { language: hint } });
      if (!tokenResult.token) throw new Error(tokenResult.error ?? "Could not start voice chat.");

      await audio.setupPlayback();
      await audio.setupCapture();
      const ai = new GoogleGenAI({ apiKey: tokenResult.token, httpOptions: { apiVersion: "v1alpha" } });
      let setupComplete = false;
      let sessionAssigned = false;
      let activated = false;
      const activateAfterSetup = () => {
        if (!setupComplete || !sessionAssigned || activated || generationRef.current !== generation) return;
        activated = true;
        setLiveStatus("live");
        audio.startCapture();
      };

      const session = await ai.live.connect({
        model: tokenResult.model,
        config: createLiveConnectConfig(hint),
        callbacks: {
          onmessage: (message) => {
            if (generationRef.current !== generation) return;
            if (message.setupComplete) {
              setupComplete = true;
              activateAfterSetup();
              return;
            }
            const content = message.serverContent;
            if (!content) return;
            if (content.interrupted) audio.resetPlayback();
            if (content.inputTranscription?.text) {
              setNote((current) => mergeTranscriptChunk(current, content.inputTranscription!.text!));
            }
            if (content.outputTranscription?.text) {
              setAssistantText((current) => mergeTranscriptChunk(current, content.outputTranscription!.text!));
            }
            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) audio.playPcmChunk(part.inlineData.data);
            }
          },
          onerror: (event) => {
            if (generationRef.current !== generation) return;
            setError(event.message || "Gemini voice connection failed. You can type the details instead.");
            void stopLive();
          },
          onclose: (event) => {
            if (generationRef.current !== generation) return;
            sessionRef.current = undefined;
            audio.stopCapture();
            void audio.cleanupAudio();
            setLiveStatus("idle");
            if (event.reason) setError("Voice chat ended. You can still review the transcript or type the details.");
          },
        },
      });

      if (generationRef.current !== generation) {
        session.close();
        return;
      }
      sessionRef.current = session;
      sessionAssigned = true;
      activateAfterSetup();
    } catch (cause) {
      if (generationRef.current !== generation) return;
      const message = cause instanceof Error ? cause.message : "Voice chat could not start.";
      setError(message.includes("GEMINI_API_KEY")
        ? "Voice service is not configured. You can type the details instead."
        : "Voice chat could not start. Check microphone access or try typing the details.");
      await stopLive();
    }
  }

  async function stopLive() {
    generationRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = undefined;
    try { session?.close(); } catch { /* The connection may already be closing. */ }
    audio.stopCapture();
    await audio.cleanupAudio();
    setLiveStatus("idle");
  }

  async function read() {
    if (note.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const result = await extractTransaction({ data: { description: note, language: hint } });
      if (result.error) setError(result.error);
      else if (result.draft) { setDraft(result.draft); setManual(false); }
    } catch {
      setError(hi ? "पढ़न में दिकक़्क हूआ। दोबार कोशिश करे" : "Couldn’t read it just now. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{hi ? "जैसै है बोल दें" : "Just say it"}</h2>
        <label className="flex items-center gap-2 text-xs">
          <span className="sr-only">{hi ? "बात का भाषा" : "Spoken language hint"}</span>
          <select
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            disabled={liveStatus !== "idle"}
            className="h-11 max-w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-foreground"
          >
            <option value={AUTO_LANGUAGE}>{languageLabel(AUTO_LANGUAGE)}</option>
            <optgroup label="India">{INDIAN_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native} · {l.english}</option>)}</optgroup>
            <optgroup label="Other languages">{WORLD_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native} · {l.english}</option>)}</optgroup>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={liveStatus === "live" ? stopLive : startLive}
          disabled={busy || liveStatus === "connecting"}
          aria-label={liveStatus === "live" ? (hi ? "बातचीत बंद करें" : "Stop voice chat") : (hi ? "Gemini से बात शुरू करें" : "Start Gemini voice chat")}
          aria-pressed={liveStatus === "live"}
          className={`grid h-24 w-24 place-items-center rounded-full border-2 transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${liveStatus === "live" ? "animate-pulse border-accent bg-accent text-accent-foreground" : "border-accent/40 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20"}`}
        >
          {liveStatus === "connecting" ? <LoaderCircle className="h-9 w-9 animate-spin" /> : liveStatus === "live" ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-9 w-9" />}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {liveStatus === "connecting" ? (hi ? "Gemini से जुड़ रहे हैं…" : "Connecting to Gemini…")
            : liveStatus === "live" ? (hi ? "Gemini सुन रहा है — बोलें, या बातचीत रोकें" : "Gemini is listening — speak naturally, or stop the chat")
            : hi ? "Gemini से बात करें — वह सुनेगा और जवाब देगा" : "Talk with Gemini — it listens and replies in real time"}
        </p>
      </div>

      {assistantText && (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm" aria-live="polite">
          <span className="font-medium">Gemini: </span>{assistantText}
        </p>
      )}

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="voice-note">{hi ? "आपकी बातचीत का लेख" : "Your spoken transcript"}</Label>
        <textarea
          id="voice-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={hi ? "माइक दबाकर Gemini से बोलें, या यहाँ लिखें" : "Talk with Gemini, or type the transaction here"}
          className="w-full resize-y rounded-md border bg-background px-3 py-2.5 text-base outline-none transition focus:border-foreground sm:text-sm"
        />
      </div>

      {error && <p className="mt-2 flex items-center gap-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 [&>button]:min-h-11">
        <Button onClick={read} disabled={busy || liveStatus !== "idle" || note.trim().length < 3} className="min-h-11 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          {busy ? (hi ? "जाँच रहे हैं…" : "Reading your entry…") : hi ? "पढ़कर जाँचें" : "Read it back for checking"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setManual((m) => !m); setDraft(null); }}>{hi ? "खुद लिखें" : "Type it myself"}</Button>
      </div>

      {manual && <ManualEntry hi={hi} onAdded={onAdded} />}
      {draft && <TransactionReview draft={draft} note={note} hi={hi} onAdded={onAdded} />}
    </section>
  );
}

function ManualEntry({ hi, onAdded }: { hi: boolean; onAdded: (id: string) => void }) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("");
  const [payment, setPayment] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(amount);
    if (!vendor.trim() || !Number.isFinite(n) || n <= 0 || !payment || (kind !== "spent" && kind !== "received")) {
      toast.error(hi ? "नाम, रकम, किसको/किससे और भुगतान भरें" : "Fill person, amount, paid/received and payment");
      return;
    }
    const lines: Item[] = [{ name: "Manual entry", qty: 1, rate: n, gst: 0, cat: "Other" }];
    setSaving(true);
    try {
    const id = khata.addManual({
      vendor: vendor.trim(), amount: n, kind, payment, paymentDetails: details, note: "Typed by shopkeeper",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), items: lines,
    });
    await flushKhata();
    toast.success(hi ? "आपके खाते में जुड़ गया" : "Added to your khata");
    onAdded(id);
    setVendor(""); setAmount(""); setKind(""); setPayment(""); setDetails("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your bill"); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-5 space-y-3 border-t pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="man-who">{hi ? "किसको / किससे" : "Person or shop"}</Label><Input id="man-who" value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="man-amt">{hi ? "रकम (₹)" : "Amount (₹)"}</Label><Input id="man-amt" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-1">
          <Label htmlFor="man-kind">{hi ? "दिए / मिले" : "Paid / received"}</Label>
          <select id="man-kind" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{hi ? "चुनें" : "Choose"}</option><option value="spent">{hi ? "दिए" : "Paid"}</option><option value="received">{hi ? "मिले" : "Received"}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="man-pay">{hi ? "भुगतान" : "Payment method"}</Label>
          <select id="man-pay" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">{hi ? "चुनें" : "Choose"}</option>{["Cash", "UPI", "Card", "Bank transfer", "Credit", "Other"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1"><Label htmlFor="man-details">{hi ? "भुगतान का विवरण" : "Payment reference / details"}</Label><Input id="man-details" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
      <Button className="min-h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving} onClick={save}>{hi ? "खाते में जोड़ें" : "Add to khata"}</Button>
    </div>
  );
}
