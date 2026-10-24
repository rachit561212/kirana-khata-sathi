import { supabase } from "@/integrations/supabase/client";
import { supplierKey } from "@/lib/suppliers";
import type { Contact, Reminder, ReminderKind } from "@/lib/reminders";

const COLS = "id, kind, title, amount, paid, due_date, note, status, supplier_name, supplier_phone, quantity, entry_date";

export async function loadReminderData() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const [r, c, s] = await Promise.all([
    supabase.from("reminders").select(COLS).order("created_at"),
    supabase.from("contacts").select("key, name, phone, credit_limit"),
    supabase.from("product_settings").select("product_key, low_stock"),
  ]);
  if (r.error || c.error || s.error) throw new Error("Could not load reminders");
  return {
    userId: u.user.id,
    reminders: (r.data ?? []).map((x) => ({ ...x, amount: Number(x.amount), paid: Number(x.paid), quantity: x.quantity == null ? null : Number(x.quantity) })) as Reminder[],
    contacts: (c.data ?? []).map((x) => ({ ...x, credit_limit: x.credit_limit == null ? null : Number(x.credit_limit) })) as Contact[],
    thresholds: Object.fromEntries((s.data ?? []).map((x) => [x.product_key, Number(x.low_stock)])) as Record<string, number>,
  };
}
export type ReminderData = NonNullable<Awaited<ReturnType<typeof loadReminderData>>>;

export type ReminderInput = { kind: ReminderKind; title: string; amount?: number; due_date?: string | null; note?: string; supplier_name?: string; supplier_phone?: string; quantity?: number | null; entry_date?: string };

async function must<T extends { error: unknown }>(p: PromiseLike<T>) { const r = await p; if (r.error) throw new Error("Could not save. Check your connection and try again."); return r; }

export async function createReminder(userId: string, v: ReminderInput) {
  const { data } = await must(supabase.from("reminders").insert({ user_id: userId, kind: v.kind, title: v.title.trim(), amount: v.amount ?? 0, due_date: v.due_date || null, note: (v.note ?? "").trim(), supplier_name: (v.supplier_name ?? "").trim(), supplier_phone: v.supplier_phone ?? "", quantity: v.quantity ?? null, ...(v.entry_date ? { entry_date: v.entry_date } : {}) }).select("id").single());
  return data!.id as string;
}
export const updateReminder = (id: string, patch: Partial<Omit<Reminder, "id">>) => must(supabase.from("reminders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id));
export const deleteReminder = (id: string) => must(supabase.from("reminders").delete().eq("id", id));
export const saveContact = (userId: string, name: string, patch: { phone?: string; credit_limit?: number | null }, existing?: Contact) =>
  must(supabase.from("contacts").upsert({ user_id: userId, key: supplierKey(name), name: name.trim(), phone: existing?.phone ?? "", credit_limit: existing?.credit_limit ?? null, ...patch, updated_at: new Date().toISOString() }));
export const saveThreshold = (userId: string, key: string, value: number) => must(supabase.from("product_settings").upsert({ user_id: userId, product_key: key, low_stock: value }));
