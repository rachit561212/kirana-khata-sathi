import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ShopProfile = { display_name: string; shop_name: string; phone: string; shop_address: string; gstin: string };

const FIELDS: { key: keyof ShopProfile; label: string; placeholder: string; max: number }[] = [
  { key: "shop_name", label: "Shop name", placeholder: "Sharma General Store", max: 80 },
  { key: "display_name", label: "Owner name", placeholder: "Ramesh Sharma", max: 60 },
  { key: "phone", label: "Phone", placeholder: "98765 43210", max: 20 },
  { key: "shop_address", label: "Shop address", placeholder: "Main Bazaar, Jaipur", max: 160 },
  { key: "gstin", label: "GSTIN (optional)", placeholder: "08ABCDE1234F1Z5", max: 15 },
];

export default function ShopProfileDialog({ open, onOpenChange, userId, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: string; initial: ShopProfile;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name.trim()) { toast.error("Enter your shop name"); return; }
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as ShopProfile;
    const { error } = await supabase.from("profiles").update(clean).eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error("Could not save. Try again."); return; }
    toast.success("Shop details saved");
    queryClient.invalidateQueries({ queryKey: ["account"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your shop details</DialogTitle>
          <DialogDescription>Shown on your statements. You can change these any time.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`shop-${f.key}`}>{f.label}</Label>
              <Input id={`shop-${f.key}`} value={form[f.key]} maxLength={f.max} placeholder={f.placeholder}
                inputMode={f.key === "phone" ? "tel" : undefined}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Later</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
