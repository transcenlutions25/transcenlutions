import type { Metadata } from "next";
import { ProductFoundryWorkspace } from "../../components/product-foundry-workspace";
import "./foundry.css";

export const metadata: Metadata = {
  title: "Product Foundry | Tay by Transcenlutions",
  description: "Plan original products, compare suppliers, protect safety and calculate verified unit economics across Transcenlutions brands.",
};

export default function ProductFoundryPage() {
  return <ProductFoundryWorkspace />;
}
