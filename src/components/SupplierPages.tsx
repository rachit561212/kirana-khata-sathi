import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { dateLabel, fmt, totalOf, useKhata } from "@/lib/khata";
import { suppliersFromReceipts } from "@/lib/suppliers";

export function SupplierPages({ supplierId }: { supplierId?: string }) {
  const account = useQuery({ queryKey: ["supplier-account"], queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } });
  const receipts = useKhata();
  const [search, setSearch] = useState("");
  const suppliers = suppliersFromReceipts(account.data ? receipts : []);
  const supplier = suppliers.find((s) => s.id === supplierId);
  return <div className="space-y-6">
    {supplierId && <Link to="/app/suppliers" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Suppliers</Link>}
    <div><h1 className="break-words font-display text-3xl font-bold">{supplierId ? supplier?.name ?? "Supplier" : "Suppliers"}</h1><p className="mt-2 text-sm text-muted-foreground">{supplierId ? "Purchase bills" : `${suppliers.length} suppliers`}</p></div>
    {account.isPending ? <p role="status">Loading your account…</p> : !account.data ? <div className="border-y py-10 text-center"><Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to view your suppliers.</p></div> : supplierId ? supplier ? <>
      <dl className="flex flex-wrap gap-8 border-y py-5"><div><dt className="text-sm text-muted-foreground">Total purchases</dt><dd className="mt-1 font-mono text-2xl font-semibold">{fmt(supplier.total)}</dd></div><div><dt className="text-sm text-muted-foreground">Bills</dt><dd className="mt-1 font-mono text-2xl font-semibold">{supplier.bills.length}</dd></div></dl>
      <ul className="divide-y">{supplier.bills.map((bill) => <li key={bill.id} className="space-y-3 py-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{dateLabel(bill.date)}</p><p className="mt-1 text-sm text-muted-foreground">{bill.source === "Purchase order" ? "Purchase order" : "Purchase"} · {bill.payment} · {bill.status === "new" ? "To review" : "Confirmed"}</p></div><p className="shrink-0 font-mono font-semibold">{fmt(totalOf(bill))}</p></div><ul className="space-y-1 text-sm text-muted-foreground">{bill.items.map((item, i) => <li key={i} className="flex justify-between gap-3"><span className="break-words">{item.name}</span><span className="shrink-0">× {item.qty}</span></li>)}</ul><Link to="/app/receipts" search={{ vendor: bill.vendor, q: bill.id }} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">View bill<ArrowRight className="h-4 w-4" /></Link></li>)}</ul>
    </> : <p className="border-y py-10 text-muted-foreground">No purchase bills for this supplier.</p> : <>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search suppliers" placeholder="Search suppliers" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {!suppliers.length ? <div className="border-y py-10"><p className="text-muted-foreground">No suppliers yet</p><Link to="/app" className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-primary">Add purchase bill<ArrowRight className="h-4 w-4" /></Link></div> : <ul className="divide-y border-y">{suppliers.filter((s) => s.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map((s) => <li key={s.id}><Link to="/app/suppliers/$supplier" params={{ supplier: s.id }} className="flex min-h-20 items-center justify-between gap-4 py-4 transition hover:bg-muted/40"><div className="min-w-0"><p className="break-words font-semibold">{s.name}</p><p className="mt-1 text-sm text-muted-foreground">{s.bills.length} purchase bills</p></div><div className="flex shrink-0 items-center gap-3"><span className="font-mono text-sm font-semibold">{fmt(s.total)}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></div></Link></li>)}</ul>}
    </>}
  </div>;
}