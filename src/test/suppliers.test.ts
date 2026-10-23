import { expect, it } from "vitest";
import { suppliersFromReceipts } from "@/lib/suppliers";
import type { Receipt } from "@/lib/khata";
const bill: Receipt = { id: "p1", vendor: "Ram Kirana", date: "2026-10-24", source: "Spoken / typed, no bill", kind: "spent", stockMovement: "purchase", status: "accepted", payment: "UPI", conf: 100, items: [{ name: "Atta", qty: 5, rate: 300, gst: 0, cat: "Staples" }] };
it("groups purchase bills by supplier and links the original bills", () => {
  const rows = suppliersFromReceipts([bill, { ...bill, id: "p2", vendor: " ram  kirana ", source: "Purchase order", stockMovement: "none", status: "new" }]);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.total).toBe(3000);
  expect(rows[0]?.bills.map((r) => r.id)).toEqual(["p1", "p2"]);
});
it("excludes customer sales, refunds, expenses, dismissed and duplicate bills", () => {
  expect(suppliersFromReceipts([{ ...bill, kind: "received", stockMovement: "sale" }, { ...bill, source: "Customer refund" }, { ...bill, stockMovement: "none" }, { ...bill, status: "dismissed" }, { ...bill, dupOf: "p2" }])).toEqual([]);
});