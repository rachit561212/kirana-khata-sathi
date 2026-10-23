import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BillQrScanner } from "@/components/BillQrScanner";
import { supabase } from "@/integrations/supabase/client";
import { CATS, dateLabel, flushKhata, fmt, khata, totalOf, useKhata, type Cat } from "@/lib/khata";
import { moneyBalance } from "@/lib/sales";
import { receiptProducts } from "@/lib/products";

export const Route = createFileRoute("/app/sales")({
  head: () => ({ meta: [
    { title: "Sales & customer refunds — Hisaab" },
    { name: "description", content: "Record customer sales and refunds, review bill QR items, and track stock and your money balance in Hisaab." },
    { property: "og:title", content: "Sales & customer refunds — Hisaab" },
    { property: "og:description", content: "Customer sales, refunds, stock and money-in minus money-out in your shop account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SalesScreen,
});

type Line = { name: string; qty: string; rate: string; gst: string };
const emptyLine = (): Line => ({ name: "", qty: "", rate: "", gst: "0" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function SalesScreen() {
  const account = useQuery({ queryKey: ["sales-account"], queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ? { id: data.user.id } : null;
  } });
  const receipts = useKhata();
  const [type, setType] = useState<"sale" | "refund">("sale");
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(today);
  const [payment, setPayment] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<Cat>("Other");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [amount, setAmount] = useState("");
  const [returned, setReturned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [savedId, setSavedId] = useState("");
  const hasGoods = type === "sale" || returned;
  const total = hasGoods ? lines.reduce((sum, i) => sum + Number(i.qty) * Number(i.rate) * (1 + Number(i.gst) / 100), 0) : Number(amount);
  const rows = account.data ? receipts : [];
  const balance = moneyBalance(rows);
  const products = receiptProducts(rows);
  const history = rows.filter((r) => ["Customer sale", "Customer refund"].includes(r.source) && (r.status === "accepted" || r.status === "corrected") && !r.dupOf).sort((a, b) => b.date.localeCompare(a.date));
  const edit = (index: number, field: keyof Line, value: string) => {
    setReviewed(false);
    setLines((old) => old.map((line, i) => i === index ? { ...line, [field]: value } : line));
  };
  const save = async () => {
    if (!reviewed || saving) return;
    setSaving(true); setSavedId("");
    try {
      const id = khata.addCustomerTransaction({ type, customer, date, payment, paymentDetails: details,
        amount: Number(amount), goodsReturned: returned,
        items: lines.map((line) => ({ name: line.name, qty: Number(line.qty), rate: Number(line.rate), gst: Number(line.gst), cat: category })),
      });
      await flushKhata();
      setSavedId(id); setCustomer(""); setLines([emptyLine()]); setAmount(""); setDetails(""); setPayment(""); setReviewed(false); setReturned(false);
      toast.success(type === "sale" ? "Sale saved" : "Refund saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save this entry"); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold">Sales</h1></div>
    {account.isPending ? <p role="status">Loading your account…</p> : !account.data ?
      <div className="border-y py-10 text-center"><ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to record sales and customer refunds.</p></div> : <>
      <dl className="grid grid-cols-1 gap-4 border-y py-5 sm:grid-cols-3">
        <div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDownLeft className="h-4 w-4" />Money in · all time</dt><dd className="mt-2 font-mono text-2xl font-semibold">{fmt(balance.received)}</dd></div>
        <div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUpRight className="h-4 w-4" />Money out · all time</dt><dd className="mt-2 font-mono text-2xl font-semibold">{fmt(balance.spent)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Net balance</dt><dd className="mt-2 font-mono text-2xl font-semibold">{fmt(balance.net)}</dd></div>
      </dl>
      <section aria-label="Customer entry" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1" role="group" aria-label="Entry type">
            <Button variant={type === "sale" ? "default" : "outline"} aria-pressed={type === "sale"} disabled={saving} onClick={() => { setType("sale"); setReviewed(false); }}>Sale · money in</Button>
            <Button variant={type === "refund" ? "default" : "outline"} aria-pressed={type === "refund"} disabled={saving} onClick={() => { setType("refund"); setReviewed(false); }}>Refund · money out</Button>
          </div>
          <BillQrScanner context="customer" disabled={saving || !hasGoods} onRead={(draft) => {
            setCustomer(draft.vendor); setDate(draft.date ?? today()); setLines(draft.items.map((i) => ({ name: i.name, qty: String(i.qty), rate: String(i.rate), gst: String(i.gst) }))); setPayment(""); setDetails(""); setReviewed(false);
          }} />
        </div>
        <fieldset disabled={saving} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="sale-customer">Customer</Label><Input id="sale-customer" value={customer} onChange={(e) => { setCustomer(e.target.value); setReviewed(false); }} /></div>
            <div className="space-y-1.5"><Label htmlFor="sale-date">Date</Label><Input id="sale-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setReviewed(false); }} /></div>
          </div>
          {type === "refund" && <label className="flex items-center gap-3 text-sm"><Checkbox checked={returned} onCheckedChange={(value) => { setReturned(value === true); setReviewed(false); }} />Goods returned to stock</label>}
          {hasGoods ? <>
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{type === "sale" ? "Items sold" : "Items returned"}</h2><Button variant="ghost" size="sm" onClick={() => { setLines((old) => [...old, emptyLine()]); setReviewed(false); }}><Plus className="h-4 w-4" />Add item</Button></div>
            <datalist id="sale-products">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            {lines.map((line, i) => <div key={i} className="grid gap-3 border-b pb-4 sm:grid-cols-[minmax(0,1fr)_80px_100px_80px_44px] sm:items-end">
              <div className="min-w-0 space-y-1.5"><Label htmlFor={`sale-item-${i}`}>Item {i + 1}</Label><Input id={`sale-item-${i}`} list="sale-products" value={line.name} onChange={(e) => edit(i, "name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor={`sale-qty-${i}`}>Quantity</Label><Input id={`sale-qty-${i}`} type="number" min="0" step="any" inputMode="decimal" value={line.qty} onChange={(e) => edit(i, "qty", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor={`sale-rate-${i}`}>Rate ₹</Label><Input id={`sale-rate-${i}`} type="number" min="0" step="any" inputMode="decimal" value={line.rate} onChange={(e) => edit(i, "rate", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor={`sale-gst-${i}`}>GST %</Label><Input id={`sale-gst-${i}`} type="number" min="0" max="100" step="any" value={line.gst} onChange={(e) => edit(i, "gst", e.target.value)} /></div>
              <Button variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} title="Remove item" onClick={() => { setLines((old) => old.filter((_, k) => k !== i)); setReviewed(false); }}><Trash2 className="h-4 w-4" /></Button>
            </div>)}
            <div className="max-w-sm space-y-1.5"><Label htmlFor="sale-category">Category</Label><select id="sale-category" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={category} onChange={(e) => { const next = CATS.find((c) => c === e.target.value); if (next) setCategory(next); setReviewed(false); }}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          </> : <div className="max-w-sm space-y-1.5"><Label htmlFor="refund-amount">Refund amount ₹</Label><Input id="refund-amount" type="number" min="0" step="any" value={amount} onChange={(e) => { setAmount(e.target.value); setReviewed(false); }} /></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="sale-payment">{type === "sale" ? "Received by" : "Refund paid by"}</Label><select id="sale-payment" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={payment} onChange={(e) => { setPayment(e.target.value); setReviewed(false); }}><option value="">Choose</option>{["Cash", "UPI", "Card", "Bank transfer", "Other"].map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="sale-reference">Payment reference / note</Label><Input id="sale-reference" value={details} onChange={(e) => { setDetails(e.target.value); setReviewed(false); }} /></div>
          </div>
          <label className="flex items-start gap-3 text-sm"><Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} /><span>{type === "sale" ? "Customer payment received; items and quantities checked" : returned ? "Refund paid; returned goods and quantities checked" : "Refund paid; no goods returned"}</span></label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="font-mono text-xl font-semibold">{fmt(Number.isFinite(total) ? total : 0)}</p><Button className="min-h-11" disabled={saving || !reviewed} onClick={() => void save()}>{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{type === "sale" ? "Save sale" : "Save refund"}</Button></div>
        {savedId && <p role="status" className="text-sm">Saved to your account. <Link to="/app/receipts" className="font-medium text-primary underline">View receipts</Link></p>}
      </section>
      <section className="space-y-3 border-t pt-5"><h2 className="font-display text-xl font-semibold">Sales & refunds</h2>{!history.length ? <p className="py-6 text-muted-foreground">No customer entries yet</p> : <ul className="divide-y">{history.map((r) => <li key={r.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-medium">{r.vendor}</p><p className="text-sm text-muted-foreground">{dateLabel(r.date)} · {r.source === "Customer sale" ? "Sale" : "Refund"} · {r.payment}</p></div><p className="shrink-0 font-mono font-semibold">{r.kind === "received" ? "+" : "−"}{fmt(totalOf(r))}</p></li>)}</ul>}</section>
    </>}
  </div>;
}