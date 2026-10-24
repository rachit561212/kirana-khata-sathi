import { describe, expect, it } from "vitest";
import { creditCheck, dueState, moneyToCollect, type Reminder } from "@/lib/reminders";

const r = (title: string, amount: number, paid = 0): Reminder => ({ id: title + amount, kind: "collect", title, amount, paid, due_date: null, note: "", status: "open" });

describe("reminders", () => {
  it("warns when new credit goes over the limit", () => expect(creditCheck(800, 300, 1000)).toMatchObject({ exceeds: true, over: 100 }));
  it("does not warn exactly at the limit", () => expect(creditCheck(700, 300, 1000).exceeds).toBe(false));
  it("does not warn with no limit", () => expect(creditCheck(50000, 1, null).exceeds).toBe(false));
  it("marks due within 2 days as soon", () => expect(dueState("2026-10-26", "2026-10-24")).toBe("soon"));
  it("marks 3 days away as later", () => expect(dueState("2026-10-27", "2026-10-24")).toBe("later"));
  it("marks past due as overdue", () => expect(dueState("2026-10-23", "2026-10-24")).toBe("overdue"));
  it("sorts people by highest outstanding", () => {
    const list = moneyToCollect([r("Ramesh", 200), r("Sita", 900, 100), r("ramesh ", 100)]);
    expect(list.map((p) => [p.name, p.amount])).toEqual([["Sita", 800], ["Ramesh", 300]]);
  });
});
