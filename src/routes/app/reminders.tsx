import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadReminderData } from "@/lib/reminder-data";
import type { ReminderKind } from "@/lib/reminders";
import { CollectSection } from "@/components/reminders/CollectSection";
import { PaySection } from "@/components/reminders/PaySection";
import { StockSection } from "@/components/reminders/StockSection";
import { useLeadDays } from "@/components/ReminderAlerts";

type Tab = ReminderKind;
export const Route = createFileRoute("/app/reminders")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s["tab"] === "pay" || s["tab"] === "stock" || s["tab"] === "collect" ? { tab: s["tab"] } : {}),
  head: () => ({ meta: [
    { title: "Reminders — Hisaab" },
    { name: "description", content: "Money to collect, money to pay and low stock for your shop, in one place." },
    { property: "og:title", content: "Reminders — Hisaab" },
    { property: "og:description", content: "Stay ahead of udhaar, due payments and low stock." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RemindersScreen,
});

const TABS: [Tab, string][] = [["collect", "Collect"], ["pay", "Pay"], ["stock", "Stock"]];

function NotificationSettings() {
  const [lead, setLead] = useLeadDays();
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); }, []);
  const ask = async () => {
    const r = await Notification.requestPermission(); setPerm(r);
    if (r === "granted") toast.success("Notifications on. Hisaab alerts you about due payments when you open the app.");
    else toast("Notifications are off. Reminders will show inside the app.");
  };
  return <details className="rounded-xl border bg-card p-4 text-sm"><summary className="flex cursor-pointer items-center gap-2 font-medium"><Bell className="h-4 w-4" />Reminder settings</summary>
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2"><span>Remind me</span>{[1, 2].map((n) => <Button key={n} size="sm" variant={lead === n ? "default" : "outline"} className="min-h-10" onClick={() => setLead(n)}>{n} day{n > 1 ? "s" : ""} before</Button>)}</div>
      {perm === "granted" ? <p>Device notifications are on. They appear when you open Hisaab on this device; they cannot arrive while the app is closed.</p>
        : perm === "unsupported" ? <p>This browser does not support notifications. Reminders show inside the app.</p>
        : perm === "denied" ? <p>Notifications are blocked in your browser settings. Reminders show inside the app.</p>
        : <Button size="sm" variant="outline" className="min-h-10" onClick={() => void ask()}>Turn on device notifications</Button>}
    </div></details>;
}

function RemindersScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reminders"], queryFn: loadReminderData });
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: Tab = search.tab ?? "collect";
  const refresh = () => qc.invalidateQueries({ queryKey: ["reminders"] });

  return <div className="space-y-6">
    <h1 className="font-display text-3xl font-bold">Reminders</h1>
    <div className="flex justify-center"><div role="tablist" aria-label="Reminder type" className="inline-flex gap-1 rounded-xl border bg-card p-1">
      {TABS.map(([k, l]) => <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "default" : "ghost"} className="min-h-11 min-w-24" onClick={() => void navigate({ search: { tab: k }, replace: true })}>{l}</Button>)}
    </div></div>
    {q.isPending ? <div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
      : q.isError ? <div className="py-10 text-center"><p>Could not load reminders.</p><Button className="mt-3 min-h-11" onClick={() => void q.refetch()}>Try again</Button></div>
      : !q.data ? <div className="border-y py-10 text-center"><BellRing className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Sign in to use reminders.</p></div>
      : <div role="tabpanel">{tab === "collect" ? <CollectSection data={q.data} refresh={refresh} /> : tab === "pay" ? <PaySection data={q.data} refresh={refresh} /> : <StockSection data={q.data} refresh={refresh} />}</div>}
    {q.data && <NotificationSettings />}
  </div>;
}
