import { useState } from "react";
import { Check, Pencil, Plus, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { dateLabel, fmt } from "@/lib/khata";
import { supplierKey } from "@/lib/suppliers";
import { applyRepayment, creditCheck, dueState, moneyToCollect, outstanding, todayIso, type Reminder } from "@/lib/reminders";
import { createReminder, deleteReminder, saveContact, updateReminder, type ReminderInput } from "@/lib/reminder-data";
import { AmountDialog, ReminderForm } from "./ReminderForm";
import { attempt, CallButton, DeleteButton, type SectionProps } from "./shared";

export function CollectSection({ data, refresh }: SectionProps) {
  const people = moneyToCollect(data.reminders);
  const contact = (name: string) => data.contacts.find((c) => c.key === supplierKey(name));
  const [form, setForm] = useState<{ initial?: Reminder; preset?: Partial<ReminderInput> } | null>(null);
  const [warn, setWarn] = useState<null | { total: number; over: number; limit: number; name: string; resolve: (ok: boolean) => void }>(null);
  const [repay, setRepay] = useState<null | { name: string; entries: Reminder[]; max: number }>(null);
  const [limitName, setLimitName] = useState(""); const [limitAmt, setLimitAmt] = useState("");
  const today = todayIso();

  const confirmLimit = (name: string, owed: number, add: number) => new Promise<boolean>((resolve) => {
    const lim = contact(name)?.credit_limit;
    const c = creditCheck(owed, add, lim);
    if (!c.exceeds || lim == null) return resolve(true);
    setWarn({ total: c.total, over: c.over, limit: lim, name: name.trim(), resolve });
  });
  const closeWarn = (ok: boolean) => { warn?.resolve(ok); setWarn(null); };

  const submit = async (v: ReminderInput) => {
    const owed = people.find((p) => p.key === supplierKey(v.title))?.amount ?? 0;
    const prev = form?.initial;
    const add = prev ? (v.amount ?? 0) - prev.amount : (v.amount ?? 0);
    if (prev && (v.amount ?? 0) < prev.paid) throw new Error(`Amount cannot be less than the ₹${prev.paid} already repaid`);
    if (add > 0 && !(await confirmLimit(v.title, owed, add))) return;
    const ok = await attempt(() => prev ? updateReminder(prev.id, { title: v.title.trim(), amount: v.amount!, due_date: v.due_date ?? null, note: v.note ?? "", entry_date: v.entry_date! }) : createReminder(data.userId, v), prev ? "Updated" : `Recorded ${fmt(v.amount ?? 0)} for ${v.title.trim()}`, refresh);
    if (ok) setForm(null);
  };

  const setLimit = async () => {
    const name = limitName.trim(); const n = limitAmt.trim() === "" ? null : Number(limitAmt);
    if (!name) { toast.error("Enter the customer name"); return; }
    if (n != null && !(n >= 0 && n < 1e9)) { toast.error("Enter a valid limit"); return; }
    if (await attempt(() => saveContact(data.userId, name, { credit_limit: n }, contact(name)), n == null ? `Limit removed for ${name}` : `Credit limit for ${name} set to ${fmt(n)}`, refresh)) { setLimitName(""); setLimitAmt(""); }
  };

  return <section className="space-y-4" aria-label="Money to collect">
    <div className="rounded-xl border-2 border-destructive/60 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-destructive" />Set Credit Limit</h2>
      <p className="mt-1 text-sm text-muted-foreground">Maximum each person can owe you. Leave the amount blank to remove a limit.</p>
      <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" onSubmit={(e) => { e.preventDefault(); void setLimit(); }}>
        <div className="space-y-1"><Label htmlFor="cl-name" className="sr-only">Customer</Label><Input id="cl-name" placeholder="Customer name" value={limitName} onChange={(e) => { setLimitName(e.target.value); const c = contact(e.target.value); if (c) setLimitAmt(c.credit_limit != null ? String(c.credit_limit) : ""); }} list="cl-names" /></div>
        <datalist id="cl-names">{people.map((p) => <option key={p.key} value={p.name} />)}</datalist>
        <div className="space-y-1"><Label htmlFor="cl-amt" className="sr-only">Limit ₹</Label><Input id="cl-amt" inputMode="decimal" placeholder="Limit ₹" value={limitAmt} onChange={(e) => setLimitAmt(e.target.value)} /></div>
        <Button type="submit" variant="destructive" className="min-h-11">Set limit</Button>
      </form>
    </div>

    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{people.length ? `${fmt(people.reduce((s, p) => s + p.amount, 0))} owed by ${people.length} ${people.length === 1 ? "person" : "people"}` : ""}</p><Button className="min-h-11" onClick={() => setForm({})}><Plus className="h-4 w-4" />Record Loan</Button></div>

    {!people.length ? <p className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">Nobody owes you money right now.</p> :
    <ul className="space-y-3">{people.map((p) => {
      const c = contact(p.name); const lim = c?.credit_limit ?? null; const over = lim != null && p.amount > lim;
      return <li key={p.key} className={`rounded-xl border bg-card p-4 ${over ? "border-2 border-destructive" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words text-lg font-semibold">{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.lastDate && `Last borrowed ${dateLabel(p.lastDate)}`}{p.expected && ` · expected by ${dateLabel(p.expected)}`}</p>
            <p className="text-sm">{lim != null ? `Limit ${fmt(lim)}` : "No limit set"}</p></div>
          <p className={`font-mono text-2xl font-bold ${over ? "text-destructive" : ""}`}>{fmt(p.amount)}</p>
        </div>
        {over && <p role="alert" className="mt-2 flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"><TriangleAlert className="h-4 w-4 shrink-0" />Over limit by {fmt(p.amount - lim!)}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="min-h-10" onClick={() => setForm({ preset: { kind: "collect", title: p.name } })}><Plus className="h-4 w-4" />Add Amount</Button>
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => setRepay({ name: p.name, entries: p.entries, max: p.amount })}>Record repayment</Button>
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => void attempt(() => Promise.all(p.entries.map((r) => updateReminder(r.id, { paid: r.amount, status: "done" }))), `${p.name} marked fully collected`, refresh)}><Check className="h-4 w-4" />Fully collected</Button>
          <CallButton phone={c?.phone ?? ""} label="Call" />
        </div>
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">{p.entries.length} {p.entries.length === 1 ? "entry" : "entries"}</summary>
          <ul className="mt-2 divide-y">{p.entries.map((r) => { const late = dueState(r.due_date, today) === "overdue"; return <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="font-mono">{fmt(outstanding(r))}</span>{r.paid > 0 && <span className="text-muted-foreground"> of {fmt(r.amount)}</span>} · {dateLabel(r.entry_date)}{r.due_date && <span className={late ? "font-semibold text-destructive" : ""}> · due {dateLabel(r.due_date)}</span>}{r.note && <span className="block text-muted-foreground">{r.note}</span>}</span>
            <span className="flex gap-1"><Button size="sm" variant="ghost" className="min-h-10" aria-label="Edit entry" onClick={() => setForm({ initial: r })}><Pencil className="h-4 w-4" /></Button><DeleteButton what="this entry" onConfirm={() => attempt(() => deleteReminder(r.id), "Entry deleted", refresh)} /></span>
          </li>; })}</ul></details>
      </li>; })}</ul>}

    <ReminderForm open={!!form} onOpenChange={(o) => !o && setForm(null)} kind="collect" initial={form?.initial} preset={form?.preset} onSubmit={submit} names={people.map((p) => p.name)} />
    <AmountDialog open={!!repay} onOpenChange={(o) => !o && setRepay(null)} title={`Repayment from ${repay?.name ?? ""}`} label="Amount received ₹" max={repay?.max} onSubmit={async (n) => {
      const ups = applyRepayment(repay!.entries, n);
      await Promise.all(ups.map((u) => updateReminder(u.id, { paid: u.paid, status: u.status })));
      toast.success(`${fmt(n)} received from ${repay!.name}`); await refresh();
    }} />
    <AlertDialog open={!!warn} onOpenChange={(o) => !o && closeWarn(false)}>
      <AlertDialogContent className="border-2 border-destructive">
        <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-destructive"><TriangleAlert className="h-5 w-5" />Credit limit exceeded!</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground">This customer would owe {fmt(warn?.total ?? 0)}, exceeding their {fmt(warn?.limit ?? 0)} limit by {fmt(warn?.over ?? 0)}.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel onClick={() => closeWarn(false)}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => closeWarn(true)}>Proceed Anyway</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
