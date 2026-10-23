import { expect, it } from "vitest";
import { parseBillQr } from "@/lib/bill-qr";

it("reads bulk supplier items with exact quantities, rates and GST", () => {
  expect(parseBillQr(JSON.stringify({ supplier: { name: "Sharma Agencies" }, date: "2026-10-23", items: [{ name: "Rice", quantity: 4, unitPrice: 1450, gst: 5 }, { name: "Oil", qty: 12, rate: 148 }] }))).toEqual({ vendor: "Sharma Agencies", date: "2026-10-23", items: [{ name: "Rice", qty: 4, rate: 1450, gst: 5 }, { name: "Oil", qty: 12, rate: 148, gst: 0 }] });
});
it("does not treat payment or invoice links as bulk orders", () => {
  for (const text of ["upi://pay?pa=shop@upi&am=100", "https://supplier.example/bill/1", "eyJhbGciOiJSUzI1NiJ9.signed.invoice"]) expect(() => parseBillQr(text)).toThrow();
});
it("refuses QR data without explicit supplier and usable item lines", () => {
  for (const data of [{ vendor: "Supplier", total: 100 }, { items: [{ name: "Rice", qty: 2, rate: 40 }] }, { vendor: "Supplier", items: [{ name: "Rice", qty: 0, rate: 40 }] }, { vendor: "Supplier", items: [{ name: "Rice", qty: 2, rate: -40 }] }]) expect(() => parseBillQr(JSON.stringify(data))).toThrow();
});
it("ignores payment claims in QR data instead of confirming them", () => {
  const draft = parseBillQr(JSON.stringify({ vendor: "Supplier", paidState: "paid", payment: "UPI", items: [{ name: "Rice", qty: 2, rate: 40 }] }));
  expect(draft).toEqual({ vendor: "Supplier", items: [{ name: "Rice", qty: 2, rate: 40, gst: 0 }] });
});
it("rejects impossible dates and invalid tax values", () => {
  for (const extra of [{ date: "2026-02-30", gst: 0 }, { date: "2026-10-23", gst: 101 }]) expect(() => parseBillQr(JSON.stringify({ vendor: "Supplier", date: extra.date, items: [{ name: "Rice", qty: 2, rate: 40, gst: extra.gst }] }))).toThrow();
});