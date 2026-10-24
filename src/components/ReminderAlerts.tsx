import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useKhata } from "@/lib/khata";
import { receiptProducts } from "@/lib/products";
import { loadReminderData } from "@/lib/reminder-data";
import { dueState, lowStock, moneyToPay, outstanding, todayIso } from "@/lib/reminders";

const LEAD_KEY = "hisaab-reminder-lead-days";
export function useLeadDays(): [number, (n: number) => void] {
  const [n, setN] = useState(2);
  useEffect(() => { const v = Number(localStorage.getItem(LEAD_KEY)); if (v === 1 || v === 2) setN(v); }, []);
  return [n, (v) => { localStorage.setItem(LEAD_KEY, String(v)); setN(v); }];
}

export function useReminderAlerts() {
  const q = useQuery({ queryKey: ["reminders"], queryFn: loadReminderData, staleTime: 60_000 });
  const receipts = useKhata();
  const [lead] = useLeadDays();
  if (!q.data) return { overdue: 0, soon: 0, low: 0, total: 0, items: [] as { key: string; text: string }[] };
  const today = todayIso();
  const items: { key: string; text: string; state: string }[] = [];
  for (const p of moneyToPay(q.data.reminders, receipts)) {
    if (!p.reminder || p.reminder.status === "done" || outstanding(p.reminder) <= 0) continue;
    const s = dueState(p.due, today, lead);
    if (s === "overdue" || s === "soon") items.push({ key: `pay:${p.id}:${s}`, state: s, text: s === "overdue" ? `Overdue: pay ₹${p.amount.toLocaleString("en-IN")} to ${p.name}` : `Due soon: pay ₹${p.amount.toLocaleString("en-IN")} to ${p.name} by ${p.due}` });
  }
  for (const r of q.data.reminders) {
    if (r.kind !== "collect" || r.status === "done") continue;
    const s = dueState(r.due_date, today, lead);
    if (s === "overdue" || s === "soon") items.push({ key: `col:${r.id}:${s}`, state: s, text: `${s === "overdue" ? "Overdue" : "Due soon"}: collect ₹${outstanding(r).toLocaleString("en-IN")} from ${r.title}` });
  }
  const overdue = items.filter((i) => i.state === "overdue").length, soon = items.length - overdue;
  const low = lowStock(receiptProducts(receipts), q.data.thresholds, receipts).length + q.data.reminders.filter((r) => r.kind === "stock" && r.status === "open").length;
  return { overdue, soon, low, total: overdue + soon + low, items };
}

/** Shows device notifications for due/overdue money when the app is open and permission was granted. Once per item per day. */
export function useDueNotifications(items: { key: string; text: string }[]) {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !items.length) return;
    const today = todayIso(); const sentKey = "hisaab-notified";
    let sent: Record<string, string> = {};
    try { sent = JSON.parse(localStorage.getItem(sentKey) || "{}"); } catch { /* ignore */ }
    for (const i of items) {
      if (sent[i.key] === today) continue;
      try { new Notification("Hisaab reminder", { body: i.text, tag: i.key }); sent[i.key] = today; } catch { /* unsupported in this browser */ }
    }
    localStorage.setItem(sentKey, JSON.stringify(sent));
  }, [items.map((i) => i.key).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function ReminderBanner() {
  const a = useReminderAlerts();
  if (!a.total) return null;
  const parts = [a.overdue && `${a.overdue} overdue`, a.soon && `${a.soon} due soon`, a.low && `${a.low} low stock`].filter(Boolean).join(" · ");
  return <Link to="/app/reminders" className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${a.overdue ? "border-destructive bg-destructive/10 text-destructive" : "bg-accent/15"}`}><BellRing className="h-4 w-4 shrink-0" />{parts} — open reminders</Link>;
}
