import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Upload, Play, MessageCircle, ScanLine, BookOpen, Moon, Languages, AlertTriangle, Check, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ShopScene = lazy(() => import("@/components/ShopScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kirana Khata — Upload receipts, get your shop ledger" },
      { name: "description", content: "Drop supplier bills, mandi receipts and UPI settlements. Kirana Khata extracts every line into a clean money in/out ledger." },
      { property: "og:title", content: "Kirana Khata — Your shop ledger, written for you" },
      { property: "og:description", content: "Automated extraction of money spent and money received for kirana stores, in 7 Indian languages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STAGES = [
  { at: 0, tag: "6:00 AM", title: "The gully wakes up", body: "Scroll to roll up the shutter." },
  { at: 0.12, tag: "Shutter up", title: "Dukaan khul gayi", body: "Yesterday's bills are already in your khata." },
  { at: 0.26, tag: "Lights on", title: "Shelves lit, stock counted", body: "Every distributor invoice matched to what's on the shelf." },
  { at: 0.4, tag: "First customers", title: "Namaste, bhaiya!", body: "UPI and cash sales get logged as money comes in." },
  { at: 0.6, tag: "Bills to ledger", title: "Every receipt lands in the khata", body: "Coins and parchis go straight into your daybook, line by line." },
  { at: 0.85, tag: "Day closed", title: "Hisaab ready before shutter-down", body: "Money in, money out, udhaar due — on one screen." },
];

function Index() {
  const [mounted, setMounted] = useState(false);
  const progress = useRef({ current: 0 }).current;
  const heroRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      progress.current = p;
      if (introRef.current) {
        introRef.current.style.opacity = String(Math.max(0, 1 - p * 5));
        introRef.current.style.transform = `translateY(${-p * 120}px)`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      let s = 0;
      STAGES.forEach((st, i) => { if (p >= st.at) s = i; });
      setStage(s);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [progress]);

  const replay = () => {
    const el = heroRef.current;
    if (!el) return;
    window.scrollTo({ top: el.offsetTop, behavior: "instant" as ScrollBehavior });
    setTimeout(() => window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: "smooth" }), 50);
  };
  const st = STAGES[stage]!;

  return (
    <main className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-ink-foreground">
          <a href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">₹</span>
            Kirana Khata
          </a>
          <div className="hidden gap-8 text-sm md:flex">
            <a href="#sandbox" className="opacity-80 hover:opacity-100">Demo</a>
            <a href="#features" className="opacity-80 hover:opacity-100">Features</a>
            <a href="#pricing" className="opacity-80 hover:opacity-100">Pricing</a>
            <a href="#faq" className="opacity-80 hover:opacity-100">FAQ</a>
          </div>
          <Button size="sm" className="font-semibold">Start free</Button>
        </nav>
      </header>

      {/* HERO — scroll-driven story */}
      <section id="hero" ref={heroRef} className="relative h-[420vh] bg-dusk">
        <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden">
          <div className="absolute inset-0">
            {mounted && (
              <Suspense fallback={null}>
                <ShopScene progress={progress} />
              </Suspense>
            )}
          </div>
          <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-6 pb-8 pt-28 text-ink-foreground">
            <div ref={introRef} className="max-w-xl">
              <p className="mb-4 inline-block rounded-full border border-primary/40 bg-ink/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary backdrop-blur">
                Dukaan ka hisaab, automatic
              </p>
              <h1 className="text-5xl font-bold leading-[1.02] md:text-7xl">
                Snap the bill.<br /><span className="text-primary">The khata</span> writes itself.
              </h1>
              <p className="mt-5 max-w-md text-base opacity-85 md:text-lg">
                Upload wholesale invoices, mandi parchis and UPI settlements. We extract every rupee in and out — before you pull down the shutter.
              </p>
              <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="font-semibold"><Upload /> Drop Your First PDF Bill</Button>
                <Button size="lg" variant="outline" onClick={replay} className="border-ink-foreground/40 bg-ink/30 text-ink-foreground backdrop-blur hover:bg-ink/50 hover:text-ink-foreground">
                  <Play /> Watch 3D Shutter Demo
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div key={stage} className="max-w-sm animate-in fade-in slide-in-from-bottom-4 rounded-xl border border-ink-foreground/15 bg-ink/60 p-5 backdrop-blur-md duration-500">
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{String(stage + 1).padStart(2, "0")} · {st.tag}</div>
                <div className="mt-1 font-display text-2xl font-bold">{st.title}</div>
                <p className="mt-1 text-sm opacity-80">{st.body}</p>
              </div>
              <div className={`grid grid-cols-2 gap-3 transition-all duration-700 ${stage >= 3 ? "opacity-100" : "translate-y-6 opacity-0"}`}>
                <Metric label="Money Spent · today" value="₹18,420" sub="6 supplier bills · 2 mandi receipts" tone="spent" />
                <Metric label="Money Received · today" value="₹27,960" sub="UPI ₹21,300 · Cash ₹6,660" tone="received" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/40">
              <div ref={barRef} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
            </div>
          </div>
        </div>
      </section>

      <Sandbox />
      <Features />
      <Reviews />
      <Pricing />
      <Faq />

      <footer className="bg-ink py-10 text-ink-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-sm opacity-80">
          <span className="font-display text-lg">Kirana Khata</span>
          <span>Made for the 1.3 crore dukaans of Bharat.</span>
        </div>
      </footer>
    </main>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "spent" | "received" }) {
  return (
    <div className="rounded-xl border border-ink-foreground/15 bg-ink/55 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider opacity-75">
        <span className={`h-2 w-2 rounded-full ${tone === "spent" ? "bg-spent" : "bg-received"}`} />
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold md:text-3xl">{value}</div>
      <div className="text-xs opacity-70">{sub}</div>
    </div>
  );
}

