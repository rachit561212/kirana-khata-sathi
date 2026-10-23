import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, expect, it } from "vitest";
import { khata, setKhataAccount, totalOf, useKhata } from "@/lib/khata";

beforeEach(() => setKhataAccount(null));

it("reorders the same products with different quantities without changing the original", () => {
  const { result } = renderHook(() => useKhata());
  const original = result.current.find((r) => r.id === "R-101");
  if (!original) throw new Error("Missing sample order");
  const originalQty = original.items[0]?.qty;
  let id = "";
  act(() => { id = khata.addRepeat(original, original.items.map((i) => ({ ...i, qty: 2 })), "2026-10-23", "UPI"); });
  const repeat = result.current.find((r) => r.id === id);
  expect(repeat?.items.map((i) => i.name)).toEqual(original.items.map((i) => i.name));
  expect(repeat?.items[0]?.qty).toBe(2);
  expect(result.current.find((r) => r.id === "R-101")?.items[0]?.qty).toBe(originalQty);
  expect(repeat?.source).toBe("Repeat order");
  if (!repeat) throw new Error("Missing repeat order");
  expect(totalOf(repeat)).toBeCloseTo(original.items.reduce((s, i) => s + 2 * i.rate * (1 + i.gst / 100), 0));
});