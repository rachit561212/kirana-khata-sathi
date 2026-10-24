import type { Receipt } from "@/lib/khata";

export type Product = { id: string; name: string; quantity: number; in_stock: boolean };
export type StockFilter = "all" | "in" | "out";

// Rebuild from current account bills: edits and duplicate decisions cannot double-count stock.
export function receiptProducts(receipts: Receipt[]): Product[] {
  const products = new Map<string, Product>();
  for (const receipt of receipts) {
    if (!['accepted', 'corrected'].includes(receipt.status) || receipt.dupOf ||
      (receipt.stockMovement !== 'purchase' && receipt.stockMovement !== 'sale')) continue;
    for (const item of receipt.items) {
      const name = item.name.trim().replace(/\s+/g, ' ');
      if (!name || !Number.isFinite(item.qty) || item.qty <= 0) continue;
      const id = name.normalize('NFKC').toLocaleLowerCase();
      const product = products.get(id) ?? { id, name, quantity: 0, in_stock: false };
      product.quantity = Math.round((product.quantity + (receipt.stockMovement === 'purchase' ? item.qty : -item.qty)) * 1e6) / 1e6;
      product.in_stock = product.quantity > 0;
      products.set(id, product);
    }
  }
  return [...products.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterProducts(products: Product[], search: string, stock: StockFilter) {
  return products.filter((p) => p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (stock === "all" || p.in_stock === (stock === "in")));
}
