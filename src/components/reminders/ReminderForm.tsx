import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cleanPhone, todayIso, validDate, validPhone, type Reminder, type ReminderKind } from "@/lib/reminders";
import type { ReminderInput } from "@/lib/reminder-data";

const TITLES = { stock: ["Stock reminder", "Item name"], pay: ["Money to pay", "Supplier or person"], collect: ["Money to collect", "Customer or person"] } as const;

export function ReminderForm({ open, onOpenChange, kind, initial, preset, onSubmit, names = [] }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: ReminderKind; initial?: Reminder | undefined; preset?: Partial<ReminderInput> | undefined;
  onSubmit: (v: ReminderInput) => Promise<void>; names?: string[];
}) {
  const blank = { title: "", amount: "", due: "", note: "", supplier: "", phone: "", qty: "", date: todayIso() };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const s = initial ?? preset;
    setErr("");
    setF(s ? { title: s.title ?? "", amount: s.amount ? String(initial ? initial.amount : s.amount) : "", due: s.due_date ?? "", note: s.note ?? "", supplier: s.supplier_name ?? "", phone: s.supplier_phone ?? "", qty: s.quantity != null ? String(s.quantity) : "", date: s.entry_date ?? todayIso() } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, preset]);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const amount = Number(f.amount);
    if (!f.title.trim()) return setErr(`Enter the ${TITLES[kind][1].toLowerCase()}`);
    if (kind !== "stock" && !(amount > 0 && amount < 1e9)) return setErr("Enter an amount greater than ₹0");
    if (f.due && !validDate(f.due)) return setErr("Choose a valid date");
    if (kind === "collect" && !validDate(f.date)) return setErr("Choose a valid borrowing date");
    if (kind === "pay" && !f.due) return setErr("Choose the payment deadline");
    if (!validPhone(f.phone)) return setErr("Enter a valid phone number");
    if (f.qty && !(Number(f.qty) >= 0)) return setErr("Enter a valid quantity");
    setBusy(true); setErr("");
    try {
      await onSubmit({ kind, title: f.title, amount: kind === "stock" ? 0 : amount, due_date: f.due || null, note: f.note, supplier_name: f.supplier, supplier_phone: cleanPhone(f.phone), quantity: f.qty ? Number(f.qty) : null, ...(kind === "collect" ? { entry_date: f.date } : {}) });
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} {TITLES[kind][0].toLowerCase()}</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="space-y-1.5"><Label htmlFor="rf-title">{TITLES[kind][1]}</Label><Input id="rf-title" value={f.title} onChange={set("title")} list="rf-names" autoFocus /></div>
        <datalist id="rf-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
        {kind === "stock" ? <>
          <div className="space-y-1.5"><Label htmlFor="rf-qty">Stock left (optional)</Label><Input id="rf-qty" inputMode="decimal" value={f.qty} onChange={set("qty")} /></div>
          <div className="space-y-1.5"><Label htmlFor="rf-sup">Supplier name</Label><Input id="rf-sup" value={f.supplier} onChange={set("supplier")} /></div>
          <div className="space-y-1.5"><Label htmlFor="rf-phone">Supplier phone</Label><Input id="rf-phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="98xxxxxxxx" /></div>
        </> : <>
          <div className="space-y-1.5"><Label htmlFor="rf-amt">{initial ? "Total amount ₹" : "Amount ₹"}</Label><Input id="rf-amt" inputMode="decimal" value={f.amount} onChange={set("amount")} /></div>
          {kind === "collect" && <div className="space-y-1.5"><Label htmlFor="rf-date">Borrowed on</Label><Input id="rf-date" type="date" value={f.date} onChange={set("date")} /></div>}
          <div className="space-y-1.5"><Label htmlFor="rf-due">{kind === "pay" ? "Pay by" : "Expected repayment (optional)"}</Label><Input id="rf-due" type="date" value={f.due} onChange={set("due")} /></div>
        </>}
        <div className="space-y-1.5"><Label htmlFor="rf-note">{kind === "collect" ? "Details (optional)" : "Notes (optional)"}</Label><Input id="rf-note" value={f.note} onChange={set("note")} /></div>
        {err && <p role="alert" className="text-sm font-medium text-destructive">{err}</p>}
        <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="min-h-11" disabled={busy}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function AmountDialog({ open, onOpenChange, title, max, label, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; max?: number | undefined; label: string; onSubmit: (n: number) => Promise<void> }) {
  const [v, setV] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV(max ? String(max) : ""); setErr(""); } }, [open, max]);
  const go = async () => {
    const n = Number(v);
    if (!(n > 0) || (max != null && n > max)) return setErr(max != null ? `Enter an amount from ₹1 to ₹${max.toLocaleString("en-IN")}` : "Enter an amount greater than ₹0");
    setBusy(true);
    try { await onSubmit(n); onOpenChange(false); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <div className="space-y-1.5"><Label htmlFor="ad-amt">{label}</Label><Input id="ad-amt" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></div>
      {err && <p role="alert" className="text-sm font-medium text-destructive">{err}</p>}
      <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="min-h-11" disabled={busy}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
