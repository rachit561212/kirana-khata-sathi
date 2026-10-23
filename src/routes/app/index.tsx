import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Check, FileText, ScanLine, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dateLabel, fmt, khata, SAMPLE_FILES, totalOf, useKhata } from "@/lib/khata";
import { VoiceEntry } from "@/components/VoiceEntry";
import { PurchaseOrder } from "@/components/PurchaseOrder";
import { RepeatOrder } from "@/components/RepeatOrder";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Add a bill — Hisaab" },
      { property: "og:title", content: "Add a bill — Hisaab" },
      { property: "og:description", content: "Say a sale out loud, attach a bill photo or raise a purchase order — the khata fills itself." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Speak in any language, or attach a receipt photo or PDF, and see the vendor, date and items pulled out for checking." },
    ],
  }),
  component: UploadScreen,
});

function UploadScreen() {
  const receipts = useKhata();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [over, setOver] = useState(false);

  const add = (names: string[]) => {
    if (!names.length) return;
    setLoading(true);
    setTimeout(() => {
      const ids = khata.addIncoming(names);
      setAdded((a) => [...ids, ...a]);
      setLoading(false);
      toast.success(`${ids.length} bill${ids.length > 1 ? "s" : ""} read`, { description: "Check the details before they go into your khata." });
    }, 900);
  };

  const newOnes = receipts.filter((r) => added.includes(r.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Add a bill</h1>
        <p className="mt-1 text-muted-foreground">{receipts.length} records already in your khata.</p>
      </div>

      <VoiceEntry onAdded={(id) => setAdded((a) => [id, ...a])} />

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files).map((f) => f.name)); }}
          className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition ${over ? "border-primary bg-primary/10" : "hover:border-foreground/40 hover:bg-muted"}`}
        >
          <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Scan a bill</span>
            <span className="block text-xs text-muted-foreground">PDF, JPG or PNG</span>
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="sr-only"
            onChange={(e) => add(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
        </label>
        <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
          <span className="text-xs text-muted-foreground">Try a sample bill</span>
          {SAMPLE_FILES.map((f) => (
            <Button key={f} size="sm" variant="outline" onClick={() => add([f])} className="min-h-11 max-w-full gap-1.5 px-2 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate font-mono">{f}</span>
            </Button>
          ))}
        </div>
      </div>

      <PurchaseOrder onAdded={(id) => setAdded((a) => [id, ...a])} />
      <RepeatOrder receipts={receipts} onAdded={(id) => setAdded((a) => [id, ...a])} />

      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-3 text-sm font-semibold">Just read</div>
        {loading && (
          <div className="space-y-3 p-5">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/4" /></div>
              </div>
            ))}
          </div>
        )}
        {!loading && newOnes.length === 0 && (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Nothing read yet</p>
            <p className="text-sm text-muted-foreground">Bills you speak or attach will appear here with what we could pull out.</p>
          </div>
        )}
        {!loading && newOnes.length > 0 && (
          <ul className="divide-y">
            {newOnes.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm sm:flex sm:px-5">
                <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-md bg-muted sm:grid"><ScanLine className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 break-words">
                  <span className="block font-medium">{r.vendor}</span>
                  <span className="block text-xs text-muted-foreground">{dateLabel(r.date)} · {r.source} · {r.items.length} item{r.items.length > 1 ? "s" : ""} · {r.conf}% sure</span>
                </span>
                <span className="shrink-0 font-mono font-semibold text-spent">{fmt(totalOf(r))}</span>
                <span className="flex items-center gap-1 text-xs text-received"><Check className="h-3.5 w-3.5" /> ready</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:flex sm:flex-wrap [&>a]:min-h-11">
        <Button asChild className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"><Link to="/app/review">Review &amp; edit</Link></Button>
        <Button asChild variant="outline"><Link to="/app/receipts">See all receipts</Link></Button>
      </div>
    </div>
  );
}
