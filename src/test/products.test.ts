import { describe, expect, it, vi } from "vitest";
const insert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const result = vi.hoisted(() => ({ data: [{ id: "rice" }], error: null as null | { message: string } }));
const update = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert, update: (value: unknown) => { update(value); return { eq: () => ({ eq: () => ({ select: async () => result }) }) }; } }) } }));
import { addProduct, filterProducts, productName, setProductStock } from "@/lib/products";
const products = [{ id: "rice", name: "Rice", in_stock: true }, { id: "oil", name: "Oil", in_stock: false }];
describe("Product stock", () => {
  it("shows only available products in the in-stock filter", () => { expect(filterProducts(products, "", "in")).toEqual([products[0]]); });
  it("shows only unavailable products in the out-of-stock filter", () => { expect(filterProducts(products, "", "out")).toEqual([products[1]]); });
  it("saves the selected out-of-stock status to the account", async () => { await addProduct("shop-a", " Oil ", false); expect(insert).toHaveBeenCalledWith({ user_id: "shop-a", name: "Oil", in_stock: false }); });
  it("saves switching a product back in stock", async () => { await setProductStock("shop-a", "rice", true); expect(update).toHaveBeenCalledWith({ in_stock: true }); });
  it("rejects blank product names", () => { expect(() => productName("   ")).toThrow(); });
  it("reports a failed stock write", async () => { result.error = { message: "offline" }; await expect(setProductStock("shop-a", "rice", false)).rejects.toThrow("not saved"); result.error = null; });
});