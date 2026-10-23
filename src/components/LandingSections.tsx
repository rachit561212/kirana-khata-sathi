import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SectionHead({ eyebrow, title, soft, body, dark }: { eyebrow?: string; title: string; soft?: string; body?: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className={`mb-4 text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-primary" : "text-muted-foreground"}`}>{eyebrow}</p>}
      <h2 className="font-display text-4xl font-bold leading-[1.05] md:text-6xl">
        {title}
        {soft && <span className={`block font-normal italic ${dark ? "opacity-60" : "text-muted-foreground"}`}>{soft}</span>}
      </h2>
      {body && <p className={`mx-auto mt-5 max-w-xl text-[15px] leading-relaxed ${dark ? "opacity-75" : "text-muted-foreground"}`}>{body}</p>}
    </div>
  );
}

const SOURCES = [
  { label: "WhatsApp PDF", x: 70, y: 40 },
  { label: "Thermal receipt", x: 60, y: 130 },
  { label: "Handwritten parchi", x: 70, y: 220 },
  { label: "UPI settlement", x: 830, y: 40 },
  { label: "Cash drawer", x: 840, y: 130 },
  { label: "Udhaar repayment", x: 830, y: 220 },
];

export function FlowPanel() {
  return (
    <section className="px-4 py-10 md:px-6">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-ink px-6 py-20 text-ink-foreground md:px-12">
        <SectionHead dark eyebrow="How the khata fills itself" title="One khata." soft="Every bill that comes in." body="Money out on the left, money in on the right. Everything lands in the same daybook, checked by you before it counts." />
        <div className="mx-auto mt-14 hidden max-w-4xl md:block">
          <svg viewBox="0 0 900 260" className="w-full" aria-hidden>
            {SOURCES.map((s) => {
              const left = s.x < 450;
              const sx = left ? s.x + 110 : s.x - 110;
              return <path key={s.label} d={`M ${sx} ${s.y} C ${left ? 330 : 570} ${s.y}, ${left ? 360 : 540} 130, ${left ? 390 : 510} 130`} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />;
            })}
            <rect x="390" y="105" width="120" height="50" rx="25" className="fill-primary" />
            <text x="450" y="136" textAnchor="middle" className="fill-primary-foreground font-display text-[17px] font-bold">Daybook</text>
            {SOURCES.map((s) => (
              <g key={s.label}>
                <rect x={s.x - 110} y={s.y - 17} width="220" height="34" rx="17" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.2" />
                <text x={s.x} y={s.y + 5} textAnchor="middle" fill="currentColor" className="text-[13px]">{s.label}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-sm">
          {["Upload", "Read", "Check", "Confirm", "Summarise"].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full border border-ink-foreground/20 px-4 py-1.5">{s}</span>
              {i < a.length - 1 && <ArrowRight className="h-3.5 w-3.5 opacity-50" />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ["Upload the bill", "Forward a WhatsApp PDF, drop a photo of a thermal receipt, or snap a handwritten parchi."],
  ["We read it", "Vendor, date, items, quantities, rates, GST and total are pulled into a form you can edit."],
  ["You check the unclear bits", "Faded or missing fields are marked yellow. Fix them in a tap, or accept as it is."],
  ["Duplicates are caught", "Got the same bill twice on WhatsApp? We put both side by side so you choose."],
  ["Your khata adds up", "Totals, categories and a plain-language summary, each number linked to its receipts."],
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-4xl px-6 py-24">
      <SectionHead eyebrow="How it works" title="Five steps." soft="About a minute a bill." />
      <ol className="mt-14 border-t">
        {STEPS.map(([t, b], i) => (
          <li key={t} className="grid grid-cols-[3.5rem_1fr] gap-4 border-b py-7 md:grid-cols-[5rem_16rem_1fr]">
            <span className="font-mono text-lg text-muted-foreground">0{i + 1}</span>
            <h3 className="text-lg font-bold">{t}</h3>
            <p className="col-start-2 text-[15px] leading-relaxed text-muted-foreground md:col-start-3">{b}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ROWS: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Reads photos and PDFs", true, false, false],
  ["Flags unclear fields", true, false, false],
  ["Catches duplicate bills", true, "If you remember", false],
  ["Category totals", "Automatic", "By hand at night", "Formulas you write"],
  ["Ask questions in plain words", true, false, false],
  ["Export for your CA", "CSV in one tap", "Photocopy", true],
];

function Cell({ v, strong }: { v: string | boolean; strong?: boolean }) {
  if (v === true) return <Check className={`mx-auto h-4 w-4 ${strong ? "text-received" : "text-muted-foreground"}`} aria-label="Yes" />;
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="No" />;
  return <span className={strong ? "font-semibold" : "text-muted-foreground"}>{v}</span>;
}

export function Compare() {
  return (
    <section id="compare" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHead eyebrow="Compared" title="Not another register." soft="Here's what's different." />
      <div className="mt-12 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[620px] text-center text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-4 text-left font-medium">What you need</th>
              <th className="bg-primary/15 px-5 py-4 font-bold text-foreground">Kirana Khata</th>
              <th className="px-5 py-4 font-medium">Paper bahi</th>
              <th className="px-5 py-4 font-medium">Spreadsheet</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([f, a, b, c]) => (
              <tr key={f} className="border-b last:border-0">
                <td className="px-5 py-4 text-left font-medium">{f}</td>
                <td className="bg-primary/5 px-5 py-4"><Cell v={a} strong /></td>
                <td className="px-5 py-4"><Cell v={b} /></td>
                <td className="px-5 py-4"><Cell v={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FinalCta({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-ink px-6 py-24 text-center text-ink-foreground">
        <h2 className="font-display text-5xl font-bold md:text-7xl">Close the shop.<span className="block font-normal italic opacity-60">Not the khata.</span></h2>
        <p className="mx-auto mt-5 max-w-md opacity-75">Upload tonight's bills and see your day in one screen.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="rounded-full px-7" onClick={onUpload}>Drop your first bill</Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-ink-foreground/30 bg-transparent px-7 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
            <Link to="/app">Open the app <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const COLS: [string, [string, string][]][] = [
  ["Product", [["Upload", "/app"], ["Review & edit", "/app/review"], ["Receipts", "/app/receipts"], ["Summary", "/app/summary"]]],
  ["Learn", [["How it works", "#how"], ["Compared", "#compare"], ["Questions", "#faq"]]],
  ["Shop", [["Duplicates", "/app/duplicates"], ["Ask your khata", "/app/ask"]]],
  ["Legal", [["Privacy", "#"], ["Terms", "#"]]],
];

export function SiteFooter({ extras }: { extras: React.ReactNode }) {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="font-display text-xl font-bold">Kirana Khata</div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Your shop ledger, filled in from the bills you already get.</p>
        </div>
        {COLS.map(([h, links]) => (
          <div key={h}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</div>
            <ul className="space-y-2 text-sm">
              {links.map(([l, href]) => (
                <li key={l}><a href={href} className="hover:text-primary hover:underline">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm text-muted-foreground">
          <span>© 2026 Kirana Khata, Pune</span>
          <div className="flex flex-wrap items-center gap-5">{extras}</div>
        </div>
      </div>
    </footer>
  );
}
