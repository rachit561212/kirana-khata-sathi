import "regenerator-runtime/runtime";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import hindiFontUrl from "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url";
import { totalOf } from "./khata";
import type { Statement } from "./statements";
import type { StatementShop } from "./statement-shop";

export async function createStatementPdf(statement: Statement, hindiBytes?: ArrayBuffer, shop?: StatementShop) {
  const doc = await PDFDocument.create();
  doc.setTitle("Hisaab transaction statement");
  doc.setAuthor(shop?.shopName || "Hisaab");
  const generated = new Date();
  const reference = `HS-${statement.range.start.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  doc.setSubject(`Transaction statement ${reference}`);
  doc.setCreationDate(generated);
  doc.registerFontkit(fontkit);
  const latin = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  if (!hindiBytes) {
    const response = await fetch(hindiFontUrl);
    if (!response.ok) throw new Error("Could not load the statement font. Please try again.");
    hindiBytes = await response.arrayBuffer();
  }
  const hindi = await doc.embedFont(hindiBytes, { subset: true });
  let page: PDFPage;
  let y = 0;
  const amount = (v: number) => `INR ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const nextPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = 795;
    line(shop?.shopName || "Hisaab", 22);
    if (shop?.ownerName) line(`Owner: ${shop.ownerName}`, 10);
    if (shop?.address) line(shop.address, 10);
    if (shop?.phone) line(`Phone: ${shop.phone}`, 10);
    if (shop?.email) line(`Email: ${shop.email}`, 10);
    line(`GSTIN: ${shop?.gstin || "Not provided"}`, 10);
    y -= 8;
    line("TRANSACTION STATEMENT", 12);
    line(`Period: ${statement.range.start} to ${statement.range.end}`, 10);
    line(`Statement reference: ${reference}`, 9);
    line(`Generated: ${generated.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST`, 9);
    page.drawLine({ start: { x: 42, y: y - 3 }, end: { x: 553, y: y - 3 }, thickness: 0.6 });
    y -= 24;
  };
  const fontFor = (text: string): PDFFont => /[\u0900-\u097f]/.test(text) ? hindi : latin;
  const runs = (text: string) => text.match(/[\u0900-\u097f]+|[^\u0900-\u097f]+/g) ?? [];
  const width = (text: string, size: number) => runs(text).reduce((sum, run) => sum + fontFor(run).widthOfTextAtSize(run, size), 0);
  const line = (text: string, size = 10) => {
    // Never silently replace unsupported characters with missing-glyph boxes.
    for (const run of runs(text)) {
      const supported = new Set(fontFor(run).getCharacterSet());
      if ([...run].some((c) => !supported.has(c.codePointAt(0) ?? 0))) throw new Error("This statement contains text in an unsupported script. Hindi and English PDF export are currently supported.");
    }
    let rest = text.replace(/[\r\n\t]+/g, " ");
    while (rest.length) {
      let chars = [...rest];
      let take = chars.length;
      while (take > 1 && width(chars.slice(0, take).join(""), size) > 510) take--;
      if (take < chars.length) {
        const space = chars.slice(0, take).lastIndexOf(" ");
        if (space > 0) take = space;
      }
      if (y < 65) nextPage();
      let x = 42;
      for (const run of runs(chars.slice(0, take).join(""))) {
        const font = fontFor(run);
        page.drawText(run, { x, y, size, font });
        x += font.widthOfTextAtSize(run, size);
      }
      y -= size + 6;
      rest = chars.slice(take).join("").trimStart();
    }
  };
  nextPage();
  line(`${statement.records.length} confirmed records`);
  line(`Purchases / expenses: ${amount(statement.purchases)}`);
  line(`Receipts / collections: ${amount(statement.received)}`);
  line("Purchase values may include unpaid orders; these are not bank balances.", 9);
  line("Based on shopkeeper-confirmed Hisaab records. Not a tax invoice or bank statement.", 9);
  y -= 16;
  for (const r of statement.records) {
    const wrappedLines = (text: string, size: number) => Math.max(1, Math.ceil(width(text, size) / 490));
    const estimatedHeight = 16 + wrappedLines(r.vendor, 12) * 18 + 16
      + (r.paymentDetails ? wrappedLines(`Payment reference: ${r.paymentDetails}`, 9) * 15 : 0)
      + r.items.reduce((height, item) => height + wrappedLines(`${item.name} | ${item.cat}`, 10) * 16 + 15, 0)
      + 34;
    if (y - estimatedHeight < 65) nextPage();
    line(`${r.date} | ${r.id} | ${r.kind === "spent" ? "Purchase / expense" : "Receipt / collection"}`, 10);
    line(r.vendor, 12);
    line(`Payment: ${r.payment}${r.paidState ? ` | ${r.paidState}` : ""}`);
    if (r.paymentDetails) line(`Payment reference: ${r.paymentDetails}`, 9);
    for (const item of r.items) {
      line(`${item.name} | ${item.cat}`);
      line(`  ${item.qty} x ${amount(item.rate)} | GST ${item.gst}%`, 9);
    }
    line(`Total: ${amount(totalOf(r))}`);
    y -= 18;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Generated with Hisaab | ${reference} | Page ${i + 1} of ${pages.length}`, { x: 42, y: 32, size: 8, font: latin }));
  return doc.save();
}