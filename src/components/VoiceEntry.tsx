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
import { khata, type Item } from "@/lib/khata";
import type { TransactionDraft } from "@/lib/transaction-entry";

const MIN_BYTES = 2000; // shorter than this is a tap, not a sentence

export function VoiceEntry({ onAdded }: { onAdded: (id: string) => void }) {
  const [hint, setHint] = useState(AUTO_LANGUAGE);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [manual, setManual] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hi = /[\u0900-\u097F]/.test(note) || hint.startsWith("hi");

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  async function start() {
    setError("");
    setDraft(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        resetTimer();
        setRecording(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < MIN_BYTES) { setError(hi ? "आवाज़ बहुत छोट़ी हूआ। दोबार बोलें य लिखें" : "That was too short. Speak again, or type it."); return; }
        setBusy(true);
        try {
          const audio = await blobToBase64(blob);
          const heard = await transcribeEntry({ data: { audio, mime: blob.type, language: hint } });
          if (heard.text) {
            setNote(heard.text);
            const guessed = heard.language && heard.language !== hint ? ` · heard ${heard.language}` : "";
            toast.success(hi ? "आपक बात पकड़ ली गयी" : "Heard you", { description: `${heard.text.slice(0, 70)}${guessed}` });
          } else setError(heard.error ?? "Could not hear anything.");
        } catch {
          setError(hi ? "आवाज़ भेजने में दिकक़्क हूआ। लिख दें" : "Couldn’t send the audio. Type it instead.");
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      resetTimer();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(hi ? "इस ब्राउज़र में माइक नही चलेगा। लिख दें" : "This browser can’t use the mic here. Type it instead.");
    }
  }

  function stop() {
    recRef.current?.state === "recording" && recRef.current.stop();
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
          onClick={recording ? stop : start}
          aria-label={recording ? (hi ? "बोलन बंद करे" : "Stop speaking") : (hi ? "बोलन शुरु करे" : "Start speaking")}
          aria-pressed={recording}
          className={`grid h-24 w-24 place-items-center rounded-full border-2 transition active:scale-95 ${recording ? "animate-pulse border-accent bg-accent text-accent-foreground" : "border-accent/40 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20"}`}
        >
          {busy && !recording ? <LoaderCircle className="h-9 w-9 animate-spin" /> : recording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-9 w-9" />}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {busy ? (hi ? "सुन रहें हैं…" : "Listening to the recording…")
            : recording ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} · ${hi ? "थमनै केलिकै दबाएँ" : "tap to stop"}`
            : hi ? "माइक दबाएँ और बोलें — बिल, कद, रकम, भुगतान" : "Press the mic and talk — bill, goods, amount, payment"}
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="voice-note">{hi ? "आपक बात" : "What you said"}</Label>
        <textarea
          id="voice-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={hi ? "जैसै: राम किराने कै 2000 दिए, क्‍युआर पे" : "Type or dictate: gave Ram Kirana ₹2000 on UPI"}
          className="w-full resize-y rounded-md border bg-background px-3 py-2.5 text-base outline-none transition focus:border-foreground sm:text-sm"
        />
      </div>

      {error && <p className="mt-2 flex items-center gap-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 [&>button]:min-h-11">
        <Button onClick={read} disabled={busy || note.trim().length < 3} className="min-h-11 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          {hi ? "पढ़कर जाँचें" : "Read it back for checking"}
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

  const save = () => {
    const n = Number(amount);
    if (!vendor.trim() || !Number.isFinite(n) || n <= 0 || !payment || (kind !== "spent" && kind !== "received")) {
      toast.error(hi ? "नाम, रकम, किसको/किससे और भुगतान भरें" : "Fill person, amount, paid/received and payment");
      return;
    }
    const lines: Item[] = [{ name: "Manual entry", qty: 1, rate: n, gst: 0, cat: "Other" }];
    const id = khata.addManual({
      vendor: vendor.trim(), amount: n, kind, payment, paymentDetails: details, note: "Typed by shopkeeper",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), items: lines,
    });
    toast.success(hi ? "इस सत्र के खाते में जुड़ गया" : "Added to this session’s khata");
    onAdded(id);
    setVendor(""); setAmount(""); setKind(""); setPayment(""); setDetails("");
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
      <Button className="min-h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={save}>{hi ? "खात सें जोड़ें" : "Add to this session’s khata"}</Button>
    </div>
  );
}
