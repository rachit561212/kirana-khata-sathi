import { supabase } from "@/integrations/supabase/client";
import type { Contact, Reminder } from "@/lib/reminders";

export async function loadReminderData() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const [r, c, s] = await Promise.all([
    supabase.from("reminders").select("id, kind, title, amount, paid, due_date, note, status").order("created_at"),
    supabase.from("contacts").select("key, name, phone, credit_limit"),
    supabase.from("product_settings").select("product_key, low_stock"),
  ]);
  if (r.error || c.error || s.error) throw new Error("Could not load reminders");
  return {
    userId: u.user.id,
    reminders: (r.data ?? []).map((x) => ({ ...x, amount: Number(x.amount), paid: Number(x.paid) })) as Reminder[],
    contacts: (c.data ?? []).map((x) => ({ ...x, credit_limit: x.credit_limit == null ? null : Number(x.credit_limit) })) as Contact[],
    thresholds: Object.fromEntries((s.data ?? []).map((x) => [x.product_key, Number(x.low_stock)])) as Record<string, number>,
  };
}

