import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { flushKhata, khata, type Item } from "@/lib/khata";
import type { TransactionDraft } from "@/lib/transaction-entry";
import { StockMovementField } from "@/components/StockMovementField";
import type { StockMovement } from "@/lib/khata";

export function TransactionReview({ draft, note, hi, onAdded }: { draft: TransactionDraft; note: string; hi: boolean; onAdded: (id: string) => void }) {
  const [vendor, setVendor] = useState(draft.vendor ?? "");
  const [amount, setAmount] = useState(draft.amount?.toString() ?? "");
  const [payment, setPayment] = useState(draft.payment ?? "");
  const [details, setDetails] = useState(draft.paymentDetails ?? "");
  const [kind, setKind] = useState(draft.kind ?? "");
  const [stockMovement, setStockMovement] = useState<StockMovement | "">(draft.stockMovement ?? (draft.items.length ? "" : "none"));
  const [items, setItems] = useState(draft.items.map((i) => ({ name: i.name, quantity: i.quantity?.toString() ?? "", lineAmount: i.lineAmount?.toString() ?? "" })));
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const flag = (field: string) => draft.uncertainties.filter((u) => u.field === field).map((u, i) => <p key={i} className="flex gap-1 text-xs text-destructive"><TriangleAlert className="h-3.5 w-3.5 shrink-0" />{u.reason}</p>);
  const edit = (idx: number, field: "name" | "quantity" | "lineAmount", value: string) => setItems((old) => old.map((i, k) => k === idx ? { ...i, [field]: value } : i));
  const save = async () => {
    if (!stockMovement) { toast.error("Check stock movement before saving"); return; }
    if (stockMovement !== "none" && !items.length) { toast.error("Add the goods and quantities before changing stock"); return; }
    const n = Number(amount);
    if (!vendor.trim() || !Number.isFinite(n) || n <= 0 || !payment || (kind !== "spent" && kind !== "received")) { toast.error(hi ? "नाम, रकम और भुगतान जाँचें" : "Check person, amount and payment"); return; }
    if (items.some((i) => !i.name.trim() || !i.quantity || !i.lineAmount || !Number.isFinite(Number(i.quantity)) || Number(i.quantity) <= 0 || !Number.isFinite(Number(i.lineAmount)) || Number(i.lineAmount) < 0)) { toast.error(hi ? "हर सामान की मात्रा और कीमत लिखें" : "Enter quantity and line amount for every item"); return; }
    if (items.length && Math.abs(items.reduce((s, i) => s + Number(i.lineAmount), 0) - n) > 0.01) { toast.error(hi ? "सामान का जोड़ कुल रकम से अलग है" : "Item amounts must match the total"); return; }
    const lines: Item[] = items.map((i) => ({ name: i.name.trim(), qty: Number(i.quantity), rate: Number(i.lineAmount) / Number(i.quantity), gst: 0, cat: "Other" }));
    setSaving(true);
    try {
    const id = khata.addManual({ vendor: vendor.trim(), amount: n, kind, payment, paymentDetails: details, note, date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), items: lines, stockMovement });
    await flushKhata();
    onAdded(id);
    toast.success(hi ? "आपके खाते में जुड़ गया" : "Added to your khata");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your bill"); }
    finally { setSaving(false); }
  };
  return <div className="mt-5 space-y-4 border-t pt-5">
    <h3 className="font-semibold">{hi ? "जाँचें और जोड़ें" : "Review transaction"}</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="nb-who">{hi ? "किसको / किससे" : "Person or shop"}</Label><Input id="nb-who" value={vendor} onChange={(e) => setVendor(e.target.value)} />{flag("vendor")}</div>
      <div className="space-y-1.5"><Label htmlFor="nb-amt">{hi ? "कुल रकम (₹)" : "Total amount (₹)"}</Label><Input id="nb-amt" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />{flag("amount")}</div>
      <div className="space-y-1.5"><Label htmlFor="nb-kind">{hi ? "दिए / मिले" : "Paid / received"}</Label><select id="nb-kind" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">{hi ? "चुनें" : "Choose"}</option><option value="spent">{hi ? "दिए" : "Paid"}</option><option value="received">{hi ? "मिले" : "Received"}</option></select>{flag("kind")}</div>
      <div className="space-y-1.5"><Label htmlFor="nb-payment">{hi ? "भुगतान" : "Payment method"}</Label><select id="nb-payment" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={payment} onChange={(e) => setPayment(e.target.value)}><option value="">{hi ? "चुनें" : "Choose"}</option>{["Cash", "UPI", "Card", "Bank transfer", "Credit", "Other"].map((p) => <option key={p}>{p}</option>)}</select>{flag("payment")}</div>
    </div>
    <div className="space-y-1.5"><Label htmlFor="nb-details">{hi ? "भुगतान का विवरण" : "Payment reference / details"}</Label><Input id="nb-details" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
    <StockMovementField id="ai-stock-movement" value={stockMovement} onChange={setStockMovement} disabled={saving} />
    {flag("stockMovement")}
    <div className="space-y-3">
      <div className="flex items-center justify-between"><Label>{hi ? "सामान" : "Items"}</Label><Button variant="ghost" size="sm" onClick={() => setItems((old) => [...old, { name: "", quantity: "", lineAmount: "" }])}><Plus className="h-4 w-4" />{hi ? "सामान जोड़ें" : "Add item"}</Button></div>
      {flag("items")}
      {items.map((item, i) => <div key={i} className="grid gap-2 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_100px_140px_44px]">
        <div className="space-y-1"><Label htmlFor={`ai-name-${i}`}>{hi ? "सामान" : "Item"} {i + 1}</Label><Input id={`ai-name-${i}`} value={item.name} onChange={(e) => edit(i, "name", e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`ai-qty-${i}`}>{hi ? "मात्रा" : "Quantity"}</Label><Input id={`ai-qty-${i}`} type="number" inputMode="decimal" value={item.quantity} onChange={(e) => edit(i, "quantity", e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`ai-line-${i}`}>{hi ? "सामान की कुल कीमत ₹" : "Line amount ₹"}</Label><Input id={`ai-line-${i}`} type="number" inputMode="decimal" value={item.lineAmount} onChange={(e) => edit(i, "lineAmount", e.target.value)} /></div>
        <Button variant="ghost" size="icon" className="self-end" aria-label={`Remove item ${i + 1}`} title="Remove item" onClick={() => setItems((old) => old.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
    </div>
    {draft.uncertainties.length > 0 && <label className="flex items-start gap-3 text-sm"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /><span>{hi ? "मैंने सभी चिन्हित बातें जाँच ली हैं" : "I have checked all flagged details"}</span></label>}
    <Button className="min-h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving || (draft.uncertainties.length > 0 && !checked)} onClick={save}>{hi ? "खाते में जोड़ें" : "Add to khata"}</Button>
  </div>;
}