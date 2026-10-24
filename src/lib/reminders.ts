import { totalOf, type Receipt } from "@/lib/khata";
import type { Product } from "@/lib/products";
import { supplierKey, supplierPurchases } from "@/lib/suppliers";

export type ReminderKind = "stock" | "pay" | "collect";
export type Reminder = {
  id: string; kind: ReminderKind; title: string; amount: number; paid: number; due_date: string | null; note: string;
  status: "open" | "ordered" | "done"; supplier_name: string; supplier_phone: string; quantity: number | null; entry_date: string;
};
export type Contact = { key: string; name: string; phone: string; credit_limit: number | null };
export type DueState = "overdue" | "soon" | "later" | "none";
export type PayStatus = "Pending" | "Paid" | "Overdue";

const DAY = 86_400_000;
const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / DAY);
const norm = (s: string) => s.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase();

/** Overdue once the due date has passed; "soon" on the due day and up to `leadDays` before it. */
export function dueState(due: string | null, today: string, leadDays = 2): DueState {
  if (!due) return "none";
  const diff = dayNum(due) - dayNum(today);
  if (diff < 0) return "overdue";
  if (diff <= leadDays) return "soon";
  return "later";
}

export const outstanding = (r: Pick<Reminder, "amount" | "paid">) => Math.max(0, Math.round((r.amount - r.paid) * 100) / 100);

export function payStatus(r: Reminder, today: string): PayStatus {
  if (r.status === "done" || outstanding(r) <= 0) return "Paid";
  return dueState(r.due_date, today) === "overdue" ? "Overdue" : "Pending";
}

export type PayRow = { id: string; name: string; amount: number; due: string | null; note: string; fromBill: boolean; reminder?: Reminder };
/** Unpaid first (earliest deadline first, undated last), then paid. Includes unpaid purchased orders. */
export function moneyToPay(reminders: Reminder[], receipts: Receipt[]) {
  const manual: PayRow[] = reminders.filter((r) => r.kind === "pay")
    .map((r) => ({ id: r.id, name: r.title, amount: outstanding(r) || r.amount, due: r.due_date, note: r.note, fromBill: false, reminder: r }));
  const orders: PayRow[] = receipts.filter((r) => r.source === "Purchase order" && !r.dupOf && r.status !== "dismissed" && (r.paidState === "unpaid" || r.paidState === "partial"))
    .map((r) => ({ id: r.id, name: r.vendor, amount: totalOf(r), due: null, note: r.paidState === "partial" ? "Purchased order · part paid" : "Purchased order · not paid", fromBill: true }));
  const isPaid = (p: PayRow) => !!p.reminder && (p.reminder.status === "done" || outstanding(p.reminder) <= 0);
  return [...manual, ...orders].sort((a, b) => Number(isPaid(a)) - Number(isPaid(b)) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.amount - a.amount);
}

export type CollectPerson = { key: string; name: string; amount: number; lastDate: string | null; expected: string | null; entries: Reminder[] };
/** Collect list grouped per person, highest outstanding first. */
export function moneyToCollect(reminders: Reminder[]): CollectPerson[] {
  const people = new Map<string, CollectPerson>();
  for (const r of reminders) {
    if (r.kind !== "collect" || r.status === "done" || outstanding(r) <= 0) continue;
    const key = supplierKey(r.title);
    const p = people.get(key) ?? { key, name: r.title.trim(), amount: 0, lastDate: null, expected: null, entries: [] };
    p.amount = Math.round((p.amount + outstanding(r)) * 100) / 100;
    p.entries.push(r);
    if (!p.lastDate || r.entry_date > p.lastDate) p.lastDate = r.entry_date;
    if (r.due_date && (!p.expected || r.due_date < p.expected)) p.expected = r.due_date;
    people.set(key, p);
  }
  return [...people.values()].sort((a, b) => b.amount - a.amount);
}

/** Spread a repayment over a person's open loans, oldest first. Returns per-entry updates. */
export function applyRepayment(entries: Reminder[], amount: number) {
  let left = amount;
  const updates: { id: string; paid: number; status: Reminder["status"] }[] = [];
  for (const r of [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))) {
    if (left <= 0) break;
    const take = Math.min(left, outstanding(r));
    if (take <= 0) continue;
    left = Math.round((left - take) * 100) / 100;
    const paid = Math.round((r.paid + take) * 100) / 100;
    updates.push({ id: r.id, paid, status: paid >= r.amount ? "done" : r.status });
  }
  return updates;
}

/** Exceeds only when the new total is strictly above the limit; no limit means no warning. */
export function creditCheck(currentOwed: number, newAmount: number, limit: number | null | undefined) {
  const total = currentOwed + newAmount;
  if (limit == null || !Number.isFinite(limit)) return { exceeds: false, over: 0, total };
  return { exceeds: total > limit, over: Math.max(0, total - limit), total };
}

/** An open reminder of the same kind for the same name — used to avoid AI duplicates. */
export function findOpenDuplicate(reminders: Reminder[], kind: ReminderKind, title: string, amount?: number | null) {
  const t = norm(title);
  return reminders.find((r) => r.kind === kind && r.status !== "done" && norm(r.title) === t && (kind === "stock" || !amount || r.amount === amount));
}

/** Products at or below their saved threshold, with last supplier and rate. */
export function lowStock(products: Product[], thresholds: Record<string, number>, receipts: Receipt[]) {
  const purchases = supplierPurchases(receipts).sort((a, b) => b.date.localeCompare(a.date));
  return products.filter((p) => (thresholds[p.id] ?? 0) > 0 && p.quantity <= thresholds[p.id]!).map((p) => {
    const bill = purchases.find((r) => r.items.some((i) => norm(i.name) === p.id));
    const item = bill?.items.find((i) => norm(i.name) === p.id);
    return { ...p, threshold: thresholds[p.id]!, supplier: bill?.vendor ?? null, rate: item?.rate ?? null };
  });
}

export const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export const cleanPhone = (s: string) => s.replace(/[^\d+]/g, "");
export const validPhone = (s: string) => !s || /^\+?\d{6,15}$/.test(cleanPhone(s));
export const todayIso = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
