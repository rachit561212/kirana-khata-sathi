import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing, Check, LoaderCircle, Phone, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmt, dateLabel, useKhata } from "@/lib/khata";
import { receiptProducts } from "@/lib/products";
import { supplierKey } from "@/lib/suppliers";
import { creditCheck, dueState, lowStock, moneyToCollect, moneyToPay, outstanding, todayIso, type Contact, type Reminder, type ReminderKind } from "@/lib/reminders";
import { readReminder } from "@/lib/reminder-entry.functions";

export const Route = createFileRoute("/app/reminders")({
  head: () => ({ meta: [
    { title: "Reminders — Hisaab" },
    { name: "description", content: "Low stock, money to pay and money to collect for your shop, in one place." },
    { property: "og:title", content: "Reminders — Hisaab" },
    { property: "og:description", content: "Stay ahead of low stock, due payments and udhaar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RemindersScreen,
});

export async function loadReminderData() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const [r, c, s] = await Promise.all([
    supabase.from("reminders").select("id, kind, title, amount, paid, due_date, note, status").order("created_at"),
    supabase.from("contacts").select("key, name, phone, credit_limit"),
    supabase.from("product_settings").select("product_key, low_stock"),
  ]);
  if (r.error || c.error || s.error) throw new Error("Could not load reminders");
  return {
    userId: u.user.id,
    reminders: (r.data ?? []).map((x) => ({ ...x, amount: Number(x.amount), paid: Number(x.paid) })) as Reminder[],
    contacts: (c.data ?? []).map((x) => ({ ...x, credit_limit: x.credit_limit == null ? null : Number(x.credit_limit) })) as Contact[],
    thresholds: Object.fromEntries((s.data ?? []).map((x) => [x.product_key, Number(x.low_stock)])) as Record<string, number>,
  };
}

const TONE = { overdue: "border-destructive bg-destructive/10", soon: "border-accent bg-accent/15", later: "", none: "" } as const;

function RemindersScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reminders"], queryFn: loadReminderData });
  const receipts = useKhata();
  const [tab, setTab] = useState<ReminderKind>("stock");
  const [form, setForm] = useState({ title: "", amount: "", due: "", note: "" });
  const [ai, setAi] = useState(""); const [reading, setReading] = useState(false);
  const [warn, setWarn] = useState<null | { over: number; total: number; limit: number }>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["reminders"] });

  if (q.isPending) return <p role="status">Loading reminders…</p>;
  if (q.isError) return <div className="py-10 text-center"><p>Could not load reminders.</p><Button className="mt-3" onClick={() => void q.refetch()}>Try again</Button></div>;
  if (!q.data) return <div className="border-y py-10 text-center"><BellRing className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to use reminders.</p></div>;
  const { userId, reminders, contacts, thresholds } = q.data;
  const today = todayIso();
  const contact = (name: string) => contacts.find((c) => c.key === supplierKey(name));
  const products = receiptProducts(receipts);
  const low = lowStock(products, thresholds, receipts);
  const manualStock = reminders.filter((r) => r.kind === "stock" && r.status !== "done");
  const pay = moneyToPay(reminders, receipts);
  const collect = moneyToCollect(reminders);

  const insert = async () => {
    setBusy(true);
    const { error } = await supabase.from("reminders").insert({ user_id: userId, kind: tab, title: form.title.trim(), amount: Number(form.amount) || 0, due_date: form.due || null, note: form.note.trim() });
    setBusy(false);
    if (error) return toast.error("Could not save. Try again.");
    toast.success("Reminder saved"); setForm({ title: "", amount: "", due: "", note: "" }); setWarn(null); void refresh();
  };
  const add = async () => {
    if (!form.title.trim()) return toast.error(tab === "stock" ? "Enter the product" : "Enter the name");
    if (tab !== "stock" && !(Number(form.amount) > 0)) return toast.error("Enter an amount greater than zero");
    if (tab === "collect") {
      const owed = collect.find((p) => p.key === supplierKey(form.title))?.amount ?? 0;
      const lim = contact(form.title)?.credit_limit;
      const c = creditCheck(owed, Number(form.amount), lim);
      if (c.exceeds && lim != null) return setWarn({ over: c.over, total: c.total, limit: lim });
    }
    await insert();
  };
  const update = async (id: string, patch: Partial<Reminder>) => {
    const { error } = await supabase.from("reminders").update(patch).eq("id", id);
    if (error) toast.error("Could not update. Try again."); else void refresh();
  };
  const saveContact = async (name: string, patch: Partial<Contact>) => {
    const ex = contact(name);
    const { error } = await supabase.from("contacts").upsert({ user_id: userId, key: supplierKey(name), name: name.trim(), phone: ex?.phone ?? "", credit_limit: ex?.credit_limit ?? null, ...patch, updated_at: new Date().toISOString() });
    if (error) toast.error("Could not save. Try again."); else { toast.success("Saved"); void refresh(); }
  };
  const setThreshold = async (key: string, value: number) => {
    const { error } = await supabase.from("product_settings").upsert({ user_id: userId, product_key: key, low_stock: value });
    if (error) toast.error("Could not save. Try again."); else void refresh();
  };
  const readAi = async () => {
    setReading(true);
    try {
      const res = await readReminder({ data: { text: ai } });
      if (!res.draft) return toast.error(res.error ?? "Could not read that");
      const d = res.draft;
      if (d.kind) setTab(d.kind);
      setForm({ title: d.title ?? "", amount: d.amount ? String(d.amount) : "", due: d.due_date ?? "", note: "" });
      toast("Check the details, then save");
    } catch { toast.error("AI reading is unavailable. Fill the details yourself."); } finally { setReading(false); }
  };
  const promptPart = async (id: string, left: number) => {
    const v = window.prompt(`Amount received/paid now (₹, up to ${left})`, String(left));
    if (v == null) return; const n = Number(v);
    if (!(n > 0) || n > left) return toast.error("Enter an amount up to " + left);
    const r = reminders.find((x) => x.id === id)!; await update(id, { paid: r.paid + n, ...(n >= left ? { status: "done" } : {}) });
  };
  const askPhone = (name: string) => { const v = window.prompt(`Phone number for ${name}`, contact(name)?.phone ?? ""); if (v != null) void saveContact(name, { phone: v.replace(/[^\d+]/g, "") }); };
  const askLimit = (name: string) => { const v = window.prompt(`Credit limit for ${name} (₹, blank for none)`, String(contact(name)?.credit_limit ?? "")); if (v != null) void saveContact(name, { credit_limit: v.trim() ? Math.max(0, Number(v) || 0) : null }); };
  const CallBtn = ({ name }: { name: string }) => { const p = contact(name)?.phone; return p ? <Button asChild size="sm" variant="outline" className="min-h-10"><a href={`tel:${p}`}><Phone className="h-4 w-4" />Call</a></Button> : <Button size="sm" variant="ghost" className="min-h-10" onClick={() => askPhone(name)}>Add phone</Button>; };

  const tabs: [ReminderKind, string, number][] = [["stock", "Low stock", low.length + manualStock.length], ["pay", "Money to pay", pay.length], ["collect", "Money to collect", collect.length]];
  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold">Reminders</h1>
      <p className="mt-2 text-sm text-muted-foreground">{pay.filter((p) => dueState(p.due, today) === "overdue").length} overdue · {fmt(collect.reduce((s, p) => s + p.amount, 0))} to collect</p></div>

    <div className="flex gap-2 overflow-x-auto" role="tablist">{tabs.map(([k, l, n]) => <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "default" : "outline"} className="min-h-11 shrink-0" onClick={() => setTab(k)}>{l}{n > 0 && <span className="rounded-full bg-background/30 px-2 text-xs">{n}</span>}</Button>)}</div>

    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex gap-2"><Input value={ai} onChange={(e) => setAi(e.target.value)} placeholder="e.g. Khata, cheeni khatam hai, add kar do" aria-label="Tell Hisaab" /><Button variant="outline" className="min-h-11 shrink-0" disabled={reading || ai.trim().length < 2} onClick={() => void readAi()}>{reading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Fill</Button></div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="rem-title">{tab === "stock" ? "Product" : "Name"}</Label><Input id="rem-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} list={tab === "stock" ? "rem-products" : undefined} /></div>
        {tab !== "stock" && <><div className="space-y-1.5"><Label htmlFor="rem-amt">Amount ₹</Label><Input id="rem-amt" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="rem-due">{tab === "pay" ? "Pay by" : "Expected by"}</Label><Input id="rem-due" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div></>}
      </div>
      <datalist id="rem-products">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <Button className="min-h-11" disabled={busy} onClick={() => void add()}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{tab === "stock" ? "Add stock reminder" : tab === "pay" ? "Add money to pay" : "Add money to collect"}</Button>
    </section>

    {tab === "stock" && <section className="space-y-3">
      {!low.length && !manualStock.length && <p className="py-6 text-muted-foreground">Nothing running low. Set a "remind me below" number on any product.</p>}
      <ul className="divide-y">
        {low.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium">{p.name}</p><p className="text-sm text-muted-foreground">{p.quantity} left · alert at {p.threshold}{p.supplier && ` · ${p.supplier}${p.rate != null ? ` @ ${fmt(p.rate)}` : ""}`}</p></div>{p.supplier && <CallBtn name={p.supplier} />}</li>)}
        {manualStock.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{r.title}</p><p className="text-sm text-muted-foreground">{r.status === "ordered" ? "Ordered" : "Running out"}</p></div><div className="flex gap-2">{r.status !== "ordered" && <Button size="sm" variant="outline" className="min-h-10" onClick={() => void update(r.id, { status: "ordered" })}>Ordered</Button>}<Button size="sm" className="min-h-10" onClick={() => void update(r.id, { status: "done" })}><Check className="h-4 w-4" />Done</Button></div></li>)}
      </ul>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Remind me below… (per product)</summary>
        <ul className="mt-3 divide-y">{products.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{p.name} <span className="text-sm text-muted-foreground">({p.quantity})</span></span><Input aria-label={`Remind below for ${p.name}`} className="w-24" inputMode="decimal" defaultValue={thresholds[p.id] ?? ""} onBlur={(e) => { const n = Number(e.target.value) || 0; if (n !== (thresholds[p.id] ?? 0)) void setThreshold(p.id, n); }} /></li>)}{!products.length && <li className="py-2 text-muted-foreground">Products appear after reviewed purchase bills.</li>}</ul>
      </details>
    </section>}

    {tab === "pay" && <ul className="space-y-2">{!pay.length && <li className="py-6 text-muted-foreground">Nothing to pay.</li>}{pay.map((p) => { const s = dueState(p.due, today); return <li key={p.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${TONE[s]}`}><div className="min-w-0"><p className="font-medium">{p.name}</p><p className="text-sm">{s === "overdue" ? <strong className="text-destructive">Overdue · {dateLabel(p.due!)}</strong> : s === "soon" ? <strong>Due soon · {dateLabel(p.due!)}</strong> : p.due ? `Due ${dateLabel(p.due)}` : p.note || "No due date"}</p></div><div className="flex items-center gap-2"><span className="font-mono font-semibold">{fmt(p.amount)}</span><CallBtn name={p.name} />{!p.fromBill && <Button size="sm" className="min-h-10" onClick={() => void promptPart(p.id, p.amount)}>Paid</Button>}</div></li>; })}</ul>}

    {tab === "collect" && <ul className="space-y-2">{!collect.length && <li className="py-6 text-muted-foreground">Nobody owes you money.</li>}{collect.map((p) => { const lim = contact(p.name)?.credit_limit; const over = lim != null && p.amount > lim; return <li key={p.key} className={`rounded-lg border p-3 ${over ? TONE.overdue : ""}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{p.name}</p><p className="text-sm text-muted-foreground">{lim != null ? `Limit ${fmt(lim)}` : "No limit"} · <button className="underline" onClick={() => askLimit(p.name)}>Set limit</button></p></div><div className="flex items-center gap-2"><span className="font-mono text-lg font-semibold">{fmt(p.amount)}</span><CallBtn name={p.name} /></div></div><ul className="mt-2 space-y-1 text-sm">{p.entries.map((r) => { const s = dueState(r.due_date, today); return <li key={r.id} className="flex items-center justify-between gap-2"><span className={s === "overdue" ? "font-semibold text-destructive" : ""}>{fmt(outstanding(r))}{r.due_date && ` · by ${dateLabel(r.due_date)}`}</span><Button size="sm" variant="outline" className="min-h-9" onClick={() => void promptPart(r.id, outstanding(r))}>Received</Button></li>; })}</ul></li>; })}</ul>}

    <AlertDialog open={!!warn} onOpenChange={(o) => !o && setWarn(null)}>
      <AlertDialogContent className="border-destructive"><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-destructive"><TriangleAlert className="h-5 w-5" />Credit limit crossed</AlertDialogTitle>
        <AlertDialogDescription>{form.title} would owe {fmt(warn?.total ?? 0)}, which is {fmt(warn?.over ?? 0)} over their limit of {fmt(warn?.limit ?? 0)}.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => void insert()}>Save anyway</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
