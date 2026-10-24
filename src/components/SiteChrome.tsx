import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowRight, ArrowUp, Check, Copy, FileText, Menu, Moon, Sun, Upload, X, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { checkBillUpload } from "@/lib/bill-upload";

const NAV: { href: string; label: string; cta?: boolean }[] = [
  { href: "#sandbox", label: "Demo" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
  { href: "/app", label: "Open the app", cta: true },
];

export function SkipLink() {
  return (
    <a href="#main" className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      Skip to content
    </a>
  );
}

/* ---------- theme ---------- */
export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("kk-theme");
    const d = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);
  const toggle = useCallback(() => {
    setDark((d) => {
      const n = !d;
      document.documentElement.classList.toggle("dark", n);
      localStorage.setItem("kk-theme", n ? "dark" : "light");
      return n;
    });
  }, []);
  return { dark, toggle };
}

/* ---------- header ---------- */
export function SiteHeader({ dark, onToggleTheme, onSignup }: { dark: boolean; onToggleTheme: () => void; onSignup: () => void }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > window.innerHeight * 3.2);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? "border-b bg-background/95 text-foreground" : "text-ink-foreground"}`}>
      <nav className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 sm:flex sm:justify-between sm:px-5 sm:py-3.5">
        <a href="/" aria-label="Hisaab home" className="flex min-w-0 items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">₹</span>
          <span className="min-w-0 truncate">हिसाब</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60 lg:inline">Hisaab</span>
        </a>
        <div className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((n) => n.cta ? (
            <a
              key={n.href}
              href={n.href}
              className="ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground shadow-ledger ring-2 ring-accent/35 transition hover:-translate-y-0.5 hover:brightness-105"
            >
              {n.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <a key={n.href} href={n.href} className="rounded-md px-3 py-2 opacity-80 transition hover:bg-foreground/10 hover:opacity-100">{n.label}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle dark mode" className="h-11 w-11 shrink-0 hover:bg-foreground/10 hover:text-current">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={onSignup} className="hidden font-semibold sm:inline-flex">Start free</Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-11 w-11 shrink-0 hover:bg-foreground/10 hover:text-current md:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-display">Menu</SheetTitle>
              <div className="mt-6 flex flex-col">
                {NAV.map((n) => n.cta ? (
                  <a
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-3 text-lg font-bold text-accent-foreground shadow-ledger ring-2 ring-accent/35"
                  >
                    {n.label}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b py-3 text-lg">{n.label}</a>
                ))}
                <Button className="mt-4" onClick={() => { setOpen(false); onSignup(); }}>Start free</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

/* ---------- Google OAuth sign-in ---------- */
export function SignupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const google = async () => {
    setBusy(true); setError("");
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app`, skipBrowserRedirect: true },
      });
      if (oauthError) {
        setError("Google sign-in is unavailable. Check that Google is enabled in Supabase Auth and this app URL is allowed.");
        return;
      }
      if (!data.url) {
        setError("Google sign-in could not start. Please try again.");
        return;
      }
      window.location.assign(data.url);
    } catch { setError("Google sign-in is unavailable. Check the Supabase Google provider settings and try again."); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Open your khata</DialogTitle>
          <DialogDescription>Continue securely with your Google account. Your shop data stays private to your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="button" variant="outline" disabled={busy} className="w-full font-semibold" onClick={() => void google()}>{busy ? "Connecting…" : "Continue with Google"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- upload box: empty state, skeleton, toast ---------- */
type Bill = { name: string; size: number };
export function UploadBox({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [over, setOver] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoading(true);
    try { await checkBillUpload(Array.from(files)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not read this file. No bill was added."); }
    finally { setLoading(false); }
  };
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${over ? "border-primary bg-primary/10" : "hover:border-foreground/40 hover:bg-muted"}`}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="mt-3 font-semibold">Scan a bill</span>
        <span className="mt-1 text-sm text-muted-foreground">PDF, JPG or PNG. Photos of paper bills work too.</span>
        <input ref={inputRef} type="file" accept=".pdf,image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
      </label>
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 text-sm font-semibold">Your bills</div>
        {loading && (
          <div className="space-y-3">
            {[0, 1].map((i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/3" /></div></div>)}
          </div>
        )}
        {!loading && bills.length === 0 && (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">No bills yet</p>
            <p className="text-sm text-muted-foreground">Your first upload will show up here.</p>
          </div>
        )}
        {!loading && bills.length > 0 && (
          <ul className="divide-y">
            {bills.map((b, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <FileText className="h-5 w-5 text-accent" />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                <span className="text-muted-foreground">{Math.max(1, Math.round(b.size / 1024))} KB</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- copy button ---------- */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button variant="outline" size="sm"
      onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); toast("Copied to clipboard"); setTimeout(() => setDone(false), 1500); }}
      className="min-h-11 gap-1.5 px-2.5 text-xs font-medium hover:bg-muted"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </Button>
  );
}

/* ---------- back to top ---------- */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = () => setShow(window.scrollY > window.innerHeight * 4.5);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 right-5 z-30 grid h-11 w-11 place-items-center rounded-full bg-foreground text-background shadow-ledger transition hover:-translate-y-0.5 ${show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/* ---------- cookie banner ---------- */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem("kk-cookies")) setShow(true); }, []);
  if (!show) return null;
  const close = (v: string) => { localStorage.setItem("kk-cookies", v); setShow(false); };
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-4 bottom-4 z-40 max-w-sm rounded-lg border bg-card p-4 text-sm text-card-foreground shadow-ledger sm:inset-x-auto sm:bottom-5 sm:left-5">
      <div className="flex items-start gap-3">
        <p className="flex-1">We use a few cookies to keep you signed in and see which pages help shopkeepers most.</p>
        <button aria-label="Close" onClick={() => close("dismissed")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => close("all")}>Accept</Button>
        <Button size="sm" variant="outline" onClick={() => close("essential")}>Only essential</Button>
      </div>
    </div>
  );
}

/* ---------- keyboard shortcuts ---------- */
const SHORTCUTS = [
  ["U", "Upload a bill"],
  ["D", "Toggle dark mode"],
  ["T", "Back to top"],
  ["S", "Skip the intro"],
  ["?", "Show shortcuts"],
] as const;

export function Shortcuts({ onUpload, onTheme, onSkip }: { onUpload: () => void; onTheme: () => void; onSkip: () => void }) {
  const [open, setOpen] = useState(false);
  const handlers = useRef({ onUpload, onTheme, onSkip });
  handlers.current = { onUpload, onTheme, onSkip };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,[contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") setOpen((o) => !o);
      else if (e.key === "u") handlers.current.onUpload();
      else if (e.key === "d") handlers.current.onTheme();
      else if (e.key === "t") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (e.key === "s") handlers.current.onSkip();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100"><Keyboard className="h-4 w-4" /> Shortcuts</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
          <ul className="divide-y text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <li key={k} className="flex items-center justify-between py-2.5">{d}<kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{k}</kbd></li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
