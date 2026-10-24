import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLabel, fmt } from "@/lib/khata";
import { useKhata } from "@/lib/khata";
import { supplierKey } from "@/lib/suppliers";
import { dueState, moneyToPay, payStatus, todayIso, type Reminder } from "@/lib/reminders";
import { createReminder, deleteReminder, updateReminder, type ReminderInput } from "@/lib/reminder-data";
import { ReminderForm } from "./ReminderForm";
import { attempt, CallButton, DeleteButton, type SectionProps } from "./shared";
import { useLeadDays } from "@/components/ReminderAlerts";

const BADGE = { Pending: "bg-muted text-foreground", Paid: "bg-secondary text-secondary-foreground", Overdue: "bg-destructive text-destructive-foreground" } as const;

export function PaySection({ data, refresh }: SectionProps) {
  const receipts = useKhata();
  const rows = moneyToPay(data.reminders, receipts);
  const [form, setForm] = useState<{ initial?: Reminder } | null>(null);
  const [lead] = useLeadDays();
  const today = todayIso();
  const phone = (n: string) => data.contacts.find((c) => c.key === supplierKey(n))?.phone ?? "";
  const submit = async (v: ReminderInput) => {
    const prev = form?.initial;
    const ok = await attempt(() => prev ? updateReminder(prev.id, { title: v.title.trim(), amount: v.amount!, due_date: v.due_date ?? null, note: v.note ?? "", ...(v.amount! > prev.paid && prev.status === "done" ? { status: "open" } : {}) }) : createReminder(data.userId, v), prev ? "Updated" : "Payment reminder saved", refresh);
    if (ok) setForm(null);
  };
  return <section className="space-y-4" aria-label="Money to pay">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Earliest deadline first</p><Button className="min-h-11" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add payment</Button></div>
    {!rows.length ? <p className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">Nothing to pay.</p> :
    <ul className="space-y-3">{rows.map((p) => {
      const st = p.reminder ? payStatus(p.reminder, today) : "Pending";
      const soon = st === "Pending" && dueState(p.due, today, lead) === "soon";
      return <li key={p.id} className={`rounded-xl border bg-card p-4 ${st === "Overdue" ? "border-2 border-destructive bg-destructive/5" : soon ? "border-2 border-accent" : ""} ${st === "Paid" ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words text-lg font-semibold">{p.name}</p>
            <p className={`text-sm ${st === "Overdue" ? "font-semibold text-destructive" : soon ? "font-semibold" : "text-muted-foreground"}`}>{p.due ? `${st === "Overdue" ? "Was due" : "Pay by"} ${dateLabel(p.due)}${soon ? " · due soon" : ""}` : "No deadline"}</p>
            {p.note && <p className="text-sm text-muted-foreground">{p.note}</p>}</div>
          <div className="text-right"><p className="font-mono text-2xl font-bold">{fmt(p.amount)}</p><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[st]}`}>{st}</span></div>
        </div>
        {p.reminder && <div className="mt-3 flex flex-wrap gap-2">
          {st !== "Paid" && <Button size="sm" className="min-h-10" onClick={() => void attempt(() => updateReminder(p.id, { paid: p.reminder!.amount, status: "done" }), `${p.name} marked paid`, refresh)}><Check className="h-4 w-4" />Mark as paid</Button>}
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => setForm({ initial: p.reminder! })}><Pencil className="h-4 w-4" />Edit</Button>
          <CallButton phone={phone(p.name)} label="Call" />
          <DeleteButton what="this payment reminder" onConfirm={() => attempt(() => deleteReminder(p.id), "Deleted", refresh)} />
        </div>}
      </li>; })}</ul>}
    <ReminderForm open={!!form} onOpenChange={(o) => !o && setForm(null)} kind="pay" initial={form?.initial} onSubmit={submit} />
  </section>;
}
