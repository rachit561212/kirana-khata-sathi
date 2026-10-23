import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSearch } from "lucide-react";
import { CopyButton } from "@/components/SiteChrome";
import { dateLabel, fmt, totalOf, useKhata } from "@/lib/khata";

export const Route = createFileRoute("/app/receipts")({
  validateSearch: (search: Record<string, unknown>): { vendor: string; q: string } => ({
    vendor: typeof search.vendor === "string" ? search.vendor : "",
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "All receipts — ShopLedger" },
      { name: "description", content: "Every bill you sent, turned into a record you can search, filter and copy out." },
    ],
  }),
  component: ReceiptsScreen,
});

function ReceiptsScreen() {
  const receipts = useKhata();
  const init = Route.useSearch();
  const [q, setQ] = useState(init.q);
  const [kind, setKind] = useState<"all" | "spent" | "received">("all");
  const [vendor, setVendor] = useState(init.vendor);

  const rows = useMemo(
    () =>
      receipts
        .filter((r) => r.status !== "dismissed")
        .filter((r) => kind === "all" || r.kind === kind)
        .filter((r) => !vendor || r.vendor === vendor)
        .filter((r) => {
          if (!q.trim()) return true;
          const s = q.toLowerCase();
          return r.vendor.toLowerCase().includes(s) || r.items.some((i) => i.name.toLowerCase().includes(s)) || r.id.toLowerCase().includes(s);
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [receipts, kind, vendor, q],
  );

  const csv = rows.map((r) => [r.id, r.date, r.vendor, r.kind, r.payment, Math.round(totalOf(r))].join(",")).join("\n");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Receipts</h1>
          <p className="mt-1 text-muted-foreground">{rows.length} of {receipts.filter((r) => r.status !== "dismissed").length} records shown.</p>
        </div>
        <CopyButton label="Copy as CSV" text={csv} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendor, item or bill number"
          className="h-9 flex-1 min-w-[220px] rounded-md border bg-background px-3 text-sm outline-none transition focus:border-foreground"
        />
        <div className="flex rounded-md border p-0.5">
          {(["all", "spent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setKind(t)}
              className={`rounded px-3 py-1.5 text-xs font-semibold capitalize transition ${kind === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {vendor && (
          <button onClick={() => setVendor("")} className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted">
            Only {vendor} ✕
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileSearch className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-semibold">No bill matches that</p>
          <p className="mt-1 text-sm text-muted-foreground">Clear the search or pick another filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Bill</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Vendor</th>
                <th className="px-3 py-2.5 font-medium">Items</th>
                <th className="px-3 py-2.5 font-medium">Paid by</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-muted/60">
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{dateLabel(r.date)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.vendor}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.items.length}</td>
                  <td className="px-3 py-2.5">{r.payment}</td>
                  <td className={`px-5 py-2.5 text-right font-mono font-semibold ${r.kind === "spent" ? "text-spent" : "text-received"}`}>
                    {r.kind === "spent" ? "−" : "+"}{fmt(totalOf(r))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