type Row = { item: string; qty: number; rate: number; gst: number; conf: number; alert?: string };
const SPENT: { doc: { from: string; no: string; date: string; gstin: string }; rows: Row[] } = {
  doc: { from: "Shree Ganesh Distributors", no: "SGD/24-25/1187", date: "21 Oct 2026", gstin: "27AAKFS4471M1ZP" },
  rows: [
    { item: "Aashirvaad Atta 10kg", qty: 12, rate: 438, gst: 5, conf: 99 },
    { item: "Fortune Sunflower Oil 1L", qty: 24, rate: 152, gst: 5, conf: 97, alert: "+8% vs last bill" },
    { item: "Tata Salt 1kg", qty: 40, rate: 24, gst: 0, conf: 99 },
    { item: "Parle-G 800g", qty: 30, rate: 78, gst: 18, conf: 94 },
    { item: "Surf Excel 1kg", qty: 10, rate: 132, gst: 18, conf: 88, alert: "+12% vs last bill" },
  ],
};
const RECEIVED: { doc: { from: string; no: string; date: string; gstin: string }; rows: Row[] } = {
  doc: { from: "PhonePe Business Settlement", no: "SETL-88214039", date: "21 Oct 2026", gstin: "UPI · HDFC ****4410" },
  rows: [
    { item: "UPI collections (142 txns)", qty: 1, rate: 21300, gst: 0, conf: 99 },
    { item: "Cash drawer count", qty: 1, rate: 6660, gst: 0, conf: 92 },
    { item: "Udhaar repaid — Sharma ji", qty: 1, rate: 1200, gst: 0, conf: 96 },
    { item: "MDR / charges", qty: 1, rate: -42, gst: 18, conf: 98 },
  ],
};

