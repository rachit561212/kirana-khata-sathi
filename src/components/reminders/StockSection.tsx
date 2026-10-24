import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt, useKhata } from "@/lib/khata";
import { receiptProducts } from "@/lib/products";
import { supplierKey } from "@/lib/suppliers";
import { lowStock, type Reminder } from "@/lib/reminders";
import { createReminder, deleteReminder, saveContact, saveThreshold, updateReminder, type ReminderInput } from "@/lib/reminder-data";
import { ReminderForm } from "./ReminderForm";
import { attempt, CallButton, DeleteButton, type SectionProps } from "./shared";

export function StockSection({ data, refresh }: SectionProps) {
  const receipts = useKhata();
  const products = receiptProducts(receipts);
  const low = lowStock(products, data.thresholds, receipts);
  const manual = data.reminders.filter((r) => r.kind === "stock" && r.status !== "done");
  const contact = (n: string) => data.contacts.find((c) => c.key === supplierKey(n));
  const [form, setForm] = useState<{ initial?: Reminder; preset?: Partial<ReminderInput> } | null>(null);
  const submit = async (v: ReminderInput) => {
    const prev = form?.initial;
    const ok = await attempt(async () => {
      if (prev) await updateReminder(prev.id, { title: v.title.trim(), quantity: v.quantity ?? null, supplier_name: (v.supplier_name ?? "").trim(), supplier_phone: v.supplier_phone ?? "", note: v.note ?? "" });
      else await createReminder(data.userId, v);
      if (v.supplier_name?.trim() && v.supplier_phone) await saveContact(data.userId, v.supplier_name, { phone: v.supplier_phone }, contact(v.supplier_name));
    }, prev ? "Updated" : "Stock reminder saved", refresh);
    if (ok) setForm(null);
  };
  const empty = !low.length && !manual.length;
  return <section className="space-y-4" aria-label="Stock reminders">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Items running low</p><Button className="min-h-11" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add item</Button></div>
    {empty && <p className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">Nothing running low.</p>}
    <ul className="space-y-3">
      {manual.map((r) => { const ph = r.supplier_phone || contact(r.supplier_name)?.phone || ""; return <li key={r.id} className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
          <p className="break-words text-lg font-semibold">{r.title}</p>
          <p className="text-sm text-muted-foreground">{r.quantity != null ? `${r.quantity} left` : "Stock not known"}{r.status === "ordered" && " · ordered"}</p>
          <p className="text-sm">{r.supplier_name || "No supplier"}{ph && <> · <a className="font-medium underline" href={`tel:${ph}`}>{ph}</a></>}</p>
          {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}</div>
          <CallButton phone={ph} /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.status !== "ordered" && <Button size="sm" variant="outline" className="min-h-10" onClick={() => void attempt(() => updateReminder(r.id, { status: "ordered" }), "Marked ordered", refresh)}>Ordered</Button>}
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => void attempt(() => updateReminder(r.id, { status: "done" }), "Restocked", refresh)}><Check className="h-4 w-4" />Restocked</Button>
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => setForm({ initial: r })}><Pencil className="h-4 w-4" />Edit</Button>
          <DeleteButton what={r.title} onConfirm={() => attempt(() => deleteReminder(r.id), "Deleted", refresh)} />
        </div></li>; })}
      {low.map((p) => { const ph = p.supplier ? contact(p.supplier)?.phone ?? "" : ""; return <li key={p.id} className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
          <p className="break-words text-lg font-semibold">{p.name}</p>
          <p className="text-sm text-muted-foreground">{p.quantity} left · alert at {p.threshold} · from your bills</p>
          <p className="text-sm">{p.supplier ?? "No supplier"}{p.rate != null && ` @ ${fmt(p.rate)}`}{ph && <> · <a className="font-medium underline" href={`tel:${ph}`}>{ph}</a></>}</p></div>
          {ph ? <CallButton phone={ph} /> : p.supplier && <Button size="sm" variant="outline" className="min-h-10" onClick={() => setForm({ preset: { kind: "stock", title: p.name, supplier_name: p.supplier!, quantity: p.quantity } })}>Add supplier phone</Button>}
        </div></li>; })}
    </ul>
    <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-medium">Alert me when stock drops to… (per product)</summary>
      <ul className="mt-3 divide-y">{products.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{p.name} <span className="text-sm text-muted-foreground">({p.quantity})</span></span>
        <Input aria-label={`Alert level for ${p.name}`} className="w-24" inputMode="decimal" defaultValue={data.thresholds[p.id] ?? ""} onBlur={(e) => { const n = Number(e.target.value) || 0; if (n >= 0 && n !== (data.thresholds[p.id] ?? 0)) void attempt(() => saveThreshold(data.userId, p.id, n), "Alert level saved", refresh); }} /></li>)}
        {!products.length && <li className="py-2 text-muted-foreground">Products appear after reviewed purchase bills.</li>}</ul>
    </details>
    <ReminderForm open={!!form} onOpenChange={(o) => !o && setForm(null)} kind="stock" initial={form?.initial} preset={form?.preset} onSubmit={submit} names={products.map((p) => p.name)} />
  </section>;
}
