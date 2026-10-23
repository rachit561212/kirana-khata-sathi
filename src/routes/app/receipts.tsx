import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/SiteChrome";
import { deliverCsv } from "@/lib/csv";
import { dateLabel, fmt, totalOf, useKhata } from "@/lib/khata";

export const Route = createFileRoute("/app/receipts")({
  validateSearch: (search: Record<string, unknown>): { vendor?: string; q?: string } => ({
    vendor: typeof search["vendor"] === "string" ? search["vendor"] : "",
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "All receipts — ShopLedger" },
      { name: "description", content: "Every bill you sent, turned into a record you can search, filter and export as CSV." },
    ],
  }),
  component: ReceiptsScreen,
});

const confirmedRow = (r: Parameters<typeof totalOf>[0]) => [
  r.vendor,
  r.date,
  r.items.map((i) => `${i.name} x${i.qty}`).join("; "),
  [...new Set(r.items.map((i) => i.cat))].join("; "),
  Math.round(totalOf(r)),
];

function ReceiptsScreen() {
  const receipts = useKhata();
  const init = Route.useSearch();
  const [q, setQ] = useState(init.q ?? "");
  const [kind, setKind] = useState<"all" | "spent" | "received">("all");
  const [vendor, setVendor] = useState(init.vendor ?? "");

  const live = useMemo(() => receipts.filter((r) => r.status !== "dismissed"), [receipts]);
  const rows = useMemo(
    () =>
      live
        .filter((r) => kind === "all" || r.kind === kind)
        .filter((r) => !vendor || r.vendor === vendor)
        .filter((r) => {
          if (!q.trim()) return true;
          const s = q.toLowerCase();
          return r.vendor.toLowerCase().includes(s) || r.items.some((i) => i.name.toLowerCase().includes(s)) || r.id.toLowerCase().includes(s);
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [live, kind, vendor, q],
  );

  const confirmed = useMemo(() => live.filter((r) => r.status === "accepted" || r.status === "corrected"), [live]);
  const csv = useMemo(() => [["vendor", "date", "items", "category", "total"], ...confirmed.map(confirmedRow)], [confirmed]);
  const csvText = csv.map((r) => r.join(",")).join("\n");

  const download = () => {
    if (!confirmed.length) return;
    deliverCsv(csv, "shopledger-confirmed-receipts.csv");
    toast.success("CSV downloaded", { description: `${confirmed.length} confirmed records · vendor, date, items, category, total.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Receipts</h1>
          <p className="mt-1 text-muted-foreground">{rows.length} of {live.length} records shown · {confirmed.length} confirmed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Copy CSV" text={csvText} />
          <button
            onClick={download}
            disabled={!confirmed.length}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV ({confirmed.length})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendor, item or bill number"
          className="h-9 min-w-[220px] flex-1 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-foreground"
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
                <th className="px-3 py-2.5 font-medium">Checked</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-muted/60">
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{dateLabel(r.date)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.vendor}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.items.length}</td>
                  <td className="px-3 py-2.5">{r.payment}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {r.status === "new" ? <span className="text-primary">to check</span> : <span className="text-received">yes</span>}
                  </td>
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
