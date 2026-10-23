import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Upload, MessageCircle, ScanLine, BookOpen, Moon, Languages, AlertTriangle, BadgeCheck, Pause, Play, ChevronsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MoneyCharts } from "@/components/MoneyCharts";
import { Toaster } from "@/components/ui/sonner";
import { BackToTop, CookieBanner, CopyButton, Shortcuts, SignupDialog, SiteHeader, SkipLink, UploadBox, useTheme } from "@/components/SiteChrome";

const ShopScene = lazy(() => import("@/components/ShopScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kirana Khata: upload shop bills, get your ledger" },
      { name: "description", content: "Forward supplier bills, mandi receipts and UPI settlements. Kirana Khata turns them into a daily money in and money out ledger." },
      { property: "og:title", content: "Kirana Khata: your shop ledger, filled in from your bills" },
      { property: "og:description", content: "Daily khata for kirana stores. Reads WhatsApp PDFs, thermal receipts and handwritten parchis in 7 Indian languages." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Kirana Khata" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Kirana Khata: your shop ledger, filled in from your bills" },
      { name: "twitter:description", content: "Daily khata for kirana stores, built from the bills you already get." },
    ],
  }),
  component: Index,
});

const STAGES = [
  { at: 0, rest: 0, tag: "6:00 AM", title: "Shutter's still down", body: "Scroll down to open the shop." },
  { at: 0.12, rest: 0.24, tag: "Shutter up", title: "Dukaan khul gayi", body: "Yesterday's bills are already in your khata." },
  { at: 0.26, rest: 0.36, tag: "Lights on", title: "Stock on the shelf, bills on file", body: "Each distributor invoice is matched to what you bought." },
  { at: 0.4, rest: 0.6, tag: "First customers", title: "Namaste, bhaiya!", body: "UPI and cash sales are noted as they come in." },
  { at: 0.6, rest: 0.86, tag: "Into the khata", title: "Every parchi gets an entry", body: "Each bill becomes a line in your daybook." },
  { at: 0.85, rest: 1, tag: "9:30 PM", title: "Hisaab done before closing", body: "Money in, money out and udhaar due, on one screen." },
];

