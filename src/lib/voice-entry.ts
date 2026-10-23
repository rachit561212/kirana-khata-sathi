/** Reads a spoken or typed note like "रमेश को 500 रुपये दिए UPI से" into a ledger entry draft. */
export type EntryDraft = { amount: number | null; kind: "spent" | "received"; payment: "Cash" | "UPI" };

const DEVANAGARI = "०१२३४५६७८९";

export function parseEntry(text: string): EntryDraft {
  const t = text.replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d))).toLowerCase();
  const m = t.replace(/,/g, "").match(/\d+(\.\d+)?/);
  const received = /(मिले|मिला|लिए|प्राप्त|आए|received|got|jama|जमा)/.test(t);
  const upi = /(upi|यूपीआई|phonepe|paytm|gpay|online|ऑनलाइन|फोनपे|पेटीएम)/.test(t);
  return { amount: m ? Number(m[0]) : null, kind: received ? "received" : "spent", payment: upi ? "UPI" : "Cash" };
}
