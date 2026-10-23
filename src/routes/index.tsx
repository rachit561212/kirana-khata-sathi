import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Upload, MessageCircle, ScanLine, BookOpen, Moon, Languages, AlertTriangle, BadgeCheck, Pause, Play, ChevronsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MoneyCharts } from "@/components/MoneyCharts";
import { Toaster } from "@/components/ui/sonner";
import { BackToTop, CookieBanner, CopyButton, Shortcuts, SignupDialog, SiteHeader, SkipLink, UploadBox, useTheme } from "@/components/SiteChrome";
import { SceneBoundary } from "@/components/SceneBoundary";
import { Compare, FinalCta, FlowPanel, HowItWorks, SectionHead, SiteFooter } from "@/components/LandingSections";

const ShopScene = lazy(() => import("@/components/ShopScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hisaab: upload shop bills, get your ledger" },
      { name: "description", content: "Forward supplier bills, mandi receipts and UPI settlements. Hisaab turns them into a daily money in and money out ledger." },
      { property: "og:title", content: "Hisaab: your shop ledger, filled in from your bills" },
      { property: "og:description", content: "Daily khata for kirana stores. Reads WhatsApp PDFs, thermal receipts and handwritten parchis in 7 Indian languages." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Hisaab" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hisaab: your shop ledger, filled in from your bills" },
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
      const total = Math.max(1, el.offsetHeight - (el.firstElementChild?.clientHeight ?? window.innerHeight));
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

  const [showScanFab, setShowScanFab] = useState(false);
  useEffect(() => {
    const upload = document.getElementById("upload");
    if (!upload) return;
    let uploadVisible = false;
    const update = () => setShowScanFab(!uploadVisible && window.scrollY > window.innerHeight * 0.6);
    const io = new IntersectionObserver((entries) => { uploadVisible = entries[0]?.isIntersecting ?? false; update(); });
    io.observe(upload);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { io.disconnect(); window.removeEventListener("scroll", update); };
  }, []);

  return (
    <>
      <SkipLink />
      <SiteHeader dark={dark} onToggleTheme={toggle} onSignup={() => setSignup(true)} />
      <main id="main" className="min-h-screen">
        {/* HERO: scroll-driven story */}
        <section id="hero" ref={heroRef} className="relative h-[420svh] bg-dusk" aria-label="Shop story">
          <div className="sticky top-0 h-[100svh] overflow-hidden md:min-h-[640px]">
            <div className="absolute inset-0">
              {mounted && (
                <SceneBoundary>
                  <Suspense fallback={null}>
                    <ShopScene progress={progress} />
                  </Suspense>
                </SceneBoundary>
              )}
            </div>
            {reduced && <div key={`fade-${stage}`} aria-hidden className="pointer-events-none absolute inset-0 z-[5] animate-out fade-out bg-ink fill-mode-forwards duration-500" />}
            <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 pb-5 pt-32 text-ink-foreground sm:px-6 sm:pb-8 md:pt-28">
              <div ref={introRef} className="max-w-xl">
                <h1 className="text-3xl font-bold leading-[1.08] sm:text-5xl md:text-7xl">
                  Bill bhejo.<br /><span className="text-primary">हिसाब</span> हो जाएगा.
                </h1>
                <p className="mt-3 max-w-md text-sm opacity-85 sm:mt-5 sm:text-base md:text-lg">
                  Bills in. Hisaab out.
                </p>
                <div className="pointer-events-auto mt-4 flex flex-wrap gap-3 sm:mt-8">
                  <Button size="lg" className="font-semibold" onClick={openUpload}><Upload /> Scan a bill</Button>
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
                <div
                  key={stage}
                  aria-live="polite"
                  className={`max-w-sm rounded-2xl border p-3 backdrop-blur-md sm:p-5 ${reduced ? "border-ink-foreground/30 bg-ink" : "animate-in fade-in slide-in-from-bottom-4 border-ink-foreground/10 bg-ink/55 duration-500"}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{stage + 1} of {STAGES.length} · {st.tag}</div>
                  <div className="mt-1.5 font-display text-xl font-bold tracking-tight sm:text-2xl">{st.title}</div>
                  <p className="mt-1 text-sm leading-relaxed opacity-85 sm:text-[15px]">{st.body}</p>
                </div>
                <div className={`grid grid-cols-2 gap-2 ${reduced ? "" : "transition-all duration-700"} ${stage >= 3 ? "opacity-100" : "hidden sm:grid sm:translate-y-6 sm:opacity-0"}`}>
                  <Metric label="Spent today" value="₹18,420" sub="6 supplier bills, 2 mandi receipts" tone="spent" />
                  <Metric label="Received today" value="₹27,960" sub="UPI ₹21,300 + cash ₹6,660" tone="received" />
                </div>
              </div>
              <div className="pointer-events-auto absolute inset-x-4 top-16 flex justify-end gap-2 sm:inset-x-auto sm:right-5 sm:top-20 sm:flex-col sm:items-end">
                {stage < STAGES.length - 1 && (
                  <Button variant="ghost"
                    onClick={skipIntro}
                    className="min-h-11 gap-1.5 rounded-md border border-ink-foreground/25 bg-ink/70 px-3 text-xs font-semibold hover:bg-ink hover:text-ink-foreground"
                  >
                    Skip intro <ChevronsDown className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost"
                  onClick={toggleMotion}
                  aria-pressed={reduced}
                  className="min-h-11 gap-1.5 rounded-md border border-ink-foreground/25 bg-ink/70 px-3 text-xs hover:bg-ink hover:text-ink-foreground"
                >
                  {reduced ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {reduced ? "Play full animation" : "Reduce motion"}
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/40">
                <div ref={barRef} className={`h-full origin-left bg-primary ${reduced ? "transition-transform duration-300" : ""}`} style={{ transform: "scaleX(0)" }} />
              </div>
            </div>
          </div>
        </section>

        <section id="upload" className="mx-auto max-w-5xl scroll-mt-20 px-6 pt-28">
          <SectionHead eyebrow="Try it" title="Drop one of your bills." soft="See how it feels." body="Nothing is saved yet. This is just to show you how it works." />
          <div className="mt-10"><UploadBox inputRef={uploadRef} /></div>
        </section>

        <FlowPanel />
        <Sandbox />
        <HowItWorks />
        <MoneyCharts />
        <Features />
        <Compare />
        <Reviews />
        <Faq />
        <FinalCta onUpload={openUpload} />
      </main>

      <SiteFooter
        extras={
          <>
            <Shortcuts onUpload={openUpload} onTheme={toggle} onSkip={skipIntro} />
            <button onClick={toggleMotion} className="hover:text-foreground">{reduced ? "Full motion" : "Reduce motion"}</button>
          </>
        }
      />

      {showScanFab && (
        <Button
          size="lg"
          onClick={openUpload}
          className="fixed bottom-5 right-5 z-40 rounded-full font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3"
        >
          <ScanLine /> Scan a bill
        </Button>
      )}
      <SignupDialog open={signup} onOpenChange={setSignup} />
      <BackToTop />
      <CookieBanner />
      <Toaster position="top-center" />
    </>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "spent" | "received" }) {
  return (
    <div className="min-w-0 rounded-lg border border-ink-foreground/15 bg-ink/85 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-xs opacity-80">
        <span className={`h-2 w-2 rounded-full ${tone === "spent" ? "bg-spent" : "bg-received"}`} />
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold sm:text-2xl md:text-3xl">{value}</div>
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
      <SectionHead eyebrow="Sample bill" title="Paper on the left." soft="Hisaab on the right." body="A sample distributor invoice, and the entries it turns into." />
      <div className="mb-10 mt-8 flex justify-center">
        <div className="flex rounded-full border bg-card p-1">
          {(["spent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === t ? (t === "spent" ? "bg-spent text-accent-foreground" : "bg-received text-secondary-foreground") : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {t === "spent" ? "Money spent" : "Money received"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PDF mock */}
        <div className="relative min-w-0 rounded-sm bg-paper p-4 pt-10 font-mono text-xs shadow-ledger sm:rotate-[-0.6deg] sm:p-8">
          <div className="absolute right-4 top-4 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">PDF · via WhatsApp</div>
          <div className="border-b border-dashed pb-4">
            <div className="font-display text-lg font-bold">{data.doc.from}</div>
            <div className="text-muted-foreground">{data.doc.gstin}</div>
            <div className="mt-2 flex flex-wrap justify-between gap-2"><span>No. {data.doc.no}</span><span>{data.doc.date}</span></div>
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
        <div className="ruled min-w-0 rounded-lg border bg-card p-4 shadow-ledger sm:p-6">
          <div className="mb-4 grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-semibold"><ScanLine className="h-4 w-4 text-secondary" /> Entries for your khata</div>
            <CopyButton label="Copy entries" text={data.rows.map((r) => `${r.item}\t${r.qty}\t${r.rate}\t${r.gst}%`).join("\n")} />
          </div>
          <div className="space-y-2">
            {data.rows.map((r) => (
              <div key={r.item} className="rounded-md border bg-paper p-3 transition hover:border-foreground/30">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="min-w-0 break-words text-sm font-medium sm:text-base">{r.item}</span>
                  <span className={`shrink-0 font-mono text-sm font-semibold sm:text-base ${tab === "spent" ? "text-spent" : "text-received"}`}>
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
    <section id="features" className="px-4 py-10 md:px-6">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-secondary px-6 py-20 text-secondary-foreground md:px-12">
        <SectionHead dark eyebrow="Built for kirana" title="Made for the counter." soft="Not for an office." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-secondary-foreground/15 md:grid-cols-2 lg:grid-cols-4">
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
      <SectionHead eyebrow="Shopkeepers" title="From shops" soft="already using it." />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="rounded-2xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-foreground/30">
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
      <SectionHead eyebrow="FAQ" title="Common questions." />
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