function Index() {
  const [mounted, setMounted] = useState(false);
  const progress = useRef<{ current: number; reduced?: boolean }>({ current: 0 }).current;
  const heroRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [signup, setSignup] = useState(false);
  const { dark, toggle } = useTheme();
  const reducedRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("kk-motion");
    const r = saved ? saved === "reduced" : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
  }, []);
  useEffect(() => {
    reducedRef.current = reduced;
    progress.reduced = reduced;
    window.dispatchEvent(new Event("scroll"));
  }, [reduced, progress]);
  const toggleMotion = () => setReduced((r) => { localStorage.setItem("kk-motion", r ? "full" : "reduced"); return !r; });

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      let s = 0;
      STAGES.forEach((st, i) => { if (p >= st.at) s = i; });
      const r = reducedRef.current;
      progress.current = r ? STAGES[s]!.rest : p;
      if (introRef.current) {
        introRef.current.style.opacity = r ? (s === 0 ? "1" : "0") : String(Math.max(0, 1 - p * 5));
        introRef.current.style.transform = r ? "none" : `translateY(${-p * 120}px)`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${r ? (s + 1) / STAGES.length : p})`;
      setStage(s);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [progress]);

  const openUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    setTimeout(() => uploadRef.current?.click(), reduced ? 0 : 500);
  };
  const skipIntro = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  const st = STAGES[stage]!;

  return (
    <>
      <SkipLink />
      <SiteHeader dark={dark} onToggleTheme={toggle} onSignup={() => setSignup(true)} />
      <main id="main" className="min-h-screen">
        {/* HERO: scroll-driven story */}
        <section id="hero" ref={heroRef} className="relative h-[420vh] bg-dusk" aria-label="Shop story">
          <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden">
            <div className="absolute inset-0">
              {mounted && (
                <Suspense fallback={null}>
                  <ShopScene progress={progress} />
                </Suspense>
              )}
            </div>
            {reduced && <div key={`fade-${stage}`} aria-hidden className="pointer-events-none absolute inset-0 z-[5] animate-out fade-out bg-ink fill-mode-forwards duration-500" />}
            <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-6 pb-8 pt-28 text-ink-foreground">
              <div ref={introRef} className="max-w-xl">
                <h1 className="text-5xl font-bold leading-[1.02] md:text-7xl">
                  Forward the bill.<br /><span className="text-primary">Khata</span> fills itself.
                </h1>
                <p className="mt-5 max-w-md text-base opacity-85 md:text-lg">
                  Send us your wholesale invoices, mandi parchis and UPI settlements. Every rupee in and out is written up before you close the shutter.
                </p>
                <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
                  <Button size="lg" className="font-semibold" onClick={openUpload}><Upload /> Drop Your First PDF Bill</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div
                  key={stage}
                  aria-live="polite"
                  className={`max-w-sm rounded-lg border p-5 ${reduced ? "border-ink-foreground/30 bg-ink" : "animate-in fade-in slide-in-from-bottom-4 border-ink-foreground/15 bg-ink/80 duration-500"}`}
                >
                  <div className="text-sm text-primary">{stage + 1} of {STAGES.length} · {st.tag}</div>
                  <div className="mt-1 font-display text-2xl font-bold">{st.title}</div>
                  <p className="mt-1 text-[15px] leading-relaxed">{st.body}</p>
                </div>
                <div className={`grid grid-cols-2 gap-3 ${reduced ? "" : "transition-all duration-700"} ${stage >= 3 ? "opacity-100" : "translate-y-6 opacity-0"}`}>
                  <Metric label="Spent today" value="₹18,420" sub="6 supplier bills, 2 mandi receipts" tone="spent" />
                  <Metric label="Received today" value="₹27,960" sub="UPI ₹21,300 + cash ₹6,660" tone="received" />
                </div>
              </div>
              <div className="pointer-events-auto absolute right-5 top-20 flex flex-col items-end gap-2">
                {stage < STAGES.length - 1 && (
                  <button
                    onClick={skipIntro}
                    className="inline-flex items-center gap-1.5 rounded-md border border-ink-foreground/25 bg-ink/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-ink"
                  >
                    Skip intro <ChevronsDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={toggleMotion}
                  aria-pressed={reduced}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-foreground/25 bg-ink/70 px-3 py-1.5 text-xs transition hover:bg-ink"
                >
                  {reduced ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {reduced ? "Play full animation" : "Reduce motion"}
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/40">
                <div ref={barRef} className={`h-full origin-left bg-primary ${reduced ? "transition-transform duration-300" : ""}`} style={{ transform: "scaleX(0)" }} />
              </div>
            </div>
          </div>
        </section>

        <section id="upload" className="mx-auto max-w-7xl scroll-mt-20 px-6 pt-24">
          <h2 className="text-3xl font-bold md:text-4xl">Try it with one of your bills</h2>
          <p className="mb-8 mt-2 text-muted-foreground">Nothing is saved yet. This is just to show you how it feels.</p>
          <UploadBox inputRef={uploadRef} />
        </section>

        <Sandbox />
        <MoneyCharts />
        <Features />
        <Reviews />
        <Faq />
      </main>

      <footer className="bg-ink py-10 text-ink-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-sm">
          <span className="font-display text-lg">Kirana Khata</span>
          <div className="flex flex-wrap items-center gap-5 opacity-90">
            <Shortcuts onUpload={openUpload} onTheme={toggle} onSkip={skipIntro} />
            <button onClick={toggleMotion} className="opacity-80 hover:opacity-100">{reduced ? "Full motion" : "Reduce motion"}</button>
            <span className="opacity-70">© 2026 Kirana Khata, Pune</span>
          </div>
        </div>
      </footer>

      <SignupDialog open={signup} onOpenChange={setSignup} />
      <BackToTop />
      <CookieBanner />
      <Toaster position="top-center" />
    </>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "spent" | "received" }) {
  return (
    <div className="rounded-lg border border-ink-foreground/15 bg-ink/85 p-4">
      <div className="flex items-center gap-2 text-xs opacity-80">
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
    { item: "Udhaar repaid, Sharma ji", qty: 1, rate: 1200, gst: 0, conf: 96 },
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
          <h2 className="text-4xl font-bold md:text-5xl">What a bill looks like after we read it</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">A sample distributor invoice, and the entries it turns into.</p>
        </div>
        <div className="flex rounded-lg border bg-card p-1">
          {(["spent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${tab === t ? (t === "spent" ? "bg-spent text-accent-foreground" : "bg-received text-secondary-foreground") : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {t === "spent" ? "Money spent" : "Money received"}
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
        </div>

        {/* Extracted */}
        <div className="ruled rounded-lg border bg-card p-6 shadow-ledger">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><ScanLine className="h-4 w-4 text-secondary" /> Entries for your khata</div>
            <CopyButton label="Copy entries" text={data.rows.map((r) => `${r.item}\t${r.qty}\t${r.rate}\t${r.gst}%`).join("\n")} />
          </div>
          <div className="space-y-2">
            {data.rows.map((r) => (
              <div key={r.item} className="rounded-md border bg-paper p-3 transition hover:border-foreground/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.item}</span>
                  <span className={`font-mono font-semibold ${tab === "spent" ? "text-spent" : "text-received"}`}>
                    {tab === "spent" ? "−" : "+"}{fmt(r.qty * r.rate * (1 + r.gst / 100))}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{r.qty} × ₹{r.rate}</span>
                  <span>GST {r.gst}%</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-12 overflow-hidden rounded bg-muted"><span className={`block h-full ${r.conf > 92 ? "bg-received" : "bg-primary"}`} style={{ width: `${r.conf}%` }} /></span>
                    {r.conf}%
                  </span>
                  {r.alert && (
                    <span className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-destructive"><AlertTriangle className="h-3 w-3" /> Price up {r.alert.replace("+", "").replace(" vs last bill", "")} since last bill</span>
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
  { icon: MessageCircle, title: "Any bill, any format", body: "WhatsApp PDFs, faded thermal receipts, handwritten vouchers, mandi parchis. Forward it or take a photo." },
  { icon: BookOpen, title: "Udhaar khata", body: "See who owes you and whom you owe. Payment reminders go out on WhatsApp in your name." },
  { icon: Moon, title: "Nightly daybook", body: "At closing time, one screen: cash, UPI, purchases, and anything that doesn't add up." },
  { icon: Languages, title: "7 Indian languages", body: "Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada and Bengali. Bills in any of them, khata in yours." },
];

function Features() {
  return (
    <section id="features" className="bg-secondary py-24 text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="max-w-2xl text-4xl font-bold md:text-5xl">What it does for your shop</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg bg-secondary-foreground/15 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-secondary p-7 transition hover:bg-secondary-foreground/5">
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed opacity-85">{f.body}</p>
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
      <h2 className="text-4xl font-bold md:text-5xl">From shops already using it</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="rounded-lg border bg-card p-6">
            <blockquote className=" font-display text-lg leading-snug">“{r.text}”</blockquote>
            <figcaption className="mt-5 text-sm">
              <div className="flex items-center gap-1 font-semibold">{r.name} <BadgeCheck aria-label="Verified shop" className="h-4 w-4 text-received" /></div>
              <div className="text-muted-foreground">{r.shop}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Does it read handwritten bills?", a: "Yes. Clear handwritten vouchers and mandi parchis are read with a confidence score. Anything uncertain is flagged for a quick check." },
  { q: "Is my shop data safe?", a: "Your bills and ledger stay private to your account and are encrypted. We never share them with distributors or anyone else." },
  { q: "Can my CA use this?", a: "Yes. Export a GST-ready report in one tap, or share read-only access with your accountant." },
  { q: "Do I need a computer?", a: "No. Everything works on your phone. Forward a PDF on WhatsApp or take a photo of the bill." },
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
