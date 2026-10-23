import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { khata } from "@/lib/khata";
import { parseEntry } from "@/lib/voice-entry";

type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function NoBillEntry({ onAdded }: { onAdded: (id: string) => void }) {
  const [lang, setLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [note, setNote] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"spent" | "received">("spent");
  const [payment, setPayment] = useState<"Cash" | "UPI">("Cash");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const rec = useRef<Rec | null>(null);
  const base = useRef("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  const apply = (text: string) => {
    setNote(text);
    const d = parseEntry(text);
    if (d.amount) setAmount(String(d.amount));
    setKind(d.kind); setPayment(d.payment);
  };

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.lang = lang; r.interimResults = true; r.continuous = true;
    base.current = note ? note + " " : "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i]![0]!.transcript;
      apply(base.current + t);
    };
    r.onerror = (e) => { if (e.error === "not-allowed") toast.error("Allow the microphone to speak your entry."); };
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const save = () => {
    const n = Number(amount);
    if (!n || n <= 0) { toast.error(lang === "hi-IN" ? "रकम लिखें" : "Enter an amount"); return; }
    const id = khata.addManual({ vendor, note, amount: n, kind, payment, date: new Date().toISOString().slice(0, 10) });
    onAdded(id);
    toast.success(lang === "hi-IN" ? "खाते में जुड़ गया" : "Added to your khata");
    setNote(""); setVendor(""); setAmount("");
  };

  const hi = lang === "hi-IN";
  const seg = (on: boolean) => `min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{hi ? "बिना बिल के लिखें" : "No bill? Just say it"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{hi ? "बोलिए: “रमेश को 500 रुपये दिए UPI से”" : "Say: “Paid Ramesh 500 by UPI”"}</p>
        </div>
        <div className="flex rounded-lg border p-1" role="group" aria-label="Language">
          <button className={seg(hi)} onClick={() => setLang("hi-IN")}>हिंदी</button>
          <button className={seg(!hi)} onClick={() => setLang("en-IN")}>English</button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button" onClick={toggleMic} disabled={!supported}
          aria-label={listening ? "Stop listening" : "Start speaking"}
          className={`grid h-20 w-20 place-items-center rounded-full shadow-ledger transition disabled:opacity-40 ${listening ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground hover:scale-105"}`}
        >
          {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <span className="text-sm text-muted-foreground">
          {!supported ? (hi ? "इस ब्राउज़र में बोलकर लिखना नहीं चलता — टाइप करें" : "Voice isn't available in this browser — type instead")
            : listening ? (hi ? "सुन रहे हैं… दोबारा दबाकर रोकें" : "Listening… tap again to stop") : (hi ? "दबाकर बोलें" : "Tap and speak")}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="nb-note">{hi ? "क्या हुआ" : "What happened"}</Label>
          <Textarea id="nb-note" lang={hi ? "hi" : "en"} value={note} onChange={(e) => apply(e.target.value)} rows={2} placeholder={hi ? "रमेश को 500 रुपये दिए" : "Paid Ramesh 500"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nb-who">{hi ? "किसको / किससे" : "Person or shop"}</Label>
            <Input id="nb-who" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={hi ? "रमेश" : "Ramesh"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nb-amt">{hi ? "रकम (₹)" : "Amount (₹)"}</Label>
            <Input id="nb-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="500" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex rounded-lg border p-1">
            <button className={seg(kind === "spent")} onClick={() => setKind("spent")}>{hi ? "दिए" : "Paid"}</button>
            <button className={seg(kind === "received")} onClick={() => setKind("received")}>{hi ? "मिले" : "Received"}</button>
          </div>
          <div className="flex rounded-lg border p-1">
            <button className={seg(payment === "Cash")} onClick={() => setPayment("Cash")}>{hi ? "नकद" : "Cash"}</button>
            <button className={seg(payment === "UPI")} onClick={() => setPayment("UPI")}>UPI</button>
          </div>
        </div>
        <Button onClick={save} className="min-h-11 w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
          {hi ? "खाते में जोड़ें" : "Add to khata"}
        </Button>
      </div>
    </div>
  );
}
