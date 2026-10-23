import { z } from "zod";

// language is only a hint ("auto" or "" when unknown) — the description itself may be in any language.
export const entryInputSchema = z.object({ description: z.string().trim().min(3).max(3000), language: z.string().trim().max(35) });
const field = z.enum(["vendor", "items", "amount", "payment", "kind", "stockMovement"]);
export const transactionSchema = z.object({
  vendor: z.string().max(200).nullable(),
  items: z.array(z.object({ name: z.string().min(1).max(200), quantity: z.number().positive().nullable(), lineAmount: z.number().nonnegative().nullable() })).max(30),
  amount: z.number().positive().nullable(),
  payment: z.enum(["Cash", "UPI", "Card", "Bank transfer", "Credit", "Other"]).nullable(),
  paymentDetails: z.string().max(300).nullable(),
  kind: z.enum(["spent", "received"]).nullable(),
  stockMovement: z.enum(["purchase", "sale", "none"]).nullable().optional(),
  uncertainties: z.array(z.object({ field, reason: z.string().min(1).max(300) })).max(20),
});
export type TransactionDraft = z.infer<typeof transactionSchema>;
export type EntryField = z.infer<typeof field>;

// Missing data must remain visible even when the model omits a warning.
export function normalizeTransaction(input: unknown): TransactionDraft {
  const draft = transactionSchema.parse(input);
  const warn = (field: EntryField, reason: string) => {
    if (!draft.uncertainties.some((u) => u.field === field)) draft.uncertainties.push({ field, reason });
  };
  if (!draft.vendor?.trim()) { draft.vendor = null; warn("vendor", "किसको / किससे? · Person or shop missing"); }
  if (!draft.amount) warn("amount", "रकम जाँचें · Amount missing");
  if (!draft.payment) warn("payment", "भुगतान कैसे हुआ? · Payment method missing");
  if (!draft.kind) warn("kind", "दिए या मिले? · Paid or received unclear");
  if (draft.items.length && !draft.stockMovement) warn("stockMovement", "खरीद या बिक्री? · Check whether goods came in or went out");
  if (!draft.items.length || draft.items.some((i) => i.quantity === null || i.lineAmount === null)) warn("items", "सामान / मात्रा / कीमत जाँचें · Item details incomplete");
  const complete = draft.items.length > 0 && draft.items.every((i) => i.lineAmount !== null);
  const sum = draft.items.reduce((s, i) => s + (i.lineAmount ?? 0), 0);
  if (complete && draft.amount !== null && Math.abs(sum - draft.amount) > 0.01) warn("amount", "जोड़ अलग है · Item amounts do not match the total");
  return draft;
}

export const transactionJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    vendor: { type: ["string", "null"] },
    items: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, quantity: { type: ["number", "null"] }, lineAmount: { type: ["number", "null"] } }, required: ["name", "quantity", "lineAmount"] } },
    amount: { type: ["number", "null"] },
    payment: { type: ["string", "null"], enum: ["Cash", "UPI", "Card", "Bank transfer", "Credit", "Other", null] },
    paymentDetails: { type: ["string", "null"] },
    kind: { type: ["string", "null"], enum: ["spent", "received", null] },
    stockMovement: { type: ["string", "null"], enum: ["purchase", "sale", "none", null] },
    uncertainties: { type: "array", items: { type: "object", additionalProperties: false, properties: { field: { type: "string", enum: ["vendor", "items", "amount", "payment", "kind", "stockMovement"] }, reason: { type: "string" } }, required: ["field", "reason"] } },
  }, required: ["vendor", "items", "amount", "payment", "paymentDetails", "kind", "stockMovement", "uncertainties"],
};