import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { downloadBlob } from "@/lib/csv";
import { makeStatement, statementRange, type StatementPeriod } from "@/lib/statements";
import type { Receipt } from "@/lib/khata";

export default function StatementExport({ receipts }: { receipts: Receipt[] }) {
  const [period, setPeriod] = useState<StatementPeriod>("month");
  const [value, setValue] = useState("2026-10");
  const [end, setEnd] = useState("2026-10-31");
  const [busy, setBusy] = useState(false);
  const account = useQuery<{ email: string; name: string } | null>({ queryKey: ["account"] }).data;
  const choosePeriod = (next: StatementPeriod) => {
    setPeriod(next);
    const date = receipts.map((r) => r.date).sort().at(-1) ?? "2026-10-23";
    setValue(next === "year" ? date.slice(0, 4) : next === "month" ? date.slice(0, 7) : date);
    setEnd(date);
  };
  let count = 0;
  let invalid = "";
  try { count = makeStatement(receipts, statementRange(period, value, end)).records.length; }
  catch (error) { invalid = error instanceof Error ? error.message : "Check your dates"; }

  async function download() {
    setBusy(true);
    try {
      const statement = makeStatement(receipts, statementRange(period, value, end));
      if (!statement.records.length) throw new Error("No confirmed records in this period.");
      const { createStatementPdf } = await import("@/lib/statement-pdf");
      const bytes = await createStatementPdf(statement);
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `hisaab-${statement.range.start}-to-${statement.range.end}.pdf`);
      toast.success("PDF statement downloaded");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create statement"); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="statement-title" className="border-y py-6">
    <h2 id="statement-title" className="font-display text-xl font-bold">Your statement</h2>
    <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Statement period">
      {(["day", "month", "year", "custom"] as const).map((p) => <Button key={p} variant={period === p ? "default" : "outline"} aria-pressed={period === p} onClick={() => choosePeriod(p)}>{p === "custom" ? "Custom period" : `One ${p}`}</Button>)}
    </div>
    <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="statement-start">{period === "year" ? "Year" : period === "month" ? "Month" : period === "custom" ? "From" : "Date"}</Label><Input id="statement-start" type={period === "year" ? "number" : period === "month" ? "month" : "date"} min={period === "year" ? "1000" : undefined} max={period === "year" ? "9999" : undefined} value={value} onChange={(e) => setValue(e.target.value)} /></div>
      {period === "custom" && <div className="space-y-2"><Label htmlFor="statement-end">To</Label><Input id="statement-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>}
    </div>
    <p className="mt-3 text-sm text-muted-foreground" role="status">{invalid ? "Choose a valid date range." : `${count} confirmed records · current visit`}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button disabled={busy || !!invalid || !count} onClick={download}><Download className="h-4 w-4" />{busy ? "Creating PDF…" : "Download PDF"}</Button>
      <Button variant="outline" disabled title="Email sending awaits sender domain setup"><Mail className="h-4 w-4" />Email statement</Button>
    </div>
    <p className="mt-3 break-words text-sm text-muted-foreground">{account?.email ? `Send to: ${account.email}` : "Sign in to use your account email."}</p>
    <p className="mt-1 text-sm text-muted-foreground">Email delivery awaits sender setup. PDF download is available now.</p>
  </section>;
}