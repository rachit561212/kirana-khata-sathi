import { useMemo, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, khata, totalOf, useKhata, type Cat, type PaidState } from "@/lib/khata";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

type Line = { name: string; qty: string; rate: string };

/** Goods ordered from a supplier — often paid for later, so “what is still owed” is the point. */
export function PurchaseOrder({ onAdded }: { onAdded: (id: string) => void }) {
  const receipts = useKhata();
  const vendors = useMemo(() => [...new Set(receipts.map((r) => r.vendor))].sort(), [receipts]);

  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(today);
  const [expected, setExpected] = useState(addDays(2));
  const [cat, setCat] = useState<Cat>("Staples");
  const [paidState, setPaidState] = useState<PaidState>("unpaid");
  const [payment, setPayment] = useState("UPI");
  const [lines, setLines] = useState<Line[]>([{ name: "", qty: "", rate: "" }]);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);

  const edit = (i: number, field: keyof Line, value: string) => setLines((old) => old.map((l, k) => (k === i ? { ...l, [field]: value } : l)));

  const save = () => {
    const items = lines
      .filter((l) => l.name.trim())
      .map((l) => ({ name: l.name.trim(), qty: Number(l.qty), rate: Number(l.rate), gst: 0, cat }));
    if (!vendor.trim()) { toast.error("Which supplier?"); return; }
    if (!items.length) { toast.error("Add at least one item"); return; }
    if (items.some((i) => !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.rate) || i.rate < 0)) { toast.error("Enter a quantity and rate for every item"); return; }
    setSaving(true);
    try {
      const id = khata.addPurchaseOrder({ vendor, date, items, paidState, payment });
      toast.success("Purchase order saved", {
        description: paidState === "unpaid" ? `${items.length} items · nothing paid yet · ${id}` : `${items.length} items · ${paidState === "partial" ? "part paid" : "paid"} · ${id}`,
      });
      onAdded(id);
      setVendor(""); setLines([{ name: "", qty: "", rate: "" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold sm:text-2xl">Purchased order</h2>
      <p className="mt-1 text-sm text-muted-foreground">What you ordered from a supplier — and whether it is paid for yet.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="po-vendor">Supplier</Label>
          <Input id="po-vendor" list="po-vendors" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Sharma Agencies" />
          <datalist id="po-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="po-cat">Category</Label>
          <select id="po-cat" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value as Cat)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="po-date">Order date</Label>
          <Input id="po-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="po-expected">Expected delivery</Label>
          <Input id="po-expected" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="h-11" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items ordered</Label>
          <Button variant="ghost" size="sm" onClick={() => setLines((old) => [...old, { name: "", qty: "", rate: "" }])}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_92px_110px_90px_44px] sm:items-end">
            <div className="space-y-1"><Label htmlFor={`po-name-${i}`} className="text-xs">Item {i + 1}</Label><Input id={`po-name-${i}`} value={l.name} onChange={(e) => edit(i, "name", e.target.value)} placeholder="Rice 25kg" /></div>
            <div className="space-y-1"><Label htmlFor={`po-qty-${i}`} className="text-xs">Qty</Label><Input id={`po-qty-${i}`} type="number" inputMode="decimal" min="0" value={l.qty} onChange={(e) => edit(i, "qty", e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor={`po-rate-${i}`} className="text-xs">Rate ₹</Label><Input id={`po-rate-${i}`} type="number" inputMode="decimal" min="0" value={l.rate} onChange={(e) => edit(i, "rate", e.target.value)} /></div>
            <div className="pb-2 text-right font-mono text-sm">₹{Math.round((Number(l.qty) || 0) * (Number(l.rate) || 0)).toLocaleString("en-IN")}</div>
            <Button variant="ghost" size="icon" className="self-end" aria-label={`Remove item ${i + 1}`} title="Remove item" onClick={() => setLines((old) => old.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Payment</Label>
          <div className="grid grid-cols-3 rounded-md border p-0.5">
            {([["unpaid", "Not paid"], ["partial", "Part paid"], ["paid", "Paid"]] as const).map(([value, label]) => (
              <Button key={value} variant="ghost" size="sm" onClick={() => setPaidState(value)} aria-pressed={paidState === value}
                className={`min-h-11 rounded px-2 text-xs font-semibold ${paidState === value ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground hover:bg-muted"}`}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        {paidState !== "unpaid" && (
          <div className="space-y-1.5">
            <Label htmlFor="po-payment">Paid by</Label>
            <select id="po-payment" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={payment} onChange={(e) => setPayment(e.target.value)}>
              {["Cash", "UPI", "Card", "Bank transfer", "Credit", "Other"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="font-mono text-lg font-semibold">₹{Math.round(total).toLocaleString("en-IN")}</p>
        <Button className="min-h-11 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={save} disabled={saving}>
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save purchase order
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Session only — this order disappears when the page is reloaded.</p>
    </section>
  );
}

export const purchaseOrderTotal = (items: { qty: number; rate: number; gst: number }[]) =>
  items.reduce((s, i) => s + i.qty * i.rate * (1 + i.gst / 100), 0);
