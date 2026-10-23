import { createFileRoute } from "@tanstack/react-router";
import { SupplierPages } from "@/components/SupplierPages";
export const Route = createFileRoute("/app/suppliers")({
  head: () => ({ meta: [
    { title: "Suppliers — Hisaab" },
    { name: "description", content: "Your suppliers and their linked purchase bills in Hisaab." },
    { property: "og:title", content: "Suppliers — Hisaab" },
    { property: "og:description", content: "View purchases grouped by supplier." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SupplierPages,
});