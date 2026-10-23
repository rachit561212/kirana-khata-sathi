import { describe, expect, it } from "vitest";
import { statementShop } from "@/lib/statement-shop";

describe("Statement shop identity", () => {
  it("includes the saved shop name and GST number", () => {
    const shop = statementShop({ shop_name: " Sharma General Store ", gstin: "08abcde1234f1z5" });
    expect(shop.shopName).toBe("Sharma General Store");
    expect(shop.gstin).toBe("08ABCDE1234F1Z5");
  });
  it("includes saved owner, address, phone and account email", () => {
    expect(statementShop({ display_name: " Ramesh Sharma ", shop_address: " Main Bazaar, Jaipur ", phone: " 98765 43210 " }, " shop@example.com ")).toMatchObject({ ownerName: "Ramesh Sharma", address: "Main Bazaar, Jaipur", phone: "98765 43210", email: "shop@example.com" });
  });
  it("does not invent a registration number or shop identity when absent", () => {
    expect(statementShop(null)).toEqual({ shopName: "", ownerName: "", gstin: "", address: "", phone: "", email: "" });
  });
});