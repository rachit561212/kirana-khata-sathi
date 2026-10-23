import { describe, expect, it } from "vitest";
import { makeStatement, statementRange } from "@/lib/statements";
import type { Receipt } from "@/lib/khata";

const receipt = (date: string): Receipt => ({ id: date, date, vendor: "Supplier", source: "Manual", payment: "Cash", kind: "spent", conf: 100, status: "accepted", items: [{ name: "Rice", qty: 2, rate: 100, gst: 5, cat: "Staples" }] });
describe("Statement periods", () => {
  it("one day includes only that date", () => { const range = statementRange("day", "2026-10-23"); expect(range).toEqual({ start: "2026-10-23", end: "2026-10-23" }); expect(makeStatement([receipt("2026-10-22"), receipt("2026-10-23")], range).records.map((r) => r.date)).toEqual(["2026-10-23"]); });
  it("one month handles a leap year", () => expect(statementRange("month", "2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" }));
  it("one year includes January through December", () => expect(statementRange("year", "2026")).toEqual({ start: "2026-01-01", end: "2026-12-31" }));
  it("custom period includes both endpoints", () => expect(makeStatement([receipt("2026-10-01"), receipt("2026-10-23"), receipt("2026-10-24")], statementRange("custom", "2026-10-01", "2026-10-23")).records).toHaveLength(2));
  it("rejects reversed and impossible dates", () => { expect(() => statementRange("custom", "2026-10-23", "2026-10-01")).toThrow(); expect(() => statementRange("day", "2026-02-30")).toThrow(); });
  it("exports only confirmed non-duplicate records and includes item tax", () => { const r = receipt("2026-10-23"); const s = makeStatement([r, { ...r, status: "new" }, { ...r, status: "dismissed" }, { ...r, dupOf: "other" }], statementRange("day", r.date)); expect(s.records).toHaveLength(1); expect(s.purchases).toBe(210); });
});