function Sandbox() {
  const [tab, setTab] = useState<"spent" | "received">("spent");
  const data = tab === "spent" ? SPENT : RECEIVED;
  const total = data.rows.reduce((s, r) => s + r.qty * r.rate * (1 + r.gst / 100), 0);
  const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

  return (
    <section id="sandbox" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Live extraction sandbox</p>
          <h2 className="mt-2 text-4xl font-bold md:text-5xl">Bill on the left. Ledger on the right.</h2>
        </div>
        <div className="flex rounded-full border bg-card p-1">
          {(["spent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? (t === "spent" ? "bg-spent text-accent-foreground" : "bg-received text-secondary-foreground") : "text-muted-foreground"}`}
            >
              {t === "spent" ? "Money Spent · Vendor" : "Money Received · Settlements"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PDF mock */}
        <div className="relative rotate-[-0.6deg] rounded-sm bg-paper p-8 font-mono text-xs shadow-ledger">
          <div className="absolute right-4 top-4 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">PDF · via WhatsApp</div>
          <div className="border-b border-dashed pb-4">
            <div className="font-display text-lg font-bold">{data.doc.from}</div>
            <div className="text-muted-foreground">{data.doc.gstin}</div>
            <div className="mt-2 flex justify-between"><span>No. {data.doc.no}</span><span>{data.doc.date}</span></div>
          </div>
          <table className="mt-4 w-full">
            <thead className="text-muted-foreground"><tr><th className="text-left font-normal">Particulars</th><th className="text-right font-normal">Qty</th><th className="text-right font-normal">Rate</th><th className="text-right font-normal">GST</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.item} className="border-b border-dotted"><td className="py-2">{r.item}</td><td className="text-right">{r.qty}</td><td className="text-right">{r.rate}</td><td className="text-right">{r.gst}%</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between border-t-2 border-double pt-3 text-sm font-semibold"><span>Grand Total</span><span>{fmt(total)}</span></div>
          <div className="pointer-events-none absolute inset-x-6 top-1/3 h-0.5 animate-pulse bg-primary shadow-[0_0_20px_var(--primary)]" />
        </div>

        {/* Extracted */}
        <div className="ruled rounded-xl border bg-card p-6 shadow-ledger">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><ScanLine className="h-4 w-4 text-secondary" /> Extracted entries</div>
            <span className="rounded-full bg-received/15 px-2 py-0.5 font-mono text-xs text-received">{data.rows.length} lines · 1.4s</span>
          </div>
          <div className="space-y-2">
            {data.rows.map((r) => (
              <div key={r.item} className="rounded-lg border bg-paper p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.item}</span>
                  <span className={`font-mono font-semibold ${tab === "spent" ? "text-spent" : "text-received"}`}>
                    {tab === "spent" ? "−" : "+"}{fmt(r.qty * r.rate * (1 + r.gst / 100))}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <span>{r.qty} × ₹{r.rate}</span>
                  <span>GST {r.gst}%</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-12 overflow-hidden rounded bg-muted"><span className={`block h-full ${r.conf > 92 ? "bg-received" : "bg-primary"}`} style={{ width: `${r.conf}%` }} /></span>
                    {r.conf}%
                  </span>
                  {r.alert && (
                    <span className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-destructive"><AlertTriangle className="h-3 w-3" /> Margin hike {r.alert}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Posted to daybook</span>
            <span className="font-mono text-xl font-bold">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: MessageCircle, title: "Any bill, any format", body: "WhatsApp PDFs, faded thermal receipts, handwritten vouchers and mandi parchis — just forward or snap." },
  { icon: BookOpen, title: "Udhaar Khata reconciled", body: "Vendor and customer credit tallied automatically, with polite WhatsApp payment reminders sent for you." },
  { icon: Moon, title: "Nightly daybook", body: "Before the shutter comes down, get one screen: cash, UPI, purchases, and the difference to check." },
  { icon: Languages, title: "7 Indian languages", body: "Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada and Bengali — bills read and ledgers shown in yours." },
];

function Features() {
  return (
    <section id="features" className="bg-secondary py-24 text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Built for the gully, not the boardroom</p>
        <h2 className="mt-2 max-w-2xl text-4xl font-bold md:text-5xl">Street-commerce tools that respect your 14-hour day.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-secondary-foreground/15 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-secondary p-7">
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm opacity-80">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const REVIEWS = [
  { name: "Ramesh Gupta", shop: "Gupta General Store, Indore", text: "Pehle raat ko 1 ghanta hisaab mein jaata tha. Ab 5 minute. Oil ka rate badha toh turant pata chala." },
  { name: "Lakshmi Narayanan", shop: "Sri Lakshmi Stores, Madurai", text: "Tamil mein bill padh leta hai. My son set it up, now I use it myself every evening." },
  { name: "Imran Shaikh", shop: "Shaikh Kirana, Pune", text: "Udhaar wale customers ko WhatsApp reminder khud chala jaata hai. ₹38,000 recovered in two months." },
];

function Reviews() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="text-4xl font-bold md:text-5xl">Shopkeepers who closed the books early.</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="rounded-xl border bg-card p-6 shadow-ledger">
            <div className="flex gap-0.5 text-primary">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <blockquote className="mt-4 font-display text-lg leading-snug">“{r.text}”</blockquote>
            <figcaption className="mt-5 text-sm">
              <div className="flex items-center gap-1 font-semibold">{r.name} <BadgeCheck className="h-4 w-4 text-received" /></div>
              <div className="text-muted-foreground">{r.shop}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Chhota Khata", price: "₹0", note: "forever", items: ["50 bills / month", "Money in/out daybook", "1 language", "WhatsApp upload"], cta: "Start free", featured: false },
    { name: "Pura Hisaab", price: "₹499", note: "/ month", items: ["Unlimited bills & settlements", "Udhaar Khata + WhatsApp reminders", "Margin-hike alerts", "All 7 languages", "GST-ready export for your CA"], cta: "Try 30 days free", featured: true },
  ];
  return (
    <section id="pricing" className="bg-muted py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-bold md:text-5xl">Saaf hisaab. Saaf pricing.</h2>
        <p className="mt-3 text-center text-muted-foreground">No setup fee. No hidden charges. Cancel anytime.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-8 ${t.featured ? "bg-ink text-ink-foreground shadow-ledger" : "bg-card"}`}>
              <div className="font-mono text-xs uppercase tracking-widest opacity-70">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1"><span className="font-display text-5xl font-bold">{t.price}</span><span className="opacity-70">{t.note}</span></div>
              <ul className="mt-6 space-y-3 text-sm">
                {t.items.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{i}</li>)}
              </ul>
              <Button className="mt-8 w-full font-semibold" variant={t.featured ? "default" : "outline"}>{t.cta}</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Does it read handwritten bills?", a: "Yes. Clear handwritten vouchers and mandi parchis are read with a confidence score — anything uncertain is flagged for a quick check." },
  { q: "Is my shop data safe?", a: "Your bills and ledger stay private to your account and are encrypted. We never share them with distributors or anyone else." },
  { q: "Can my CA use this?", a: "On Pura Hisaab you can export a GST-ready report in one tap, or share read-only access with your accountant." },
  { q: "Do I need a computer?", a: "No. Everything works on your phone — forward a PDF on WhatsApp or take a photo of the bill." },
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-4xl font-bold md:text-5xl">Common questions</h2>
      <Accordion type="single" collapsible className="mt-8">
        {FAQS.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
