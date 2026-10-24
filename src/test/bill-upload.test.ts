import { describe, expect, it } from "vitest";
import { checkBillUpload, validateBillFile } from "@/lib/bill-upload";

const file = (name: string, bytes: number[]) => ({ name, size: bytes.length, slice: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }) as Blob });
describe("Wrong bill uploads", () => {
  it("rejects text disguised as a PNG", async () => {
    await expect(checkBillUpload([file("wrong-bill.png", [84, 104, 105, 115])])).rejects.toThrow("isn't a valid PDF, JPG or PNG");
  });
  it("rejects an empty file", async () => {
    await expect(validateBillFile(file("bill.pdf", []))).rejects.toThrow("empty");
  });
  it("never treats a valid image as extracted transaction details", async () => {
    await expect(checkBillUpload([file("not-a-bill.png", [137, 80, 78, 71, 13, 10, 26, 10])])).rejects.toThrow("No bill was added");
  });
});