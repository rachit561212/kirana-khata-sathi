import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, MessageSquareQuestion, Send } from "lucide-react";
import { answer, fmt, MONTH_LABEL, sums, SUGGESTIONS, totalOf, useKhata, vendorTotals } from "@/lib/khata";

export const Route = createFileRoute("/app/ask")({
  head: () => ({
    meta: [
      { title: "Ask about your spending — ShopLedger" },
      { name: "description", content: "Ask a plain question about your bills and get an answer that points at the receipts behind it." },
    ],
  }),
  component: AskScreen,
});

function AskScreen() {
  const receipts = useKhata();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");

  const res = asked ? answer(asked, receipts) : null;
  const s = sums(receipts);
  const topVendor = vendorTotals(receipts)[0];

  const ask = (text: string) => {
    setAsked(text);
    setQ("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Ask your khata</h1>
        <p className="mt-1 text-muted-foreground">Ask in plain words. The answer is added up from your own bills, and shows you which ones.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="How much did I spend on oil?"
          className="h-11 flex-1 rounded-md border bg-background px-4 text-sm outline-none transition focus:border-foreground"
        />
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90">
          <Send className="h-4 w-4" /> Ask
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((t) => (
          <button key={t} onClick={() => ask(t)} className="rounded-full border bg-card px-3 py-1.5 text-xs transition hover:bg-muted">{t}</button>
        ))}
      </div>

      {res ? (
        <div className="rounded-xl border bg-card">
          <div className="flex items-start gap-3 border-b px-5 py-4">
            <MessageSquareQuestion className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">{asked}</div>
              <p className="mt-1.5 text-[15px] leading-relaxed">{res.text}</p>
            </div>
          </div>
          {res.cites.length > 0 && (
            <div className="px-5 py-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">From these bills</div>
              <ul className="divide-y rounded-md border">
                {res.cites.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-muted/60">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                    <span className="flex-1 truncate">{r.vendor} · {r.date.slice(8, 10)}/{r.date.slice(5, 7)}</span>
                    <span className={`font-mono font-semibold ${r.kind === "spent" ? "text-spent" : "text-received"}`}>{fmt(totalOf(r))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 text-sm">
          <p className="font-semibold">Right now your khata holds</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>· {s.bills} purchase bills worth {fmt(s.spent)}</li>
            <li>· {fmt(s.received)} collected ({fmt(s.online)} on UPI, {fmt(s.offline)} in cash)</li>
            {topVendor && <li>· {topVendor.vendor} is your biggest supplier at {fmt(topVendor.total)}</li>}
          </ul>
          <p className="mt-3 text-muted-foreground">
            Month shown: {MONTH_LABEL}. <Link to="/app/receipts" className="underline-offset-4 hover:underline">Open all receipts</Link> to check any figure.
          </p>
        </div>
      )}
    </div>
  );
}
