import { totalOf, type Receipt } from "@/lib/khata";
import type { Product } from "@/lib/products";
import { supplierKey, supplierPurchases } from "@/lib/suppliers";

export type ReminderKind = "stock" | "pay" | "collect";
export type Reminder = { id: string; kind: ReminderKind; title: string; amount: number; paid: number; due_date: string | null; note: string; status: "open" | "ordered" | "done" };
export type Contact = { key: string; name: string; phone: string; credit_limit: number | null };
export type DueState = "overdue" | "soon" | "later" | "none";

const DAY = 86_400_000;
const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / DAY);

/** Overdue once the due date has passed; "soon" on the due day and the 2 days before it. */
export function dueState(due: string | null, today: string): DueState {
  if (!due) return "none";
  const diff = dayNum(due) - dayNum(today);
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "later";
}

export const outstanding = (r: Pick<Reminder, "amount" | "paid">) => Math.max(0, Math.round((r.amount - r.paid) * 100) / 100);

/** Pay list: open manual entries plus unpaid/partly-paid purchased orders, earliest due first. */
export function moneyToPay(reminders: Reminder[], receipts: Receipt[]) {
  const manual = reminders.filter((r) => r.kind === "pay" && r.status !== "done" && outstanding(r) > 0)
    .map((r) => ({ id: r.id, name: r.title, amount: outstanding(r), due: r.due_date, note: r.note, fromBill: false }));
  const orders = receipts.filter((r) => r.source === "Purchase order" && !r.dupOf && r.status !== "dismissed" && (r.paidState === "unpaid" || r.paidState === "partial"))
    .map((r) => ({ id: r.id, name: r.vendor, amount: totalOf(r), due: null as string | null, note: r.paidState === "partial" ? "Purchased order · part paid" : "Purchased order · not paid", fromBill: true }));
  return [...manual, ...orders].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.amount - a.amount);
}

/** Collect list grouped per person, highest outstanding first. */
export function moneyToCollect(reminders: Reminder[]) {
  const people = new Map<string, { key: string; name: string; amount: number; entries: Reminder[] }>();
  for (const r of reminders) {
    if (r.kind !== "collect" || r.status === "done" || outstanding(r) <= 0) continue;
    const key = supplierKey(r.title);
    const p = people.get(key) ?? { key, name: r.title.trim(), amount: 0, entries: [] };
    p.amount += outstanding(r);
    p.entries.push(r);
    people.set(key, p);
  }
  return [...people.values()].sort((a, b) => b.amount - a.amount);
}

/** Exceeds only when new total is strictly above the limit; no limit means no warning. */
export function creditCheck(currentOwed: number, newAmount: number, limit: number | null | undefined) {
  if (limit == null || !Number.isFinite(limit)) return { exceeds: false, over: 0, total: currentOwed + newAmount };
  const total = currentOwed + newAmount;
  return { exceeds: total > limit, over: Math.max(0, total - limit), total };
}

/** Products at or below their saved threshold, with last supplier and rate. */
export function lowStock(products: Product[], thresholds: Record<string, number>, receipts: Receipt[]) {
  const purchases = supplierPurchases(receipts).sort((a, b) => b.date.localeCompare(a.date));
  return products.filter((p) => thresholds[p.id] != null && thresholds[p.id]! > 0 && p.quantity <= thresholds[p.id]!).map((p) => {
    const bill = purchases.find((r) => r.items.some((i) => i.name.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase() === p.id));
    const item = bill?.items.find((i) => i.name.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase() === p.id);
    return { ...p, threshold: thresholds[p.id]!, supplier: bill?.vendor ?? null, rate: item?.rate ?? null };
  });
}

export const todayIso = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
