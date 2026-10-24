import { describe, expect, it } from "vitest";
import { normalizeTransaction } from "@/lib/transaction-entry";

const base = { vendor: "रमेश", items: [{ name: "चावल", quantity: 5, lineAmount: 500 }], amount: 500, payment: "UPI", paymentDetails: "PhonePe", kind: "spent", uncertainties: [] };
describe("AI transaction review", () => {
  it("preserves explicitly identified sale stock movement", () => { expect(normalizeTransaction({ ...base, stockMovement: "sale" }).stockMovement).toBe("sale"); });
  it("flags missing stock direction instead of inferring it from payment", () => { expect(normalizeTransaction(base).uncertainties.map((u) => u.field)).toContain("stockMovement"); });
  it("preserves the vendor identified from Hindi input", () => { expect(normalizeTransaction(base).vendor).toBe("रमेश"); });
  it("preserves extracted items and quantity", () => { expect(normalizeTransaction(base).items).toEqual([{ name: "चावल", quantity: 5, lineAmount: 500 }]); });
  it("preserves the amount separately from quantity", () => { expect(normalizeTransaction(base).amount).toBe(500); });
  it("preserves payment method and reference", () => { expect(normalizeTransaction(base)).toMatchObject({ payment: "UPI", paymentDetails: "PhonePe" }); });
  it("flags uncertain fields for review", () => { expect(normalizeTransaction({ ...base, uncertainties: [{ field: "vendor", reason: "Name unclear" }] }).uncertainties).toContainEqual({ field: "vendor", reason: "Name unclear" }); });
  it("flags missing payment rather than assuming cash", () => { const draft = normalizeTransaction({ ...base, payment: null }); expect(draft.payment).toBeNull(); expect(draft.uncertainties.map((u) => u.field)).toContain("payment"); });
  it("flags inconsistent amounts", () => { expect(normalizeTransaction({ ...base, amount: 600 }).uncertainties.map((u) => u.field)).toContain("amount"); });
  it("rejects invalid model data", () => { expect(() => normalizeTransaction({ ...base, amount: -500 })).toThrow(); });
});