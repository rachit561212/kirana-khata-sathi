import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateLabel, fmt, khata, totalOf, useKhata, type Receipt } from "@/lib/khata";

export const Route = createFileRoute("/app/review")({
  head: () => ({
    meta: [
      { title: "Review & edit — ShopLedger" },
      { name: "description", content: "Check what was read from each bill and fix anything that came out wrong before it is saved." },
    ],
  }),
  component: ReviewScreen,
});

function ReviewScreen() {
  const receipts = useKhata();
  const need = receipts.filter((r) => r.status === "new" || r.status === "corrected");
  const [sel, setSel] = useState<string | null>(null);
  const active = need.find((r) => r.id === sel) ?? need[0];

  if (!active) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <Check className="mx-auto h-8 w-8 text-received" />
        <p className="mt-3 font-semibold">Nothing left to check</p>
        <p className="mt-1 text-sm text-muted-foreground">Every bill read so far has been accepted. Upload another one to try it again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Review &amp; edit</h1>
        <p className="mt-1 text-muted-foreground">{need.length} bills are waiting for a look. Fix anything that came out wrong, then save it to your khata.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ul className="space-y-2">
          {need.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setSel(r.id)}
                className={`w-full rounded-lg border p-3 text-left transition hover:border-foreground/40 ${r.id === active.id ? "border-foreground bg-muted" : "bg-card"}`}
              >
                <span className="block text-sm font-medium">{r.vendor}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{dateLabel(r.date)} · {fmt(totalOf(r))}</span>
                <span className="mt-2 flex items-center gap-1.5">
                  <span className="h-1.5 flex-1 overflow-hidden rounded bg-muted"><span className={`block h-full ${r.conf > 90 ? "bg-received" : "bg-primary"}`} style={{ width: `${r.conf}%` }} /></span>
                  <span className="font-mono text-[11px] text-muted-foreground">{r.conf}%</span>
                </span>
                {r.items.some((i) => i.hike) && (
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive"><TriangleAlert className="h-3 w-3" /> price went up since last bill</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <EditForm key={active.id} r={active} />
      </div>
    </div>
  );
}

function EditForm({ r }: { r: Receipt }) {
  const [vendor, setVendor] = useState(r.vendor);
  const [date, setDate] = useState(r.date);
  const [payment, setPayment] = useState(r.payment);
  const [items, setItems] = useState(r.items.map((i) => ({ ...i })));
  const dirty = vendor !== r.vendor || date !== r.date || payment !== r.payment || JSON.stringify(items) !== JSON.stringify(r.items);

  const set = (idx: number, key: "name" | "qty" | "rate" | "gst", v: string | number) =>
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [key]: v } : it)));

  const save = () => {
    khata.patch(r.id, { vendor, date, payment });
    items.forEach((it, i) => khata.patchItem(r.id, i, { name: it.name, qty: it.qty, rate: it.rate, gst: it.gst }));
    toast.success("Saved to your khata", { description: `${vendor} · ${dateLabel(date)}` });
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Pencil className="h-4 w-4 text-primary" /> What we read from this bill</div>
        <span className="text-xs text-muted-foreground">{r.source} · {r.conf}% sure</span>
      </div>

      <div className="grid gap-4 border-b p-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="v">Vendor</Label>
          <Input id="v" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d">Date</Label>
          <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p">Paid by</Label>
          <Input id="p" value={payment} onChange={(e) => setPayment(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Qty</th>
              <th className="px-2 py-2 font-medium">Rate</th>
              <th className="px-2 py-2 font-medium">GST %</th>
              <th className="px-5 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((it, i) => (
              <tr key={i} className={it.hike ? "bg-destructive/5" : ""}>
                <td className="px-5 py-2">
                  <Input value={it.name} onChange={(e) => set(i, "name", e.target.value)} className="h-8 border-transparent bg-transparent px-1 hover:border" />
                  {it.hike && <span className="ml-1 flex items-center gap-1 text-[11px] text-destructive"><TriangleAlert className="h-3 w-3" /> {it.hike}</span>}
                </td>
                <td className="px-2 py-2"><Input type="number" value={it.qty} onChange={(e) => set(i, "qty", Number(e.target.value) || 0)} className="h-8 w-20" /></td>
                <td className="px-2 py-2"><Input type="number" value={it.rate} onChange={(e) => set(i, "rate", Number(e.target.value) || 0)} className="h-8 w-24" /></td>
                <td className="px-2 py-2"><Input type="number" value={it.gst} onChange={(e) => set(i, "gst", Number(e.target.value) || 0)} className="h-8 w-16" /></td>
                <td className="px-5 py-2 text-right font-mono">{fmt(it.qty * it.rate * (1 + it.gst / 100))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2">
              <td colSpan={4} className="px-5 py-3 font-medium">Total for this bill</td>
              <td className="px-5 py-3 text-right font-mono text-lg font-bold">{fmt(items.reduce((s, it) => s + it.qty * it.rate * (1 + it.gst / 100), 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <span className="text-xs text-muted-foreground">{dirty ? "You changed something — save it to keep the fix." : "Nothing changed yet."}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { khata.accept(r.id); toast("Accepted as it is", { description: `${vendor} · ${dateLabel(date)}` }); }}>Accept as it is</Button>
          <Button size="sm" className="font-semibold" disabled={!dirty} onClick={save}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
