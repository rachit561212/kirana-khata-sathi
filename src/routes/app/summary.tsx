import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { categoryTotals, daySeries, MONTH_LABEL, monthSeries, sums, useKhata, vendorTotals, type Receipt } from "@/lib/khata";
import StatementExport from "@/components/StatementExport";

export const Route = createFileRoute("/app/summary")({
  head: () => ({
    meta: [
      { title: "Spending summary — Hisaab" },
      { property: "og:title", content: "Spending summary — Hisaab" },
      { property: "og:description", content: "Spending totals and category breakdowns linked to underlying receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Where your money went this month, with every number traceable back to the bills behind it." },
    ],
  }),
  component: SummaryScreen,
});

function SummaryScreen() {
  const receipts = useKhata();
  const s = sums(receipts);
  const cats = categoryTotals(receipts);
  const vendors = vendorTotals(receipts);
  const [range, setRange] = useState<"day" | "month">("day");
  const days = daySeries(receipts);
  const months = monthSeries(receipts);
  const series = range === "day" ? days : months;
  const [open, setOpen] = useState<string | null>(null);
  const [made, setMade] = useState(false);
  const [breakdown, setBreakdown] = useState<"categories" | "suppliers">("categories");
  const top = cats[0];
  const topVendor = vendors[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display text-3xl font-bold">Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">{MONTH_LABEL}</p></div>
        <Dialog><DialogTrigger asChild><Button variant="outline"><FileText className="h-4 w-4" />Statement</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Download or email statement</DialogTitle></DialogHeader><StatementExport receipts={receipts} /></DialogContent></Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Money in" value={s.received} sub="Received" tone="received" />
        <Stat label="Money out" value={s.spent} sub={`${s.bills} bills`} tone="spent" />
        <Stat label="Net balance" value={s.received - s.spent} sub="In − out" tone={s.received >= s.spent ? "received" : "spent"} />
      </div>

      <section className="border-y py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Money flow</h2><div className="mt-2 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-received" />Money in</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-spent" />Money out</span></div></div>
          <div className="grid grid-cols-2 rounded-lg border p-1 text-sm">
            {(["day", "month"] as const).map((r) => (
              <Button variant="ghost" key={r} aria-pressed={range === r} onClick={() => setRange(r)} className={`min-h-9 rounded-md px-3 font-medium transition ${range === r ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground hover:bg-muted"}`}>
                {r === "day" ? "Per day" : "Per month"}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: 8, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => "₹" + Math.round(v).toLocaleString("en-IN")} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="spent" name="Out" fill="var(--spent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="received" name="In" fill="var(--received)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Spending breakdown</h2><div className="flex gap-1" role="group" aria-label="Spending breakdown">{([['categories', 'Categories'], ['suppliers', 'Suppliers']] as const).map(([value, label]) => <Button key={value} size="sm" variant={breakdown === value ? "default" : "outline"} aria-pressed={breakdown === value} onClick={() => setBreakdown(value)}>{label}</Button>)}</div></div>
        {breakdown === "categories" ? <div className="min-w-0">
          <ul className="divide-y">
            {cats.map((c) => (
              <li key={c.cat}>
                <Button variant="ghost" onClick={() => setOpen(open === c.cat ? null : c.cat)} aria-expanded={open === c.cat} className="grid h-auto min-h-14 w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2 rounded-none px-4 py-3 text-left text-sm hover:bg-muted/60 sm:flex sm:px-5">
                  <span className="min-w-0 font-medium sm:w-24">{c.cat}</span>
                  <span className="order-4 col-span-3 h-2 w-full overflow-hidden rounded bg-muted sm:order-none sm:w-auto sm:flex-1"><span className="block h-full bg-primary" style={{ width: `${(c.total / (top?.total || 1)) * 100}%` }} /></span>
                  <span className="text-right font-mono sm:w-28">{Math.round(c.total).toLocaleString("en-IN")}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open === c.cat ? "rotate-180" : ""}`} />
                </Button>
                {open === c.cat && (
                  <ul className="bg-muted/40 px-5 pb-3">
                    {c.ids.map((id) => {
                      const r = receipts.find((x) => x.id === id);
                      return r ? (
                        <li key={id} className="flex items-center gap-2 py-1.5 text-xs">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground">{r.id}</span>
                          <span className="min-w-0 flex-1 truncate">{r.vendor} · {dateish(r)}</span>
                          <Link to="/app/receipts" search={{ vendor: r.vendor, q: "" }} className="underline-offset-4 hover:underline">open</Link>
                        </li>
                      ) : null;
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {!cats.length && <p className="py-6 text-sm text-muted-foreground">No spending yet</p>}
        </div> :

        <div className="min-w-0">
          <ul className="divide-y">
            {vendors.map((v) => (
              <li key={v.vendor} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition hover:bg-muted/60 sm:flex sm:px-5">
                <span className="min-w-0 flex-1 break-words font-medium">{v.vendor}</span>
                <span className="order-3 text-xs text-muted-foreground sm:order-none">{v.count} bill{v.count > 1 ? "s" : ""}</span>
                <span className="shrink-0 text-right font-mono sm:w-28">{Math.round(v.total).toLocaleString("en-IN")}</span>
                <Link to="/app/receipts" search={{ vendor: v.vendor, q: "" }} className="order-4 flex min-h-11 items-center justify-end text-xs underline-offset-4 hover:underline sm:order-none">bills</Link>
              </li>
            ))}
          </ul>
          {!vendors.length && <p className="py-6 text-sm text-muted-foreground">No suppliers yet</p>}
        </div>}
      </section>

      <div className="border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="px-0 font-semibold" aria-expanded={made} onClick={() => setMade(!made)}><Sparkles className="h-4 w-4" />{made ? "Hide overview" : "Quick overview"}<ChevronDown className={`h-4 w-4 ${made ? "rotate-180" : ""}`} /></Button>
        </div>
        {made && top && topVendor ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            In {MONTH_LABEL} you spent {fmt(s.spent)} across {s.bills} bills and took in {fmt(s.received)}, so {" "}{s.received >= s.spent ? `you closed the month ${fmt(s.received - s.spent)} ahead.` : `you spent ${fmt(s.spent - s.received)} more than you took in.`}
            {" "}{top.cat} was your biggest spending group at {fmt(top.total)}, and {topVendor.vendor} supplied you the most — {fmt(topVendor.total)} over {topVendor.count} bills.
            {" "}UPI covered {Math.round((s.online / s.received) * 100)}% of what came in.
          </p>
        ) : made ? <p className="mt-3 text-sm text-muted-foreground">No spending to summarize yet.</p> : null}
      </div>
    </div>
  );
}

const dateish = (r: Receipt) => r.date.slice(8, 10) + "/" + r.date.slice(5, 7);

function Stat({ label, value, sub, tone }: { label: string; value: number; sub: string; tone: "spent" | "received" }) {
  return (
    <div className="min-w-0 rounded-lg bg-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${tone === "spent" ? "text-spent" : "text-received"}`}>
        {value < 0 ? "−" : ""}{"₹"}{Math.round(Math.abs(value)).toLocaleString("en-IN")}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
