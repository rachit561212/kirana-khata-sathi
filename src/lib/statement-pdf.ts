import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import hindiFontUrl from "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url";
import { totalOf } from "./khata";
import type { Statement } from "./statements";

export async function createStatementPdf(statement: Statement, hindiBytes?: ArrayBuffer) {
  const doc = await PDFDocument.create();
  doc.setTitle("Hisaab transaction statement");
  doc.setAuthor("Hisaab");
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
    page.drawText("Hisaab", { x: 42, y: 795, size: 24, font: bold });
    page.drawText("Transaction statement", { x: 42, y: 772, size: 13, font: latin });
    page.drawText(`${statement.range.start} to ${statement.range.end}`, { x: 42, y: 751, size: 10, font: latin });
    y = 716;
  };
  const fontFor = (text: string): PDFFont => /[\u0900-\u097f]/.test(text) ? hindi : latin;
  const line = (text: string, size = 10) => {
    const font = fontFor(text);
    const supported = new Set(font.getCharacterSet());
    // Never silently replace unsupported characters with missing-glyph boxes.
    if ([...text].some((c) => !supported.has(c.codePointAt(0) ?? 0))) throw new Error("This statement contains text in an unsupported script. Hindi and English PDF export are currently supported.");
    let rest = text.replace(/[\r\n\t]+/g, " ");
    while (rest.length) {
      let chars = [...rest];
      let take = chars.length;
      while (take > 1 && font.widthOfTextAtSize(chars.slice(0, take).join(""), size) > 510) take--;
      if (take < chars.length) {
        const space = chars.slice(0, take).lastIndexOf(" ");
        if (space > 0) take = space;
      }
      if (y < 65) nextPage();
      page.drawText(chars.slice(0, take).join(""), { x: 42, y, size, font });
      y -= size + 6;
      rest = chars.slice(take).join("").trimStart();
    }
  };
  nextPage();
  line(`${statement.records.length} confirmed records`);
  line(`Purchases / expenses: ${amount(statement.purchases)}`);
  line(`Receipts / collections: ${amount(statement.received)}`);
  line("Purchase values may include unpaid orders; these are not bank balances.", 9);
  y -= 16;
  for (const r of statement.records) {
    if (y < 150) nextPage();
    line(`${r.date} | ${r.id} | ${r.kind === "spent" ? "Purchase / expense" : "Receipt / collection"}`, 10);
    line(r.vendor, 12);
    line(`Payment: ${r.payment}${r.paidState ? ` | ${r.paidState}` : ""}`);
    for (const item of r.items) {
      line(`${item.name} | ${item.cat}`);
      line(`  ${item.qty} x ${amount(item.rate)} | GST ${item.gst}%`, 9);
    }
    line(`Total: ${amount(totalOf(r))}`);
    y -= 18;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Hisaab | ${i + 1} / ${pages.length}`, { x: 42, y: 32, size: 9, font: latin }));
  return doc.save();
}