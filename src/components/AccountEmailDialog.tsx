import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AccountEmailDialog({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setEmail("");
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail) return;
    if (nextEmail.toLowerCase() === currentEmail.trim().toLowerCase()) {
      toast.error("Enter a different email address");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: window.location.origin },
    );
    setSaving(false);

    if (error) {
      toast.error(error.message || "Could not update your email. Try again.");
      return;
    }

    toast.success("Check your new email for a verification link");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentEmail ? "Change account email" : "Add account email"}</DialogTitle>
          <DialogDescription>
            {currentEmail ? `Current email: ${currentEmail}. ` : ""}We’ll send a verification link
            to the new address. It changes after you confirm it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-email">New email address</Label>
            <Input
              id="account-email"
              name="email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Sending…" : "Send verification link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
