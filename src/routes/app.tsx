import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/components/SiteChrome";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "ShopLedger app: your bills turned into records" },
      { name: "description", content: "Upload receipts, correct what was read, check duplicates and get a spending summary you can trace back to each bill." },
      { property: "og:title", content: "ShopLedger app" },
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
  const path = useLocation({ select: (l) => l.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/app" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"><ReceiptText className="h-4 w-4" /></span>
            ShopLedger
          </Link>
          <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto text-sm md:order-2 md:w-auto">
            {TABS.map((t) => {
              const on = t.to === "/app" ? path === "/app" : path.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`shrink-0 rounded-md px-3 py-1.5 font-medium transition ${on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto order-2 flex items-center gap-2 md:order-3">
            <button onClick={toggle} aria-label="Toggle dark mode" className="grid h-8 w-8 place-items-center rounded-md border text-xs transition hover:bg-muted">
              {dark ? "Lt" : "Dk"}
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              <ArrowLeft className="h-3.5 w-3.5" /> Landing page
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
