import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dateLabel, dupPairs, flushKhata, fmt, khata, totalOf, useKhata, type Receipt } from "@/lib/khata";

export const Route = createFileRoute("/app/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicates — Hisaab" },
      { property: "og:title", content: "Duplicates — Hisaab" },
      { property: "og:description", content: "Compare possible duplicate receipts side by side." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Bills that look like the same purchase twice, shown side by side so you can pick the one to keep." },
    ],
  }),
  component: DuplicatesScreen,
});

function DuplicatesScreen() {
  const receipts = useKhata();
  const pairs = dupPairs(receipts);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Possible duplicates</h1>
        <p className="mt-1 text-muted-foreground">
          {pairs.length ? "These pairs look like the same purchase sent twice — once as a PDF, once as a photo. Keep the one you want." : "Nothing looks like the same purchase twice."}
        </p>
      </div>

      {pairs.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Check className="mx-auto h-8 w-8 text-received" />
          <p className="mt-3 font-semibold">Your khata is clean</p>
          <p className="mt-1 text-sm text-muted-foreground">No two bills look like the same purchase right now.</p>
        </div>
      ) : (
        pairs.map(([a, b]) => <Pair key={a.id + b.id} a={a} b={b} />)
      )}
    </div>
  );
}

function Pair({ a, b }: { a: Receipt; b: Receipt }) {
  const [saving, setSaving] = useState(false);
  const same = totalOf(a) === totalOf(b);
  const decide = async (keep: Receipt, drop: Receipt) => {
    setSaving(true);
    try { khata.keep(keep.id, drop.id); await flushKhata(); toast.success("Duplicate sorted", { description: `Kept ${keep.id}, dropped ${drop.id}.` }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your choice"); }
    finally { setSaving(false); }
  };
  const unflag = async () => {
    setSaving(true);
    try { khata.unflag(a.id, b.id); await flushKhata(); toast("Both bills kept", { description: "Marked as separate purchases." }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your choice"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="grid min-w-0 gap-2 border-b px-4 py-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <span className="flex min-w-0 items-center gap-2 font-semibold"><GitCompareArrows className="h-4 w-4 shrink-0 text-primary" /> <span>{a.vendor} · {dateLabel(a.date)}</span></span>
        <span className="text-xs text-muted-foreground">{same ? "Same items, same total" : "Same items, totals differ"} · {fmt(totalOf(a))} vs {fmt(totalOf(b))}</span>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2">
        {[a, b].map((r) => (
          <div key={r.id} className="min-w-0 bg-card p-4 sm:p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{r.id}</span>
              <span>{r.source} · {r.payment} · {r.conf}% sure</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {r.items.map((i) => (
                <li key={i.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <span className="min-w-0 break-words">{i.name}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">{i.qty} × ₹{i.rate}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="font-mono text-lg font-bold">{fmt(totalOf(r))}</span>
              <Button size="sm" variant="outline" className="min-h-11" disabled={saving} aria-label={`Keep ${r.id}`} onClick={() => decide(r, r.id === a.id ? b : a)}>
                <Copy className="h-3.5 w-3.5" /> Keep this one
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t px-5 py-3 text-right">
        <Button variant="ghost"
          disabled={saving} onClick={unflag}
          className="min-h-11 w-full whitespace-normal text-xs underline-offset-4 transition hover:underline sm:w-auto"
        >
          These are two different purchases
        </Button>
      </div>
    </div>
  );
}
