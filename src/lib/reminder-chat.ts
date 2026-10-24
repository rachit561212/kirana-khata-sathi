import type { ReminderKind } from "@/lib/reminders";

/** Commands that ask Hisaab to add a reminder rather than answer a spending question. */
export function isReminderCommand(text: string) {
  const t = text.toLocaleLowerCase();
  return /(khatam|khtm|finish|running out|out of stock|low stock|stock|udhaar|udhar|remind|reminder|yaad|add kar|likh lo|dena hai|lena hai|owes? me|i owe|baaki|बाकी|खत्म|ख़त्म|उधार|याद)/.test(t);
}

export type ChatDraft = { kind: ReminderKind | null; title: string | null; amount: number | null; due_date: string | null; supplier_name: string | null; supplier_phone: string | null; quantity: number | null; askedSupplier?: boolean };

/** The next follow-up question, or null when the draft is ready to confirm. Never invents values. */
export function nextQuestion(d: ChatDraft): { field: keyof ChatDraft; question: string } | null {
  if (!d.kind) return { field: "kind", question: "Is this low stock, money you have to pay, or money someone owes you? (stock / pay / collect)" };
  if (!d.title) return { field: "title", question: d.kind === "stock" ? "Which item is running out?" : d.kind === "pay" ? "Whom do you have to pay?" : "Who owes you money?" };
  if (d.kind !== "stock" && !(d.amount && d.amount > 0)) return { field: "amount", question: "How much, in rupees?" };
  if (d.kind === "pay" && !d.due_date) return { field: "due_date", question: "By which date do you have to pay? (e.g. 2026-10-30)" };
  if (d.kind === "stock" && !d.supplier_name && !d.askedSupplier) return { field: "supplier_name", question: "Which supplier do you buy it from, and their phone number? (type 'skip' if you don't want to add one)" };
  return null;
}
