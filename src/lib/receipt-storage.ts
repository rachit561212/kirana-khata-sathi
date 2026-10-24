import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Receipt } from "./khata";

export async function loadAccountReceipts(userId: string): Promise<Receipt[]> {
  const receipts: Receipt[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("receipts").select("record")
      .eq("user_id", userId).order("created_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Could not load your bills. Check your connection and try again.");
    receipts.push(...(data ?? []).map((row) => row.record as unknown as Receipt));
    if ((data?.length ?? 0) < 1000) return receipts;
  }
}

export async function saveAccountReceipts(userId: string, receipts: Receipt[], insertOnly = false) {
  if (!receipts.length) return;
  const rows = receipts.map((receipt) => ({
    user_id: userId, id: receipt.id,
    record: JSON.parse(JSON.stringify(receipt)) as Json,
  }));
  const { error } = await supabase.from("receipts").upsert(rows, {
    onConflict: "user_id,id", ignoreDuplicates: insertOnly,
  });
  if (error) throw new Error("Your bills have not reached your account. Check your connection and retry.");
}