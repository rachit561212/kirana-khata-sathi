import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TransactionReview } from "@/components/TransactionReview";
import { extractTransaction } from "@/lib/transaction-entry.functions";
import { normalizeTransaction, type TransactionDraft } from "@/lib/transaction-entry";

type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function NoBillEntry({ onAdded }: { onAdded: (id: string) => void }) {
  const [lang, setLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [revision, setRevision] = useState(0);
  const rec = useRef<Rec | null>(null);
  const base = useRef("");
  const extract = useServerFn(extractTransaction);
  const hi = lang === "hi-IN";
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const changeNote = (text: string) => { setNote(text); setDraft(null); setError(null); };
  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.lang = lang; r.interimResults = true; r.continuous = true;
    base.current = note ? note + " " : "";
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += (e.results[i]?.[0]?.transcript ?? "") + " ";
      changeNote((base.current + text).trim());
    };
    r.onerror = (e) => { setListening(false); toast.error(e.error === "not-allowed" ? (hi ? "माइक की अनुमति दें" : "Allow microphone access") : (hi ? "आवाज़ नहीं मिली; टाइप करें" : "Voice input failed; you can type instead")); };
    r.onend = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); toast.error(hi ? "माइक नहीं खुला" : "Could not start microphone"); }
  };
  const read = async () => {
    if (busy || cooldown || note.trim().length < 3) return;
    setBusy(true); setError(null); setDraft(null);
    try {
      const result = await extract({ data: { description: note, language: lang } });
      setDraft(result.draft); setRevision((n) => n + 1); setError(result.error);
      if (result.retryAfter) setCooldown(Math.ceil(result.retryAfter));
    } catch { setError(hi ? "अभी पढ़ नहीं पाए; नीचे खुद लिखें" : "Unable to read this entry. Enter the details manually."); }
    finally { setBusy(false); }
  };
  return <section aria-label="No-bill transaction" className="min-w-0 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl font-bold">{hi ? "बिना बिल के लिखें" : "No bill? Say or type it"}</h2>
      <div className="flex gap-1" role="group" aria-label="Language">
        <Button variant={hi ? "secondary" : "ghost"} className="min-h-11" disabled={busy || listening} aria-pressed={hi} onClick={() => setLang("hi-IN")}>हिंदी</Button>
        <Button variant={!hi ? "secondary" : "ghost"} className="min-h-11" disabled={busy || listening} aria-pressed={!hi} onClick={() => setLang("en-IN")}>English</Button>
      </div>
    </div>
    <div className="mt-4 flex items-center gap-3">
      <Button type="button" variant="secondary" size="icon" onClick={toggleMic} disabled={!supported || busy} aria-label={listening ? "Stop listening" : "Start speaking"} title={listening ? "Stop listening" : "Start speaking"} className={`h-14 w-14 shrink-0 rounded-full ${listening ? "animate-pulse bg-destructive text-destructive-foreground" : ""}`}>{listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}</Button>
      <span className="text-sm text-muted-foreground">{!supported ? (hi ? "इस ब्राउज़र में आवाज़ नहीं चलती; टाइप करें" : "Voice unavailable in this browser — type instead") : listening ? (hi ? "सुन रहे हैं…" : "Listening…") : (hi ? "दबाकर बोलें" : "Tap and speak")}</span>
    </div>
    <div className="mt-4 space-y-2"><Label htmlFor="nb-note">{hi ? "क्या हुआ" : "Transaction description"}</Label><Textarea id="nb-note" lang={hi ? "hi" : "en"} maxLength={3000} disabled={busy} value={note} onChange={(e) => changeNote(e.target.value)} rows={3} placeholder={hi ? "रमेश से 5 किलो चावल लिए, कुल 500 रुपये UPI से दिए" : "Bought 5 kg rice from Ramesh, paid ₹500 by UPI"} /></div>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button className="min-h-11 bg-accent text-accent-foreground hover:bg-accent/90" onClick={read} disabled={busy || listening || note.trim().length < 3 || cooldown > 0}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? (hi ? "पढ़ रहे हैं…" : "Reading…") : cooldown ? `${cooldown}s` : (hi ? "विवरण निकालें" : "Read transaction")}</Button>
      <Button variant="outline" className="min-h-11" disabled={busy || listening} onClick={() => { setDraft(normalizeTransaction({ vendor: null, items: [], amount: null, payment: null, paymentDetails: null, kind: null, uncertainties: [] })); setRevision((n) => n + 1); }}>{hi ? "खुद लिखें" : "Enter manually"}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {draft && <TransactionReview key={revision} draft={draft} note={note} hi={hi} onAdded={(id) => { onAdded(id); setDraft(null); setNote(""); }} />}
  </section>;
}
