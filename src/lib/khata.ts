import { useSyncExternalStore } from "react";

export type Cat = "Staples" | "Oils" | "Fresh" | "Snacks" | "Household" | "Dairy" | "Beverages" | "Other";
export type Kind = "spent" | "received";
export type Status = "new" | "accepted" | "corrected" | "dismissed";
export type PaidState = "paid" | "unpaid" | "partial";
export type Item = { name: string; qty: number; rate: number; gst: number; cat: Cat; hike?: string };
export type Receipt = {
  id: string;
  vendor: string;
  date: string; // ISO yyyy-mm-dd
  source: string;
  payment: string;
  paymentDetails?: string;
  kind: Kind;
  conf: number;
  items: Item[];
  status: Status;
  dupOf?: string | undefined;
  paidState?: PaidState;
};

export const CATS: Cat[] = ["Staples", "Oils", "Fresh", "Snacks", "Household", "Dairy", "Beverages", "Other"];
export const MONTH = "2026-10";
export const MONTH_LABEL = "October 2026";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function dateLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? "?"} ${iso.slice(0, 4)}`;
}

export function totalOf(r: Receipt) {
  return r.items.reduce((s, it) => s + it.qty * it.rate * (1 + it.gst / 100), 0);
}

const SEED: Receipt[] = [
  {
    id: "R-101", vendor: "Shree Ganesh Distributors", date: "2026-10-21", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 97, status: "accepted",
    items: [
      { name: "Aashirvaad Atta 10kg", qty: 12, rate: 438, gst: 5, cat: "Staples" },
      { name: "Fortune Sunflower Oil 1L", qty: 24, rate: 152, gst: 5, cat: "Oils" },
      { name: "Tata Salt 1kg", qty: 40, rate: 24, gst: 0, cat: "Staples" },
      { name: "Parle-G 800g", qty: 30, rate: 78, gst: 18, cat: "Snacks" },
      { name: "Surf Excel 1kg", qty: 10, rate: 132, gst: 18, cat: "Household", hike: "+12% vs last bill" },
    ],
  },
  {
    id: "R-102", vendor: "Ravi Mandi", date: "2026-10-21", source: "Photo of paper bill", payment: "Cash", kind: "spent", conf: 88, status: "new",
    items: [
      { name: "Onion", qty: 40, rate: 32, gst: 0, cat: "Fresh" },
      { name: "Potato", qty: 30, rate: 28, gst: 0, cat: "Fresh" },
      { name: "Tomato", qty: 18, rate: 46, gst: 0, cat: "Fresh" },
      { name: "Green chilli", qty: 3, rate: 90, gst: 0, cat: "Fresh" },
    ],
  },
  {
    id: "R-103", vendor: "Bharat Distributors", date: "2026-10-20", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 96, status: "accepted",
    items: [
      { name: "Maggi 200g", qty: 48, rate: 118, gst: 18, cat: "Snacks" },
      { name: "Kissan Tomato Ketchup 1kg", qty: 12, rate: 138, gst: 12, cat: "Household" },
      { name: "Vim bar", qty: 12, rate: 20, gst: 18, cat: "Household" },
    ],
  },
  {
    id: "R-104", vendor: "Sharma Dairy", date: "2026-10-20", source: "Handwritten parchi", payment: "Cash", kind: "spent", conf: 79, status: "new",
    items: [
      { name: "Milk pouch 500ml", qty: 120, rate: 28, gst: 0, cat: "Dairy" },
      { name: "Curd tub 4kg", qty: 10, rate: 92, gst: 0, cat: "Dairy" },
      { name: "Paneer block 2kg", qty: 6, rate: 180, gst: 0, cat: "Dairy" },
    ],
  },
  {
    id: "R-105", vendor: "Delhi Kirana Wholesale", date: "2026-10-19", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 95, status: "new", dupOf: "R-106",
    items: [
      { name: "Tata Salt 1kg", qty: 40, rate: 24, gst: 0, cat: "Staples" },
      { name: "Sugar 5kg", qty: 10, rate: 46, gst: 0, cat: "Staples" },
    ],
  },
  {
    id: "R-106", vendor: "Delhi Kirana Wholesale", date: "2026-10-19", source: "Photo of paper bill", payment: "Cash", kind: "spent", conf: 84, status: "new", dupOf: "R-105",
    items: [
      { name: "Tata Salt 1kg", qty: 40, rate: 24, gst: 0, cat: "Staples" },
      { name: "Sugar 5kg", qty: 10, rate: 46, gst: 0, cat: "Staples" },
    ],
  },
  {
    id: "R-107", vendor: "National Distributors", date: "2026-10-18", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 94, status: "accepted",
    items: [
      { name: "Thums Up 750ml", qty: 24, rate: 42, gst: 28, cat: "Beverages" },
      { name: "Limca 750ml", qty: 18, rate: 38, gst: 28, cat: "Beverages" },
      { name: "Bisleri 200ml", qty: 30, rate: 17, gst: 12, cat: "Beverages" },
    ],
  },
  {
    id: "R-108", vendor: "Anand Wholesale Oils", date: "2026-10-17", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 92, status: "accepted",
    items: [
      { name: "Fortune Sunflower Oil 1L", qty: 36, rate: 158, gst: 5, cat: "Oils", hike: "+8% vs last bill" },
      { name: "Saffola Gold 1L", qty: 12, rate: 168, gst: 5, cat: "Oils" },
    ],
  },
  {
    id: "R-109", vendor: "Laxmi Stationers", date: "2026-10-16", source: "Photo of paper bill", payment: "Card", kind: "spent", conf: 90, status: "accepted",
    items: [
      { name: "Notebook 200pg", qty: 24, rate: 48, gst: 12, cat: "Other" },
      { name: "Ball pen", qty: 50, rate: 8, gst: 12, cat: "Other" },
    ],
  },
  {
    id: "R-110", vendor: "Shree Ganesh Distributors", date: "2026-10-14", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 97, status: "accepted",
    items: [
      { name: "Aashirvaad Atta 10kg", qty: 12, rate: 436, gst: 5, cat: "Staples" },
      { name: "Surf Excel 1kg", qty: 10, rate: 118, gst: 18, cat: "Household" },
    ],
  },
  {
    id: "R-111", vendor: "Ravi Mandi", date: "2026-10-14", source: "Photo of paper bill", payment: "Cash", kind: "spent", conf: 86, status: "accepted",
    items: [
      { name: "Onion", qty: 50, rate: 30, gst: 0, cat: "Fresh" },
      { name: "Potato", qty: 25, rate: 27, gst: 0, cat: "Fresh" },
      { name: "Banana", qty: 12, rate: 140, gst: 0, cat: "Fresh" },
    ],
  },
  {
    id: "R-112", vendor: "Madhur Canteen Supplies", date: "2026-10-12", source: "Handwritten parchi", payment: "Cash", kind: "spent", conf: 74, status: "new",
    items: [
      { name: "Sugar 10kg", qty: 20, rate: 45, gst: 0, cat: "Staples" },
      { name: "Tea powder 500g", qty: 24, rate: 180, gst: 5, cat: "Beverages" },
    ],
  },
  {
    id: "R-113", vendor: "Bharat Distributors", date: "2026-10-11", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 95, status: "accepted",
    items: [
      { name: "Parle-G 800g", qty: 30, rate: 78, gst: 18, cat: "Snacks" },
      { name: "Good Day 200g", qty: 20, rate: 92, gst: 18, cat: "Snacks" },
      { name: "Haldiram Aloo Bhujia 200g", qty: 24, rate: 52, gst: 18, cat: "Snacks" },
    ],
  },
  {
    id: "R-114", vendor: "City Gas & Household", date: "2026-10-09", source: "WhatsApp PDF", payment: "UPI", kind: "spent", conf: 93, status: "accepted",
    items: [
      { name: "Surf Excel 1kg", qty: 12, rate: 132, gst: 18, cat: "Household" },
      { name: "Harpic 500ml", qty: 24, rate: 62, gst: 18, cat: "Household" },
      { name: "Vim bar", qty: 12, rate: 20, gst: 18, cat: "Household" },
    ],
  },
  {
    id: "R-115", vendor: "Sharma Dairy", date: "2026-10-08", source: "Handwritten parchi", payment: "Cash", kind: "spent", conf: 81, status: "accepted",
    items: [
      { name: "Milk pouch 500ml", qty: 100, rate: 28, gst: 0, cat: "Dairy" },
      { name: "Curd tub 4kg", qty: 8, rate: 92, gst: 0, cat: "Dairy" },
    ],
  },
  {
    id: "R-201", vendor: "PhonePe Business Settlement", date: "2026-10-21", source: "UPI settlement", payment: "UPI", kind: "received", conf: 99, status: "accepted",
    items: [{ name: "UPI collections (142 txns)", qty: 1, rate: 21300, gst: 0, cat: "Other" }],
  },
  {
    id: "R-202", vendor: "Cash drawer count", date: "2026-10-21", source: "Nightly daybook", payment: "Cash", kind: "received", conf: 92, status: "accepted",
    items: [{ name: "Cash in drawer at closing", qty: 1, rate: 6660, gst: 0, cat: "Other" }],
  },
  {
    id: "R-203", vendor: "Udhaar repaid — Sharma ji", date: "2026-10-21", source: "WhatsApp alert", payment: "Cash", kind: "received", conf: 96, status: "accepted",
    items: [{ name: "Udhaar settled", qty: 1, rate: 1200, gst: 0, cat: "Other" }],
  },
  {
    id: "R-204", vendor: "PhonePe Business Settlement", date: "2026-10-20", source: "UPI settlement", payment: "UPI", kind: "received", conf: 99, status: "accepted",
    items: [{ name: "UPI collections (128 txns)", qty: 1, rate: 19450, gst: 0, cat: "Other" }],
  },
  {
    id: "R-205", vendor: "Google Pay settlement", date: "2026-10-20", source: "UPI settlement", payment: "UPI", kind: "received", conf: 98, status: "accepted",
    items: [{ name: "UPI collections (61 txns)", qty: 1, rate: 8620, gst: 0, cat: "Other" }],
  },
  {
    id: "R-206", vendor: "Cash drawer count", date: "2026-10-20", source: "Nightly daybook", payment: "Cash", kind: "received", conf: 90, status: "accepted",
    items: [{ name: "Cash in drawer at closing", qty: 1, rate: 7120, gst: 0, cat: "Other" }],
  },
  {
    id: "R-207", vendor: "Udhaar repaid — Gupta ji", date: "2026-10-19", source: "WhatsApp alert", payment: "Cash", kind: "received", conf: 95, status: "accepted",
    items: [{ name: "Udhaar settled", qty: 1, rate: 900, gst: 0, cat: "Other" }],
  },
];

/* ---------- tiny client store (sample data only, nothing saved) ---------- */
type State = { receipts: Receipt[] };
let state: State = { receipts: SEED.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })) };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const sub = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snap = () => state;

function setReceipts(fn: (rs: Receipt[]) => Receipt[]) {
  state = { receipts: fn(state.receipts) };
  emit();
}

export function useKhata(): Receipt[] {
  return useSyncExternalStore(sub, snap, snap).receipts;
}

export const khata = {
  accept(id: string) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, status: "accepted" } : r)));
  },
  markCorrected(id: string) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, status: "corrected" } : r)));
  },
  dismiss(id: string) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)));
  },
  patch(id: string, p: Partial<Pick<Receipt, "vendor" | "date" | "payment" | "source">>) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, ...p, status: "corrected" } : r)));
  },
  patchItem(id: string, idx: number, p: Partial<Item>) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, status: "corrected", items: r.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) } : r)));
  },
  keep(keepId: string, dropId: string) {
    setReceipts((rs) => rs.map((r) => (r.id === keepId ? { ...r, dupOf: undefined, status: "accepted" } : r.id === dropId ? { ...r, status: "dismissed" } : r)));
  },
  unflag(a: string, b: string) {
    setReceipts((rs) => rs.map((r) => (r.id === a || r.id === b ? { ...r, dupOf: undefined, status: "accepted" } : r)));
  },
  addIncoming(names: string[]): string[] {
    const ids: string[] = [];
    setReceipts((rs) => {
      const out = [...rs];
      names.forEach((n, k) => {
        const tpl = INCOMING[(rs.length + k) % INCOMING.length]!;
        const id = `R-${900 + rs.length + k}`;
        ids.push(id);
        out.unshift({ ...tpl.receipt, id, status: "new", source: n.endsWith(".pdf") ? "PDF upload" : "Photo upload", items: tpl.receipt.items.map((i) => ({ ...i })) });
      });
      return out;
    });
    return ids;
  },
  addManual(e: { vendor: string; note: string; amount: number; kind: Kind; payment: string; date: string; items?: Item[]; paymentDetails?: string }): string {
    const id = `R-${900 + state.receipts.length}`;
    setReceipts((rs) => [{
      id, vendor: e.vendor || "Without bill", date: e.date, source: "Spoken / typed, no bill", payment: e.payment, kind: e.kind, conf: 100, status: "new",
      items: e.items?.length ? e.items.map((item) => ({ ...item })) : [{ name: e.note || "Entry", qty: 1, rate: e.amount, gst: 0, cat: "Other" }],
      ...(e.paymentDetails ? { paymentDetails: e.paymentDetails } : {}),
    }, ...rs]);
    return id;
  },
  addRepeat(original: Receipt, items: Item[], date: string, payment: string): string {
    if (!items.length || items.some((i) => !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.rate) || i.rate < 0)) throw new Error("Check quantities and rates");
    const id = `R-${900 + state.receipts.length}`;
    setReceipts((rs) => [{ id, vendor: original.vendor, date, source: "Repeat order", payment, kind: original.kind, conf: 100, status: "new", items: items.map(({ hike: _hike, ...item }) => ({ ...item })) }, ...rs]);
    return id;
  },
  /** A purchase order: goods ordered from a supplier, with what has actually been paid for. */
  addPurchaseOrder(e: { vendor: string; date: string; items: Item[]; paidState: PaidState; payment: string }): string {
    if (!e.vendor.trim()) throw new Error("Say which supplier");
    if (!e.items.length || e.items.some((i) => !i.name.trim() || !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.rate) || i.rate < 0)) throw new Error("Check items, quantities and rates");
    const id = `R-${900 + state.receipts.length}`;
    const payment = e.paidState === "unpaid" ? "Not paid yet" : e.payment;
    setReceipts((rs) => [{
      id, vendor: e.vendor.trim(), date: e.date, source: "Purchase order", payment,
      kind: "spent", conf: 100, status: "new", paidState: e.paidState,
      items: e.items.map((i) => ({ ...i, name: i.name.trim() })),
    }, ...rs]);
    return id;
  },
};

/* ---------- bills used by the upload screen so a demo always has something to read ---------- */
const INCOMING: { file: string; receipt: Omit<Receipt, "id" | "status" | "source"> }[] = [
  {
    file: "ganesh-oct22.pdf",
    receipt: {
      vendor: "Shree Ganesh Distributors", date: "2026-10-22", payment: "UPI", kind: "spent", conf: 96,
      items: [
        { name: "Aashirvaad Atta 10kg", qty: 15, rate: 440, gst: 5, cat: "Staples" },
        { name: "Fortune Sunflower Oil 1L", qty: 20, rate: 160, gst: 5, cat: "Oils", hike: "+5% vs last bill" },
      ],
    },
  },
  {
    file: "mandi-photo.jpg",
    receipt: {
      vendor: "Ravi Mandi", date: "2026-10-22", payment: "Cash", kind: "spent", conf: 82,
      items: [
        { name: "Tomato", qty: 20, rate: 48, gst: 0, cat: "Fresh" },
        { name: "Onion", qty: 30, rate: 34, gst: 0, cat: "Fresh" },
      ],
    },
  },
  {
    file: "dairy-parchi.jpg",
    receipt: {
      vendor: "Sharma Dairy", date: "2026-10-22", payment: "Cash", kind: "spent", conf: 76,
      items: [{ name: "Milk pouch 500ml", qty: 130, rate: 29, gst: 0, cat: "Dairy" }],
    },
  },
];

export const SAMPLE_FILES = INCOMING.map((i) => i.file);

/* ---------- roll-ups for the summary screen ---------- */
const live = (rs: Receipt[]) => rs.filter((r) => r.status !== "dismissed" && r.date.startsWith(MONTH));

export function categoryTotals(rs: Receipt[]) {
  const m = new Map<Cat, { cat: Cat; total: number; count: number; ids: string[] }>();
  live(rs).filter((r) => r.kind === "spent").forEach((r) =>
    r.items.forEach((it) => {
      const c = m.get(it.cat) ?? { cat: it.cat, total: 0, count: 0, ids: [] };
      c.total += it.qty * it.rate * (1 + it.gst / 100);
      c.count += 1;
      if (!c.ids.includes(r.id)) c.ids.push(r.id);
      m.set(it.cat, c);
    }),
  );
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function vendorTotals(rs: Receipt[]) {
  const m = new Map<string, { vendor: string; total: number; count: number; ids: string[] }>();
  live(rs).filter((r) => r.kind === "spent").forEach((r) => {
    const v = m.get(r.vendor) ?? { vendor: r.vendor, total: 0, count: 0, ids: [] };
    v.total += totalOf(r);
    v.count += 1;
    v.ids.push(r.id);
    m.set(r.vendor, v);
  });
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function daySeries(rs: Receipt[]) {
  const days = [...new Set(live(rs).map((r) => r.date))].sort();
  return days.map((d) => ({
    label: dateLabel(d).slice(0, 6),
    spent: rs.filter((r) => r.date === d && r.kind === "spent" && r.status !== "dismissed").reduce((s, r) => s + totalOf(r), 0),
    received: rs.filter((r) => r.date === d && r.kind === "received" && r.status !== "dismissed").reduce((s, r) => s + totalOf(r), 0),
  }));
}

export function monthSeries(rs: Receipt[]) {
  const months = [...new Set(rs.filter((r) => r.status !== "dismissed").map((r) => r.date.slice(0, 7)))].sort();
  return months.map((m) => ({
    label: MONTHS[Number(m.slice(5, 7)) - 1] ?? "?",
    spent: rs.filter((r) => r.status !== "dismissed" && r.date.startsWith(m) && r.kind === "spent").reduce((s, r) => s + totalOf(r), 0),
    received: rs.filter((r) => r.status !== "dismissed" && r.date.startsWith(m) && r.kind === "received").reduce((s, r) => s + totalOf(r), 0),
  }));
}

export function sums(rs: Receipt[]) {
  const l = live(rs);
  const spent = l.filter((r) => r.kind === "spent").reduce((s, r) => s + totalOf(r), 0);
  const received = l.filter((r) => r.kind === "received").reduce((s, r) => s + totalOf(r), 0);
  const online = l.filter((r) => r.kind === "received" && r.payment === "UPI").reduce((s, r) => s + totalOf(r), 0);
  const offline = received - online;
  return { spent, received, online, offline, bills: l.filter((r) => r.kind === "spent").length };
}

export function dupPairs(rs: Receipt[]) {
  const seen = new Set<string>();
  const out: [Receipt, Receipt][] = [];
  rs.filter((r) => r.dupOf && r.status !== "dismissed").forEach((a) => {
    const key = [a.id, a.dupOf].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    const b = rs.find((r) => r.id === a.dupOf && r.status !== "dismissed");
    if (b) out.push([a, b]);
  });
  return out;
}

/* ---------- plain-language answer for the ask screen, computed from the rows ---------- */
const ALIAS: Record<string, Cat> = {
  oil: "Oils", oils: "Oils", atta: "Staples", flour: "Staples", staple: "Staples", sugar: "Staples", salt: "Staples",
  biscuit: "Snacks", snack: "Snacks", maggi: "Snacks", chips: "Snacks",
  milk: "Dairy", dairy: "Dairy", paneer: "Dairy", curd: "Dairy",
  tea: "Beverages", coffee: "Beverages", drink: "Beverages", cold: "Beverages",
  soap: "Household", detergent: "Household", cleaner: "Household", surf: "Household",
  vegetable: "Fresh", sabzi: "Fresh", onion: "Fresh", potato: "Fresh", tomato: "Fresh", fruit: "Fresh",
};

export function answer(qRaw: string, rs: Receipt[]) {
  const q = qRaw.toLowerCase();
  const cites: Receipt[] = [];
  const cat = Object.keys(ALIAS).find((k) => q.includes(k)) ? ALIAS[Object.keys(ALIAS).find((k) => q.includes(k))!]! : null;
  if (cat) {
    const t = categoryTotals(rs).find((c) => c.cat === cat);
    if (t) {
      t.ids.forEach((id) => { const r = rs.find((x) => x.id === id); if (r) cites.push(r); });
      return {
        text: `You spent ${fmt(t.total)} on ${cat.toLowerCase()} across ${t.count} line item${t.count > 1 ? "s" : ""} in ${MONTH_LABEL}, from ${t.ids.length} bill${t.ids.length > 1 ? "s" : ""}.`,
        cites,
      };
    }
  }
  if (q.includes("receive") || q.includes("income") || q.includes("sale") || q.includes("collect")) {
    const s = sums(rs);
    return { text: `${MONTH_LABEL}: money in ${fmt(s.received)} (UPI ${fmt(s.online)}, cash ${fmt(s.offline)}), money out ${fmt(s.spent)}. Net ${fmt(s.received - s.spent)}.`, cites };
  }
  if (q.includes("spend") || q.includes("expense") || q.includes("bill")) {
    const s = sums(rs);
    const top = vendorTotals(rs)[0];
    return {
      text: top
        ? `${MONTH_LABEL}: ${fmt(s.spent)} spent over ${s.bills} bills. ${top.vendor} is your biggest supplier at ${fmt(top.total)} across ${top.count} bills.`
        : `No bills recorded in ${MONTH_LABEL} yet.`,
      cites: vendorTotals(rs).slice(0, 3).flatMap((v) => v.ids.map((id) => rs.find((r) => r.id === id)!)).filter(Boolean),
    };
  }
  return { text: `I can add up your bills by item or by shop. Try "How much did I spend on oil?" or "What did I collect this month?".`, cites };
}

export const SUGGESTIONS = [
  "How much did I spend on oil?",
  "What did I collect this month?",
  "Which shop costs me the most?",
  "How much did I spend on biscuits?",
];
