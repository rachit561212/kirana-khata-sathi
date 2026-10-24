import { Label } from "@/components/ui/label";
import type { StockMovement } from "@/lib/khata";

export function StockMovementField({ value, onChange, id, disabled = false }: { value: StockMovement | ""; onChange: (value: StockMovement | "") => void; id: string; disabled?: boolean }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>Stock movement</Label><select id={id} disabled={disabled} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(e) => {
    const next = e.target.value;
    if (next === "purchase" || next === "sale" || next === "none" || next === "") onChange(next);
  }}><option value="">Choose</option><option value="purchase">Goods received · Purchase</option><option value="sale">Goods sold · Sale</option><option value="none">No stock change · Payment / pending order</option></select></div>;
}