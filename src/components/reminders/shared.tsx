import { useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ReminderData } from "@/lib/reminder-data";

export type SectionProps = { data: ReminderData; refresh: () => Promise<unknown> };

export async function attempt(fn: () => Promise<unknown>, ok: string, refresh: () => Promise<unknown>) {
  try { await fn(); toast.success(ok); await refresh(); return true; }
  catch (e) { toast.error(e instanceof Error ? e.message : "Could not save. Try again."); return false; }
}

export function CallButton({ phone, label = "Call Supplier" }: { phone: string; label?: string }) {
  if (!phone) return null;
  return <Button asChild size="sm" className="min-h-10"><a href={`tel:${phone}`} aria-label={`${label} ${phone}`}><Phone className="h-4 w-4" />{label}</a></Button>;
}

export function DeleteButton({ what, onConfirm }: { what: string; onConfirm: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" variant="ghost" className="min-h-10 text-destructive" aria-label={`Delete ${what}`} onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /></Button>
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete {what}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void onConfirm()}>Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>;
}
