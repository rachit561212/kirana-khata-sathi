import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Pencil, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionReview } from "@/components/TransactionReview";
import { extractTransaction } from "@/lib/transaction-entry.functions";
import { transcribeEntry } from "@/lib/audio-entry.functions";
import { blobToBase64 } from "@/lib/audio-entry";
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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hi = /[\u0900-\u097F]/.test(note) || hint.startsWith("hi");

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startLive() {
    setError("");
    setDraft(null);
    setLiveStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("This browser cannot record audio.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setLiveStatus("idle");
        const clip = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!clip.size) return;
        setBusy(true);
        try {
          const encoded = await blobToBase64(clip);
          const result = await transcribeEntry({ data: { audio: encoded, mime: clip.type || "audio/webm", language: hint } });
          if (result.error) setError(result.error);
          else if (result.text) setNote((current) => current.trim() ? `${current.trim()} ${result.text}` : result.text);
        } catch {
          setError("Voice transcription failed. You can type the details instead.");
        } finally { setBusy(false); }
      };
      recorderRef.current = recorder;
      recorder.start();
      setLiveStatus("live");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setLiveStatus("idle");
      setError("Could not start recording. Check microphone permission or type the details instead.");
    }
  }

  async function stopLive() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    else setLiveStatus("idle");
  }

  async function read() {
    if (note.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      // Stop recording before sending the transcript for review.
      if (liveStatus !== "idle") await stopLive();
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
          aria-label={liveStatus === "live" ? (hi ? "रिकॉर्डिंग बंद करें" : "Stop recording") : (hi ? "बोलकर लिखें" : "Record transaction")}
          aria-pressed={liveStatus === "live"}
          className={`grid h-24 w-24 place-items-center rounded-full border-2 transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${liveStatus === "live" ? "animate-pulse border-accent bg-accent text-accent-foreground" : "border-accent/40 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20"}`}
        >
          {liveStatus === "connecting" ? <LoaderCircle className="h-9 w-9 animate-spin" /> : liveStatus === "live" ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-9 w-9" />}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {liveStatus === "connecting" ? (hi ? "माइक चालू हो रहा है…" : "Starting microphone…")
            : liveStatus === "live" ? (hi ? "बोलें, फिर रिकॉर्डिंग रोकें" : "Speak, then stop recording to transcribe")
            : hi ? "बोलकर लिखें — Groq आवाज़ को लिखेगा" : "Record a transaction; Groq will transcribe it"}
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="voice-note">{hi ? "आपकी बातचीत का लेख" : "Your spoken transcript"}</Label>
        <textarea
          id="voice-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={hi ? "बोलकर लिखें, या लेनदेन यहाँ टाइप करें" : "Record your transaction, or type it here"}
          className="w-full resize-y rounded-md border bg-background px-3 py-2.5 text-base outline-none transition focus:border-foreground sm:text-sm"
        />
      </div>

      {error && <p className="mt-2 flex items-center gap-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 [&>button]:min-h-11">
        <Button onClick={read} disabled={busy || liveStatus === "connecting" || note.trim().length < 3} className="min-h-11 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
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
