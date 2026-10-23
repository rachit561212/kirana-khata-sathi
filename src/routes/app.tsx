import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Moon, ReceiptText, Sun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/components/SiteChrome";
import { SignupDialog } from "@/components/SiteChrome";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getXanoAccount, signOutXano } from "@/lib/xano.functions";
import type { XanoAccount } from "@/lib/xano";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Hisaab app: your bills turned into records" },
      { name: "description", content: "Upload receipts, correct what was read, check duplicates and get a spending summary you can trace back to each bill." },
      { property: "og:title", content: "Hisaab app" },
      { property: "og:description", content: "Upload receipts, correct them, and see where your money went." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppShell,
});

const TABS = [
  { to: "/app", label: "Upload" },
  { to: "/app/review", label: "Review & edit" },
  { to: "/app/receipts", label: "Receipts" },
  { to: "/app/duplicates", label: "Duplicates" },
  { to: "/app/summary", label: "Summary" },
  { to: "/app/ask", label: "Ask" },
];

function AppShell() {
  const { dark, toggle } = useTheme();
  const [account, setAccount] = useState<XanoAccount | null>(null);
  const [signup, setSignup] = useState(false);
  const fetchAccount = useServerFn(getXanoAccount);
  const signOut = useServerFn(signOutXano);
  useEffect(() => { void fetchAccount().then(setAccount).catch(() => setAccount(null)); }, [fetchAccount]);
  const path = useLocation({ select: (l) => l.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:px-5">
          <Link to="/app" aria-label="Hisaab" className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><ReceiptText className="h-4 w-4" /></span>
            <span className="truncate">हिसाब</span>
          </Link>
          <nav aria-label="Ledger pages" className="order-3 col-span-2 grid w-full grid-cols-3 items-center gap-1 text-sm sm:flex sm:overflow-x-auto lg:order-2 lg:w-auto">
            {TABS.map((t) => {
              const on = t.to === "/app" ? path === "/app" : path.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2 py-2 font-medium transition sm:px-3 ${on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="order-2 flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-2 lg:order-3">
            {account ? <>
              <span className="hidden max-w-28 truncate text-xs text-muted-foreground sm:block" title={account.email}>{account.name}</span>
              <Button size="sm" variant="outline" className="min-h-11 px-2 sm:px-3" onClick={async () => { try { await signOut(); setAccount(null); toast.success("Signed out"); } catch { toast.error("Could not sign out. Try again."); } }}>Sign out</Button>
            </> : <Button size="sm" variant="outline" className="min-h-11 px-2 sm:px-3" onClick={() => setSignup(true)}>Sign in</Button>}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode" className="h-11 w-11">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/" aria-label="Landing page" title="Landing page" className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition hover:bg-muted sm:w-auto sm:px-3">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Landing page</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <Outlet />
      </main>
      <Toaster position="top-center" />
      <SignupDialog open={signup} onOpenChange={setSignup} />
    </div>
  );
}
