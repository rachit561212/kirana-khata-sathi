import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DAILY = [
  { label: "Mon", spent: 14200, received: 22100 },
  { label: "Tue", spent: 18420, received: 27960 },
  { label: "Wed", spent: 9800, received: 21400 },
  { label: "Thu", spent: 21300, received: 24800 },
  { label: "Fri", spent: 12600, received: 26300 },
  { label: "Sat", spent: 16900, received: 34200 },
  { label: "Sun", spent: 7400, received: 31800 },
];
const MONTHLY = [
  { label: "May", spent: 382000, received: 518000 },
  { label: "Jun", spent: 401000, received: 542000 },
  { label: "Jul", spent: 366000, received: 497000 },
  { label: "Aug", spent: 418000, received: 571000 },
  { label: "Sep", spent: 395000, received: 556000 },
  { label: "Oct", spent: 428000, received: 603000 },
];
const MODE = [
  { name: "Online (UPI, card)", value: 412000, color: "var(--received)" },
  { name: "Offline (cash)", value: 191000, color: "var(--primary)" },
];

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const short = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n / 1000)}k`);
const tip = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 13 };

export function MoneyCharts() {
  const [range, setRange] = useState<"day" | "month">("day");
  const data = range === "day" ? DAILY : MONTHLY;
  const total = MODE.reduce((s, m) => s + m.value, 0);
  return (
    <section id="reports" className="mx-auto max-w-7xl px-6 pb-24">
      <h2 className="text-4xl font-bold md:text-5xl">Your shop, in two charts</h2>
      <p className="mt-2 text-muted-foreground">Sample numbers. Yours fill in as bills come in.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold">Spent vs received {range === "day" ? "this week" : "last 6 months"}</div>
            <div className="flex rounded-lg border p-1 text-sm">
              {(["day", "month"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1.5 font-medium transition ${range === r ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
                  {r === "day" ? "Per day" : "Per month"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={52} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip formatter={(v: number) => inr(v)} contentStyle={tip} cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="spent" name="Spent" fill="var(--spent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received" fill="var(--received)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="font-semibold">How customers paid in October</div>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={MODE} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={2} stroke="var(--card)">
                  {MODE.map((m) => <Cell key={m.name} fill={m.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => inr(v)} contentStyle={tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><div className="font-mono text-lg font-semibold">{short(total)}</div><div className="text-xs text-muted-foreground">received</div></div>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {MODE.map((m) => (
              <li key={m.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: m.color }} />
                <span className="flex-1">{m.name}</span>
                <span className="font-mono">{Math.round((m.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
