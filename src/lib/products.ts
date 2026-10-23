import { supabase } from "@/integrations/supabase/client";

export type Product = { id: string; name: string; in_stock: boolean };
export type StockFilter = "all" | "in" | "out";

export function productName(value: string) {
  const name = value.trim();
  if (!name || name.length > 120) throw new Error("Enter a product name between 1 and 120 characters.");
  return name;
}

export function filterProducts(products: Product[], search: string, stock: StockFilter) {
  return products.filter((p) => p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (stock === "all" || p.in_stock === (stock === "in")));
}

export async function loadProducts(userId: string): Promise<Product[]> {
  const products: Product[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("products").select("id,name,in_stock").eq("user_id", userId)
      .order("name").order("id").range(offset, offset + 999);
    if (error) throw new Error("Could not load products. Please retry.");
    products.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return products;
  }
}

export async function addProduct(userId: string, name: string, inStock: boolean) {
  const { error } = await supabase.from("products").insert({ user_id: userId, name: productName(name), in_stock: inStock });
  if (error) throw new Error("Product was not saved. Please retry.");
}

export async function setProductStock(userId: string, id: string, inStock: boolean) {
  const { data, error } = await supabase.from("products").update({ in_stock: inStock }).eq("user_id", userId).eq("id", id).select("id");
  if (error || !data?.length) throw new Error("Stock status was not saved. Please retry.");
}