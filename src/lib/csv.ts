export function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => (typeof c === "number" ? String(c) : /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function deliverCsv(rows: (string | number)[][], filename: string) {
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), filename);
}
