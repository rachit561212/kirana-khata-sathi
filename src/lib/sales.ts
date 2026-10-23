import { totalOf, type Item, type Receipt } from "@/lib/khata";

export type CustomerTransaction = {
  type: "sale" | "refund";
  customer: string;
  date: string;
  payment: string;
  paymentDetails: string;
  items: Item[];
  amount: number;
  goodsReturned: boolean;
};

export function customerReceipt(entry: CustomerTransaction, id: string): Receipt {
  if (!entry.customer.trim()) throw new Error("Enter the customer name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0, 10) !== entry.date) throw new Error("Choose a valid date");
  if (!["Cash", "UPI", "Card", "Bank transfer", "Other"].includes(entry.payment)) throw new Error("Choose how the money was paid");
  const hasGoods = entry.type === "sale" || entry.goodsReturned;
  if (hasGoods && (!entry.items.length || entry.items.some((i) => !i.name.trim() || !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.rate) || i.rate < 0 || !Number.isFinite(i.gst) || i.gst < 0 || i.gst > 100))) throw new Error("Check every item, quantity, rate and GST");
  const items: Item[] = hasGoods ? entry.items.map((i) => ({ ...i, name: i.name.trim() })) : [{ name: "Customer refund", qty: 1, rate: entry.amount, gst: 0, cat: "Other" }];
  const receipt: Receipt = {
    id, vendor: entry.customer.trim(), date: entry.date,
    source: entry.type === "sale" ? "Customer sale" : "Customer refund",
    payment: entry.payment, paymentDetails: entry.paymentDetails.trim(),
    kind: entry.type === "sale" ? "received" : "spent",
    stockMovement: entry.type === "sale" ? "sale" : entry.goodsReturned ? "purchase" : "none",
    status: "corrected", conf: 100, paidState: "paid", items,
  };
  const amount = totalOf(receipt);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero");
  return receipt;
}

export function moneyBalance(receipts: Receipt[]) {
  const confirmed = receipts.filter((r) => (r.status === "accepted" || r.status === "corrected") && !r.dupOf && r.paidState !== "unpaid" && r.paidState !== "partial" && r.payment !== "Credit" && r.payment !== "Not paid yet");
  const received = confirmed.filter((r) => r.kind === "received").reduce((sum, r) => sum + totalOf(r), 0);
  const spent = confirmed.filter((r) => r.kind === "spent").reduce((sum, r) => sum + totalOf(r), 0);
  return { received, spent, net: received - spent };
}