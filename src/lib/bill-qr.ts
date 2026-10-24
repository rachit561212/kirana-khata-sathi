export type BillQrDraft = {
  vendor: string;
  date?: string;
  items: { name: string; qty: number; rate: number; gst: number }[];
};

const object = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

/** Only explicit item data is importable. Payment links and signed invoice summaries are not itemized bills. */
export function parseBillQr(text: string, context: "supplier" | "customer" = "supplier"): BillQrDraft {
  if (text.length > 100_000) throw new Error("This QR contains too much data. No order was added.");
  if (/^\s*(https?:|upi:)/i.test(text)) {
    throw new Error("This QR is a link or payment code, not an itemized bill. Enter the order manually; no order was added.");
  }
  let decoded: unknown;
  try { decoded = JSON.parse(text); }
  catch { throw new Error("This QR does not contain readable bill items. Use the supplier’s itemized bill; no order was added."); }
  const bill = object(decoded);
  const supplier = object(bill?.["supplier"]);
  const customer = object(bill?.["customer"]);
  const vendor = context === "customer" ? customer?.["name"] ?? bill?.["customer"] ?? bill?.["vendor"] : bill?.["vendor"] ?? supplier?.["name"] ?? bill?.["supplier"];
  if (typeof vendor !== "string" || !vendor.trim() || vendor.length > 300) {
    throw new Error(`The bill QR is missing a valid ${context} name. No order was added.`);
  }
  if (!Array.isArray(bill?.["items"]) || !bill["items"].length || bill["items"].length > 200) {
    throw new Error("The bill QR must contain between 1 and 200 item lines. No order was added.");
  }
  const items = bill["items"].map((value) => {
    const item = object(value);
    const name = item?.["name"];
    const qty = item?.["qty"] ?? item?.["quantity"];
    const rate = item?.["rate"] ?? item?.["unitPrice"];
    const gst = item?.["gst"] ?? 0;
    if (typeof name !== "string" || !name.trim() || name.length > 300 ||
        typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 ||
        typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 ||
        typeof gst !== "number" || !Number.isFinite(gst) || gst < 0 || gst > 100 ||
        !Number.isFinite(qty * rate * (1 + gst / 100))) {
      throw new Error("A QR item has missing or invalid quantity, rate or GST. No order was added.");
    }
    return { name: name.trim(), qty, rate, gst };
  });
  const date = bill["date"];
  if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw new Error("The bill QR has an invalid date. No order was added.");
  }
  return { vendor: vendor.trim(), ...(typeof date === "string" ? { date } : {}), items };
}