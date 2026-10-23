import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Package, PackageX, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { filterProducts, receiptProducts, type StockFilter } from "@/lib/products";
import { useKhata } from "@/lib/khata";

export const Route = createFileRoute("/app/products")({
  head: () => ({ meta: [
    { title: "Product stock — Hisaab" },
    { name: "description", content: "Your shop's product quantities and availability from reviewed purchase and sale bills in Hisaab." },
    { property: "og:title", content: "Product stock — Hisaab" },
    { property: "og:description", content: "Your shop's available and out-of-stock products from saved bills." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProductsScreen,
});

function ProductsScreen() {
  const account = useQuery({ queryKey: ["product-account"], queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } });
  const receipts = useKhata();
  const rows = account.data ? receiptProducts(receipts) : [];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const visible = filterProducts(rows, search, filter);
  const available = rows.filter((p) => p.in_stock).length;
  const pending = receipts.filter((r) => r.status !== 'dismissed' && !r.dupOf && r.items.length && !r.stockMovement).length;
  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold">Products</h1>
      <p className="mt-2 text-sm text-muted-foreground">{available} in stock · {rows.length - available} out of stock</p></div>
    {account.isPending ? <p role="status">Loading your account…</p> : !account.data ?
      <div className="border-y py-10 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to view your shop’s stock.</p></div> : <>
      {pending > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-sm"><span className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 shrink-0 text-primary" />{pending} bills need a stock movement check</span><Link to="/app/review" className="font-medium text-primary underline underline-offset-4">Review bills</Link></div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 basis-52 sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search products" className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Stock filter">{([['all', 'All'], ['in', 'In stock'], ['out', 'Out of stock']] as const).map(([value, label]) => <Button key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
      </div>
      {!visible.length ? <div className="border-y py-12 text-center"><PackageX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>{rows.length ? "No matching products" : "No reviewed stock entries yet"}</p></div> :
        <ul className="divide-y border-y">{visible.map((p) => <li key={p.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-medium">{p.name}</p><p className={`mt-1 text-sm ${p.in_stock ? "text-foreground" : "text-muted-foreground"}`}>{p.in_stock ? "In stock" : "Out of stock"}</p>{p.quantity < 0 && <p className="mt-1 text-sm text-destructive">Missing purchases or opening stock · check bills</p>}</div><div className="shrink-0 text-right"><p className="font-mono text-lg font-semibold">{Math.max(0, p.quantity).toLocaleString('en-IN')}</p><p className="text-xs text-muted-foreground">remaining</p></div></li>)}</ul>}
    </>}
  </div>;
}
