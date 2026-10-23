import type { ReactNode } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshKhata, retryKhata, useKhataStatus } from "@/lib/khata";

export function BillSyncGate({ children }: { children: ReactNode }) {
  const { loading, saving, error, receipts } = useKhataStatus();
  if (loading) return <div role="status" className="flex items-center gap-2 py-12 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" />Loading your bills…</div>;
  return <>
    {error ? <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm text-destructive">
      <span>{error}</span>
      <Button variant="outline" size="sm" onClick={retryKhata}><RefreshCw className="h-4 w-4" />Retry</Button>
    </div> : <div className="mb-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
      {saving && <span role="status" className="flex items-center gap-2"><LoaderCircle className="h-3 w-3 animate-spin" />Saving bills…</span>}
      <Button variant="ghost" size="icon" title="Refresh bills" aria-label="Refresh bills" disabled={saving} onClick={() => { void refreshKhata(); }}><RefreshCw className="h-4 w-4" /></Button>
    </div>}
    {(!error || receipts.length > 0) && children}
  </>;
}