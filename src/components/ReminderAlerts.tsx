import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { useKhata } from "@/lib/khata";
import { receiptProducts } from "@/lib/products";
import { loadReminderData } from "@/lib/reminder-data";
import { dueState, lowStock, moneyToPay, todayIso } from "@/lib/reminders";

export function useReminderAlerts() {
  const q = useQuery({ queryKey: ["reminders"], queryFn: loadReminderData, staleTime: 60_000 });
  const receipts = useKhata();
  if (!q.data) return { overdue: 0, soon: 0, low: 0, total: 0 };
  const today = todayIso();
  const states = [...moneyToPay(q.data.reminders, receipts).map((p) => p.due), ...q.data.reminders.filter((r) => r.kind === "collect" && r.status !== "done").map((r) => r.due_date)].map((d) => dueState(d, today));
  const overdue = states.filter((s) => s === "overdue").length, soon = states.filter((s) => s === "soon").length;
  const low = lowStock(receiptProducts(receipts), q.data.thresholds, receipts).length + q.data.reminders.filter((r) => r.kind === "stock" && r.status === "open").length;
  return { overdue, soon, low, total: overdue + soon + low };
}

export function ReminderBanner() {
  const a = useReminderAlerts();
  if (!a.total) return null;
  const parts = [a.overdue && `${a.overdue} overdue`, a.soon && `${a.soon} due soon`, a.low && `${a.low} low stock`].filter(Boolean).join(" · ");
  return <Link to="/app/reminders" className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${a.overdue ? "border-destructive bg-destructive/10 text-destructive" : "bg-accent/15"}`}><BellRing className="h-4 w-4 shrink-0" />{parts} — open reminders</Link>;
}
