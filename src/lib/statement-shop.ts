export type StatementShop = {
  shopName: string;
  ownerName: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
};

export function statementShop(profile: { shop_name?: string | null; display_name?: string | null; gstin?: string | null; shop_address?: string | null; phone?: string | null } | null, email = ""): StatementShop {
  return {
    shopName: profile?.shop_name?.trim() || "",
    ownerName: profile?.display_name?.trim() || "",
    gstin: profile?.gstin?.trim().toUpperCase() || "",
    address: profile?.shop_address?.trim() || "",
    phone: profile?.phone?.trim() || "",
    email: email.trim(),
  };
}