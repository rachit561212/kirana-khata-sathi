import { totalOf, type Receipt } from "@/lib/khata";

export const supplierKey = (name: string) => name.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase();
export function supplierPurchases(receipts: Receipt[]) {
  return receipts.filter((r) => r.status !== "dismissed" && !r.dupOf && r.kind === "spent" && r.source !== "Customer refund" && (r.stockMovement === "purchase" || r.source === "Purchase order"));
}
export function suppliersFromReceipts(receipts: Receipt[]) {
  const groups = new Map<string, { id: string; name: string; bills: Receipt[]; total: number }>();
  for (const bill of supplierPurchases(receipts)) {
    const id = supplierKey(bill.vendor);
    if (!id) continue;
    const supplier = groups.get(id) ?? { id, name: bill.vendor.trim(), bills: [], total: 0 };
    supplier.bills.push(bill);
    supplier.total += totalOf(bill);
    groups.set(id, supplier);
  }
  return [...groups.values()].map((s) => ({ ...s, bills: s.bills.sort((a, b) => b.date.localeCompare(a.date)) })).sort((a, b) => a.name.localeCompare(b.name));
}