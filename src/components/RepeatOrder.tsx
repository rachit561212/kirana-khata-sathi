import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmt, dateLabel, khata, type Item, type Receipt } from "@/lib/khata";

export function RepeatOrder({ receipts, onAdded }: { receipts: Receipt[]; onAdded: (id: string) => void }) {
  const eligible = receipts.filter((r) => r.kind === "spent" && r.status !== "dismissed");
  const [original, setOriginal] = useState<Receipt | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payment, setPayment] = useState("Cash");
  const [date, setDate] = useState("");
  const choose = (id: string) => {
    const receipt = eligible.find((r) => r.id === id);
    setOriginal(receipt ?? null);
    setItems(receipt?.items.map((i) => ({ ...i })) ?? []);
    setPayment(receipt?.payment ?? "Cash");
    setDate(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  };
  const edit = (idx: number, field: "qty" | "rate", value: string) => setItems((old) => old.map((i, k) => k === idx ? { ...i, [field]: Number(value) } : i));
  const save = () => {
    if (!original || !date || !payment.trim()) return;
    try { const id = khata.addRepeat(original, items, date, payment); onAdded(id); setOriginal(null); setItems([]); toast.success("Repeat order added to this session’s khata"); }
    catch { toast.error("Check the quantity and rate for each item"); }
  };
  return <section aria-label="Repeat order" className="min-w-0 border-t pt-6">
    <h2 className="flex items-center gap-2 font-display text-xl font-bold"><RotateCcw className="h-5 w-5" />Order again · फिर से खरीदें</h2>
    <div className="mt-4 space-y-2"><Label htmlFor="repeat-bill">Previous bill</Label><select id="repeat-bill" value={original?.id ?? ""} onChange={(e) => choose(e.target.value)} className="h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm"><option value="">Choose a previous order</option>{eligible.map((r) => <option key={r.id} value={r.id}>{r.vendor} · {dateLabel(r.date)} · {r.id}</option>)}</select></div>
    {!eligible.length && <p className="mt-2 text-sm text-muted-foreground">No previous orders yet.</p>}
    {original && <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="repeat-date">Date</Label><Input id="repeat-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="repeat-payment">Paid by</Label><select id="repeat-payment" value={payment} onChange={(e) => setPayment(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">{[...new Set([payment, "Cash", "UPI", "Card", "Bank transfer", "Credit"])].map((p) => <option key={p}>{p}</option>)}</select></div></div>
      <div className="divide-y">{items.map((item, i) => <div key={i} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_100px_120px_auto_44px] sm:items-end">
        <span className="self-center break-words text-sm font-medium">{item.name}</span>
        <div className="space-y-1"><Label htmlFor={`repeat-qty-${i}`}>Quantity</Label><Input id={`repeat-qty-${i}`} type="number" min="0.001" step="any" inputMode="decimal" value={item.qty} onChange={(e) => edit(i, "qty", e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`repeat-rate-${i}`}>Rate ₹</Label><Input id={`repeat-rate-${i}`} type="number" min="0" step="any" inputMode="decimal" value={item.rate} onChange={(e) => edit(i, "rate", e.target.value)} /></div>
        <span className="self-center font-mono text-sm">{fmt(item.qty * item.rate * (1 + item.gst / 100))}</span>
        <Button variant="ghost" size="icon" aria-label={`Remove repeat item ${i + 1}`} title="Remove item" onClick={() => setItems((old) => old.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}</div>
      <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span className="font-mono">{fmt(items.reduce((s, i) => s + i.qty * i.rate * (1 + i.gst / 100), 0))}</span></div>
      <p className="text-xs text-muted-foreground">Session only — entries disappear when this page is reloaded.</p>
      <Button className="min-h-11 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!items.length || !date || !payment} onClick={save}>Add repeat order</Button>
    </div>}
  </section>;
}