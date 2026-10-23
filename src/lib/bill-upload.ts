export async function validateBillFile(file: { name: string; size: number; slice: (start: number, end: number) => Blob }) {
  if (!file.size) throw new Error("This file is empty. Choose a bill photo or PDF.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const extension = file.name.toLowerCase().split(".").at(-1);
  if (!((extension === "pdf" && isPdf) || (extension === "png" && isPng) || ((extension === "jpg" || extension === "jpeg") && isJpg))) {
    throw new Error("This isn't a valid PDF, JPG or PNG. No bill was added.");
  }
}

// File validation does not prove that a document contains a transaction.
// Never substitute demo records for the contents of an uploaded file.
export async function checkBillUpload(files: Iterable<Parameters<typeof validateBillFile>[0]>) {
  const selected = Array.from(files);
  if (!selected.length) return;
  for (const file of selected) await validateBillFile(file);
  throw new Error("Photo and PDF bill reading isn't connected yet. No bill was added. Speak or type the bill details instead.");
}