import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, LogOut, Moon, ReceiptText, Sun, UserRound } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/components/SiteChrome";
import { SignupDialog } from "@/components/SiteChrome";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect } from "react";
import ShopProfileDialog from "@/components/ShopProfileDialog";
import { BillSyncGate } from "@/components/BillSyncGate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  { to: "/app", label: "Add bill" },
  { to: "/app/sales", label: "Sales" },
  { to: "/app/receipts", label: "Bills" },
  { to: "/app/summary", label: "Summary" },
];
const MORE_TABS = [
  { to: "/app/products", label: "Products" },
  { to: "/app/review", label: "Review & edit" },
  { to: "/app/duplicates", label: "Duplicates" },
  { to: "/app/ask", label: "Ask" },
];

async function loadAccount() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, shop_name, phone, shop_address, gstin")
    .eq("user_id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    profile: {
      display_name: profile?.display_name ?? "",
      shop_name: profile?.shop_name ?? "",
      phone: profile?.phone ?? "",
      shop_address: profile?.shop_address ?? "",
      gstin: profile?.gstin ?? "",
    },
    hasProfile: !!profile,
    name: profile?.shop_name || profile?.display_name || String(user.user_metadata?.["display_name"] || "") || user.email || "Your shop",
    email: user.email || "",
  };
}

function AppShell() {
  const { dark, toggle } = useTheme();
  const [signup, setSignup] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountQuery = useQuery({ queryKey: ["account"], queryFn: loadAccount, staleTime: 60_000 });
  const account = accountQuery.data ?? null;
  const [editShop, setEditShop] = useState(false);
  useEffect(() => {
    if (account?.hasProfile && !account.profile.shop_name && sessionStorage.getItem("shop-prompted") !== account.id) {
      sessionStorage.setItem("shop-prompted", account.id);
      setEditShop(true);
    }
  }, [account]);
  const path = useLocation({ select: (l) => l.pathname });
  const handleSignOut = async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Signed out");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not sign out. Try again.");
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:px-5">
          <Link to="/app" aria-label="Hisaab" className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><ReceiptText className="h-4 w-4" /></span>
            <span className="truncate">हिसाब</span>
          </Link>
          <nav aria-label="Ledger pages" className="order-3 col-span-2 grid w-full grid-cols-5 items-center gap-1 text-xs sm:flex sm:text-sm lg:order-2 lg:w-auto">
            {TABS.map((t) => {
              const on = t.to === "/app" ? path === "/app" : path.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-1 py-2 font-medium transition sm:px-3 ${on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {t.label}
                </Link>
              );
            })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className={`min-h-11 gap-1 px-1 text-xs sm:px-3 sm:text-sm ${MORE_TABS.some((t) => path.startsWith(t.to)) ? "bg-muted text-foreground" : "text-muted-foreground"}`}>More<ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">{MORE_TABS.map((t) => <DropdownMenuItem key={t.to} asChild><Link to={t.to} className="min-h-11">{t.label}</Link></DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="order-2 flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-2 lg:order-3">
            {account ? <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" aria-label="Shop account" className="min-h-11 gap-2 px-3"><UserRound className="h-4 w-4" /><span className="hidden max-w-28 truncate xl:inline">{account.name}</span><ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11" onSelect={() => setEditShop(true)}><UserRound />Edit shop details</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="min-h-11" onSelect={() => void handleSignOut()}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu> : <Button size="sm" variant="outline" className="min-h-11 px-2 sm:px-3" onClick={() => setSignup(true)}>Sign in</Button>}
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode" className="h-11 w-11">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/" aria-label="Landing page" title="Landing page" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <BillSyncGate key={account?.id ?? "guest"}><Outlet /></BillSyncGate>
      </main>
      <Toaster position="top-center" />
      <SignupDialog open={signup} onOpenChange={setSignup} />
      {account && <ShopProfileDialog open={editShop} onOpenChange={setEditShop} userId={account.id} initial={account.profile} />}
    </div>
  );
}
