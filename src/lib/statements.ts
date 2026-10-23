import { z } from "zod";
import { totalOf, type Receipt } from "./khata";

export type StatementPeriod = "day" | "month" | "year" | "custom";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
}, "Choose a valid date");
export const statementRangeSchema = z.object({ start: date, end: date }).refine((v) => v.start <= v.end, "End date must be on or after start date");

export function statementRange(period: StatementPeriod, value: string, end = value) {
  if (period === "day" || period === "custom") return statementRangeSchema.parse({ start: value, end: period === "day" ? value : end });
  if (period === "year") {
    if (!/^\d{4}$/.test(value)) throw new Error("Choose a valid year");
    return statementRangeSchema.parse({ start: `${value}-01-01`, end: `${value}-12-31` });
  }
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error("Choose a valid month");
  const [year, month] = value.split("-").map(Number);
  const last = new Date(Date.UTC(year ?? 0, month ?? 0, 0)).getUTCDate();
  return statementRangeSchema.parse({ start: `${value}-01`, end: `${value}-${String(last).padStart(2, "0")}` });
}

export function makeStatement(receipts: Receipt[], range: { start: string; end: string }) {
  statementRangeSchema.parse(range);
  const records = receipts.filter((r) => (r.status === "accepted" || r.status === "corrected") && !r.dupOf && r.date >= range.start && r.date <= range.end).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const purchases = records.filter((r) => r.kind === "spent").reduce((n, r) => n + totalOf(r), 0);
  const received = records.filter((r) => r.kind === "received").reduce((n, r) => n + totalOf(r), 0);
  return { range, records, purchases, received };
}
export type Statement = ReturnType<typeof makeStatement>;