import { createFileRoute } from "@tanstack/react-router";
import { SupplierPages } from "@/components/SupplierPages";
export const Route = createFileRoute("/app/suppliers_/$supplier")({
  head: ({ params }) => ({ meta: [
    { title: `${params.supplier} purchases — Hisaab` },
    { name: "description", content: `Purchase bills and items from ${params.supplier} in your Hisaab account.` },
    { property: "og:title", content: `${params.supplier} purchases — Hisaab` },
    { property: "og:description", content: "Supplier purchase history and linked bills." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SupplierDetail,
});
function SupplierDetail() {
  const { supplier } = Route.useParams();
  return <SupplierPages supplierId={supplier} />;
}