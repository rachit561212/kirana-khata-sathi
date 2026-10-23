import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccountReceipts, saveAccountReceipts } from "@/lib/receipt-storage";
import { flushKhata, khata, refreshKhata, retryKhata, setKhataAccount, useKhataStatus, type Receipt } from "@/lib/khata";

vi.mock("@/lib/receipt-storage", () => ({ loadAccountReceipts: vi.fn(), saveAccountReceipts: vi.fn() }));
const accounts = new Map<string, Receipt[]>();
const bill: Receipt = { id: "old-bill", vendor: "Sharma Agencies", date: "2026-10-23", source: "Purchase order", payment: "Not paid yet", kind: "spent", conf: 100, status: "new", paidState: "unpaid", items: [{ name: "Rice", qty: 2, rate: 90, gst: 0, cat: "Staples" }] };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  accounts.clear();
  setKhataAccount(null);
  vi.mocked(loadAccountReceipts).mockImplementation(async (id) => structuredClone(accounts.get(id) ?? []));
  vi.mocked(saveAccountReceipts).mockImplementation(async (id, bills, insertOnly) => {
    const rows = new Map((accounts.get(id) ?? []).map((r) => [r.id, r]));
    bills.forEach((r) => { if (!insertOnly || !rows.has(r.id)) rows.set(r.id, structuredClone(r)); });
    accounts.set(id, [...rows.values()]);
  });
});

async function signIn(id: string) {
  await act(async () => { setKhataAccount(id); await new Promise((resolve) => setTimeout(resolve, 10)); });
}

describe("Account bill storage", () => {
  it("starts a new account with zero uploads and never uploads the sample bills", async () => {
    const { result } = renderHook(useKhataStatus);
    await signIn("new-account");
    expect(result.current.receipts).toEqual([]);
    expect(saveAccountReceipts).not.toHaveBeenCalled();
  });

  it("reads a saved bill after a fresh device session without browser storage", async () => {
    const { result } = renderHook(useKhataStatus);
    await signIn("shop-a");
    let id = "";
    await act(async () => {
      id = khata.addPurchaseOrder({ vendor: "Sharma Agencies", date: "2026-10-23", items: bill.items, paidState: "unpaid", payment: "UPI" });
      await flushKhata();
    });
    act(() => { setKhataAccount(null); sessionStorage.clear(); });
    await signIn("shop-a");
    expect(result.current.receipts).toHaveLength(1);
    expect(result.current.receipts[0]).toMatchObject({ id, vendor: "Sharma Agencies", paidState: "unpaid", items: [{ name: "Rice", qty: 2, rate: 90 }] });
  });

  it("keeps account A bills out of account B", async () => {
    accounts.set("shop-a", [bill]);
    const { result } = renderHook(useKhataStatus);
    await signIn("shop-a");
    expect(result.current.receipts[0]?.id).toBe("old-bill");
    await signIn("shop-b");
    expect(result.current.receipts).toEqual([]);
    expect(loadAccountReceipts).toHaveBeenLastCalledWith("shop-b");
  });

  it("moves old tab bills once without overwriting a newer cloud copy", async () => {
    accounts.set("shop-a", [{ ...bill, vendor: "New cloud name" }]);
    sessionStorage.setItem("hisaab-receipts-shop-a", JSON.stringify([bill, { ...bill, id: "tab-only" }]));
    const { result } = renderHook(useKhataStatus);
    await signIn("shop-a");
    expect(result.current.receipts).toHaveLength(2);
    expect(result.current.receipts.find((r) => r.id === "old-bill")?.vendor).toBe("New cloud name");
    expect(sessionStorage.getItem("hisaab-receipts-shop-a")).toBeNull();
    expect(saveAccountReceipts).toHaveBeenCalledWith("shop-a", [expect.objectContaining({ id: "tab-only" })], true);
  });

  it("reports failed saves and lets the same bill retry without disappearing", async () => {
    const { result } = renderHook(useKhataStatus);
    await signIn("shop-a");
    vi.mocked(saveAccountReceipts).mockRejectedValueOnce(new Error("Offline"));
    await act(async () => {
      khata.addManual({ vendor: "Ram", note: "Sugar", amount: 90, date: "2026-10-23", payment: "UPI", kind: "spent" });
      await expect(flushKhata()).rejects.toThrow("Offline");
    });
    expect(result.current.error).toBe("Offline");
    expect(result.current.receipts).toHaveLength(1);
    await act(async () => { retryKhata(); await flushKhata(); });
    expect(accounts.get("shop-a")).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("ignores a previous account's delayed load", async () => {
    let finish: (rows: Receipt[]) => void = () => {};
    vi.mocked(loadAccountReceipts).mockImplementation(async (id) => id === "slow-a" ? new Promise<Receipt[]>((resolve) => { finish = resolve; }) : []);
    const { result } = renderHook(useKhataStatus);
    act(() => { setKhataAccount("slow-a"); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    await signIn("shop-b");
    await act(async () => { finish([bill]); });
    expect(result.current.receipts).toEqual([]);
  });

  it("saves reviewed vendor and all item edits in one bill write", async () => {
    accounts.set("shop-a", [bill]);
    await signIn("shop-a");
    await act(async () => {
      khata.saveReview("old-bill", { vendor: "Reviewed supplier", date: "2026-10-24", payment: "Cash", items: [{ ...bill.items[0], name: "Rice", qty: 5, rate: 100, gst: 0, cat: "Staples" }] });
      await flushKhata();
    });
    expect(saveAccountReceipts).toHaveBeenCalledTimes(1);
    expect(accounts.get("shop-a")?.[0]).toMatchObject({ vendor: "Reviewed supplier", status: "corrected", items: [{ qty: 5, rate: 100 }] });
  });

  it("uses different bill IDs for independent devices", async () => {
    await signIn("shop-a");
    let a = "", b = "";
    await act(async () => {
      a = khata.addManual({ vendor: "Ram", note: "Sugar", amount: 90, date: "2026-10-23", payment: "UPI", kind: "spent" });
      await flushKhata();
    });
    await act(async () => { await refreshKhata(); });
    await act(async () => {
      b = khata.addManual({ vendor: "Ram", note: "Sugar", amount: 90, date: "2026-10-23", payment: "UPI", kind: "spent" });
      await flushKhata();
    });
    expect(a).not.toBe(b);
    expect(accounts.get("shop-a")).toHaveLength(2);
  });
});