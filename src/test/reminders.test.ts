import { describe, expect, it } from "vitest";
import { applyRepayment, creditCheck, dueState, findOpenDuplicate, moneyToCollect, moneyToPay, payStatus, type Reminder } from "@/lib/reminders";
import { isReminderCommand, nextQuestion } from "@/lib/reminder-chat";

const r = (title: string, amount: number, paid = 0, extra: Partial<Reminder> = {}): Reminder => ({ id: title + amount + (extra.entry_date ?? ""), kind: "collect", title, amount, paid, due_date: null, note: "", status: "open", supplier_name: "", supplier_phone: "", quantity: null, entry_date: "2026-10-01", ...extra });

describe("credit limit", () => {
  it("₹1,700 owed + ₹500 against ₹2,000 limit warns ₹2,200, ₹200 over", () => expect(creditCheck(1700, 500, 2000)).toEqual({ exceeds: true, over: 200, total: 2200 }));
  it("does not warn exactly at the limit", () => expect(creditCheck(1500, 500, 2000).exceeds).toBe(false));
  it("does not warn with no limit", () => expect(creditCheck(50000, 1, null).exceeds).toBe(false));
});

describe("due dates", () => {
  it("2 days ahead is due soon with 2-day lead", () => expect(dueState("2026-10-26", "2026-10-24", 2)).toBe("soon"));
  it("2 days ahead is not soon with 1-day lead", () => expect(dueState("2026-10-26", "2026-10-24", 1)).toBe("later"));
  it("past due is overdue", () => expect(dueState("2026-10-23", "2026-10-24")).toBe("overdue"));
  it("pay status shows Overdue, Pending and Paid", () => {
    expect(payStatus(r("A", 100, 0, { kind: "pay", due_date: "2026-10-20" }), "2026-10-24")).toBe("Overdue");
    expect(payStatus(r("A", 100, 0, { kind: "pay", due_date: "2026-10-30" }), "2026-10-24")).toBe("Pending");
    expect(payStatus(r("A", 100, 0, { kind: "pay", status: "done" }), "2026-10-24")).toBe("Paid");
  });
  it("sorts payments by earliest deadline, paid last", () => {
    const rows = moneyToPay([r("Late", 1, 0, { kind: "pay", due_date: "2026-11-05" }), r("Paid", 1, 1, { kind: "pay", due_date: "2026-10-01", status: "done" }), r("Soon", 1, 0, { kind: "pay", due_date: "2026-10-25" })], []);
    expect(rows.map((x) => x.name)).toEqual(["Soon", "Late", "Paid"]);
  });
});

describe("money to collect", () => {
  it("sorts people by highest outstanding", () => {
    const list = moneyToCollect([r("Ramesh", 200), r("Sita", 900, 100), r("ramesh ", 100)]);
    expect(list.map((p) => [p.name, p.amount])).toEqual([["Sita", 800], ["Ramesh", 300]]);
  });
  it("partial repayment pays the oldest loan first", () => {
    const ups = applyRepayment([r("R", 300, 0, { entry_date: "2026-10-05" }), r("R", 200, 0, { entry_date: "2026-10-01" })], 250);
    expect(ups).toEqual([{ id: "R2002026-10-01", paid: 200, status: "done" }, { id: "R3002026-10-05", paid: 50, status: "open" }]);
  });
});

describe("AI reminder command", () => {
  it("recognises the Hinglish stock command", () => expect(isReminderCommand("Khata, yeh stock khatam hai, add kar do")).toBe(true));
  it("leaves spending questions to the normal answer", () => expect(isReminderCommand("How much did I spend on oil?")).toBe(false));
  it("asks for the item when it is missing", () => expect(nextQuestion({ kind: "stock", title: null, amount: null, due_date: null, supplier_name: null, supplier_phone: null, quantity: null })?.field).toBe("title"));
  it("asks for the supplier once for stock", () => expect(nextQuestion({ kind: "stock", title: "Cheeni", amount: null, due_date: null, supplier_name: null, supplier_phone: null, quantity: null })?.field).toBe("supplier_name"));
  it("detects a repeated stock command as a duplicate", () => expect(findOpenDuplicate([r("Cheeni ", 0, 0, { kind: "stock" })], "stock", "cheeni")).toBeTruthy());
});
