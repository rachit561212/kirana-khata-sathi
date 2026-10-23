import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, PackageX, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { addProduct, filterProducts, loadProducts, setProductStock, type StockFilter } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/app/products")({
  head: () => ({ meta: [
    { title: "Product stock — Hisaab" },
    { name: "description", content: "Manage your shop's products and mark them in stock or out of stock in Hisaab." },
    { property: "og:title", content: "Product stock — Hisaab" },
    { property: "og:description", content: "Your shop's available and out-of-stock products." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProductsScreen,
});

function ProductsScreen() {
  const client = useQueryClient();
  const account = useQuery({ queryKey: ["product-account"], queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } });
  const userId = account.data;
  const queryKey = ["products", userId];
  const products = useQuery({ queryKey, queryFn: () => userId ? loadProducts(userId) : Promise.resolve([]), enabled: !!userId });
  const [name, setName] = useState("");
  const [inStock, setInStock] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const rows = products.data ?? [];
  const visible = filterProducts(rows, search, filter);
  const save = useMutation({
    mutationFn: async (change: { id?: string; name?: string; stock: boolean }) => {
      if (!userId) throw new Error("Sign in to save your products.");
      if (change.id) await setProductStock(userId, change.id, change.stock);
      else await addProduct(userId, change.name ?? "", change.stock);
    },
    onSuccess: async (_, change) => {
      if (!change.id) { setName(""); setInStock(true); }
      await client.invalidateQueries({ queryKey });
      toast.success(change.id ? "Stock status saved" : "Product saved");
    },
    onError: (error) => toast.error(error.message),
  });
  const available = rows.filter((p) => p.in_stock).length;
  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold">Products</h1>
      <p className="mt-2 text-sm text-muted-foreground">{available} in stock · {rows.length - available} out of stock</p></div>
    {account.isPending ? <p role="status">Loading your account…</p> : !userId ?
      <div className="border-y py-10 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to manage your shop’s products.</p></div> : <>
      <form className="flex flex-wrap items-end gap-4 border-y py-5" onSubmit={(e) => { e.preventDefault(); save.mutate({ name, stock: inStock }); }}>
        <div className="min-w-0 flex-1 basis-52"><label htmlFor="product-name" className="mb-2 block text-sm font-medium">Product name</label><Input id="product-name" placeholder="e.g. Rice 25 kg" value={name} maxLength={120} required onChange={(e) => setName(e.target.value)} disabled={save.isPending} /></div>
        <label className="flex min-h-10 items-center gap-3 text-sm"><Switch checked={inStock} onCheckedChange={setInStock} disabled={save.isPending} aria-label="New product in stock" />{inStock ? "In stock" : "Out of stock"}</label>
        <Button type="submit" disabled={save.isPending || !name.trim()}><Plus className="h-4 w-4" />{save.isPending ? "Saving…" : "Add product"}</Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 basis-52 sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search products" className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Stock filter">{([['all', 'All'], ['in', 'In stock'], ['out', 'Out of stock']] as const).map(([value, label]) => <Button key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
      </div>
      {products.isPending ? <p role="status">Loading products…</p> : products.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 text-destructive">{products.error.message}<Button variant="outline" onClick={() => products.refetch()}>Retry</Button></div> : !visible.length ? <div className="py-12 text-center"><PackageX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>{rows.length ? "No matching products" : "No products yet"}</p></div> :
        <ul className="divide-y border-y">{visible.map((p) => <li key={p.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-medium">{p.name}</p><p className={`mt-1 text-sm ${p.in_stock ? "text-foreground" : "text-muted-foreground"}`}>{p.in_stock ? "In stock" : "Out of stock"}</p></div><Switch className="shrink-0" checked={p.in_stock} disabled={save.isPending} aria-label={`${p.name} in stock`} onCheckedChange={(stock) => save.mutate({ id: p.id, stock })} /></li>)}</ul>}
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    </>}
  </div>;
}