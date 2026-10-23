import { describe, expect, it } from "vitest";
import { customerReceipt, moneyBalance, type CustomerTransaction } from "@/lib/sales";
import { receiptProducts } from "@/lib/products";
import { parseBillQr } from "@/lib/bill-qr";

const entry: CustomerTransaction = { type: "sale", customer: "Ram", date: "2026-10-23", payment: "Cash", paymentDetails: "", amount: 0, goodsReturned: false, items: [{ name: "Rice", qty: 2, rate: 50, gst: 0, cat: "Staples" }] };
describe("Customer sales and refunds", () => {
  it("records a ₹100 sale as money in and removes 2 units of stock", () => {
    const sale = customerReceipt(entry, "sale");
    expect(sale.kind).toBe("received");
    expect(moneyBalance([sale])).toEqual({ received: 100, spent: 0, net: 100 });
    expect(receiptProducts([sale])[0]?.quantity).toBe(-2);
  });
  it("records a ₹30 refund as money out without changing stock", () => {
    const refund = customerReceipt({ ...entry, type: "refund", amount: 30 }, "refund");
    expect(refund.stockMovement).toBe("none");
    expect(moneyBalance([customerReceipt(entry, "sale"), refund])).toEqual({ received: 100, spent: 30, net: 70 });
    expect(receiptProducts([refund])).toEqual([]);
  });
  it("only restores returned quantities when explicitly confirmed", () => {
    const refund = customerReceipt({ ...entry, type: "refund", goodsReturned: true }, "refund");
    expect(refund.kind).toBe("spent");
    expect(receiptProducts([refund])[0]?.quantity).toBe(2);
  });
  it("does not count duplicate, draft, credit or unpaid money", () => {
    const sale = customerReceipt(entry, "sale");
    expect(moneyBalance([{ ...sale, dupOf: "other" }, { ...sale, status: "new" }, { ...sale, payment: "Credit" }, { ...sale, paidState: "unpaid" }, { ...sale, paidState: "partial" }])).toEqual({ received: 0, spent: 0, net: 0 });
  });
  it("rejects missing quantities, customer, payment, impossible dates and invalid GST", () => {
    const item = entry.items[0];
    if (!item) throw new Error("Missing test item");
    expect(() => customerReceipt({ ...entry, customer: "" }, "bad")).toThrow();
    expect(() => customerReceipt({ ...entry, payment: "" }, "bad")).toThrow();
    expect(() => customerReceipt({ ...entry, date: "2026-02-30" }, "bad")).toThrow();
    expect(() => customerReceipt({ ...entry, items: [{ ...item, qty: 0 }] }, "bad")).toThrow();
    expect(() => customerReceipt({ ...entry, items: [{ ...item, gst: 101 }] }, "bad")).toThrow();
  });
  it("reads customer QR items but never trusts QR payment claims", () => {
    const draft = parseBillQr(JSON.stringify({ customer: { name: "Ram" }, items: entry.items, payment: "UPI", paid: true }), "customer");
    expect(draft.vendor).toBe("Ram");
    expect(draft.items[0]?.qty).toBe(2);
    expect(draft).not.toHaveProperty("payment");
    expect(() => parseBillQr("upi://pay?pa=ram", "customer")).toThrow();
  });
});