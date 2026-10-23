import { describe, expect, it } from "vitest";
import { monthSeries, totalOf, type Receipt } from "@/lib/khata";

const bill = (id: string, date: string, kind: Receipt["kind"], rate: number, status: Receipt["status"] = "accepted"): Receipt => ({
  id,
  vendor: "Test shop",
  date,
  source: "Test",
  payment: "Cash",
  kind,
  conf: 100,
  status,
  items: [{ name: "Entry", qty: 1, rate, gst: 0, cat: "Other" }],
});

describe("monthSeries", () => {
  const rs: Receipt[] = [
    bill("A", "2026-10-05", "spent", 1000),
    bill("B", "2026-10-05", "received", 600),
    bill("C", "2026-09-10", "spent", 400),
    bill("D", "2026-08-01", "spent", 999, "dismissed"),
  ];

  it("groups money out and money in by month, skipping dismissed bills", () => {
    const series = monthSeries(rs);
    expect(series.map((m) => m.label)).toEqual(["Sep", "Oct"]);
    expect(series[0]).toEqual({ label: "Sep", spent: 400, received: 0 });
    expect(series[1]).toEqual({ label: "Oct", spent: 1000, received: 600 });
  });

  it("matches each bill's item total", () => {
    const series = monthSeries(rs);
    const octSpent = series.find((m) => m.label === "Oct")!.spent;
    expect(octSpent).toBe(totalOf(bill("A", "2026-10-05", "spent", 1000)));
  });
});
