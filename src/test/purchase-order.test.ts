import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, expect, it } from "vitest";
import { khata, setKhataAccount, totalOf, useKhata } from "@/lib/khata";

beforeEach(() => setKhataAccount(null));

it("saves a purchase order with what is still owed and leaves existing bills alone", () => {
  const { result } = renderHook(() => useKhata());
  const before = result.current.length;
  const originals = result.current.map((r) => ({ id: r.id, total: totalOf(r) }));
  let id = "";
  act(() => {
    id = khata.addPurchaseOrder({
      vendor: "Sharma Agencies",
      date: "2026-10-28",
      items: [
        { name: "Rice 25kg", qty: 4, rate: 1450, gst: 0, cat: "Staples" },
        { name: "Sunflower oil 1L", qty: 12, rate: 148, gst: 0, cat: "Oils" },
      ],
      paidState: "unpaid",
      payment: "UPI",
    });
  });
  const order = result.current.find((r) => r.id === id);
  if (!order) throw new Error("Missing purchase order");
  expect(order.source).toBe("Purchase order");
  expect(order.paidState).toBe("unpaid");
  expect(order.payment).toBe("Not paid yet");
  expect(order.kind).toBe("spent");
  expect(order.status).toBe("new");
  expect(totalOf(order)).toBeCloseTo(4 * 1450 + 12 * 148);
  expect(result.current.length).toBe(before + 1);
  for (const o of originals) {
    const now = result.current.find((r) => r.id === o.id);
    if (!now) throw new Error(`Record ${o.id} disappeared`);
    expect(totalOf(now)).toBeCloseTo(o.total);
  }
});

it("keeps the payment method when the order is paid, and refuses unusable lines", () => {
  const { result } = renderHook(() => useKhata());
  let id = "";
  act(() => {
    id = khata.addPurchaseOrder({ vendor: "Mehta Dairy", date: "2026-10-28", items: [{ name: "Milk 20L", qty: 20, rate: 62, gst: 0, cat: "Dairy" }], paidState: "paid", payment: "Cash" });
  });
  const order = result.current.find((r) => r.id === id);
  expect(order?.payment).toBe("Cash");
  expect(order?.paidState).toBe("paid");
  expect(() => khata.addPurchaseOrder({ vendor: "Mehta Dairy", date: "2026-10-28", items: [{ name: "Curd", qty: 0, rate: 40, gst: 0, cat: "Dairy" }], paidState: "paid", payment: "Cash" })).toThrow();
  expect(() => khata.addPurchaseOrder({ vendor: "  ", date: "2026-10-28", items: [{ name: "Curd", qty: 2, rate: 40, gst: 0, cat: "Dairy" }], paidState: "paid", payment: "Cash" })).toThrow();
});
