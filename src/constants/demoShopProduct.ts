import type { ShopProduct } from "@/src/types/shopProduct";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_PRICE,
} from "@/src/types/shopProduct";

/**
 * BACKEND_SWAP: Replace STATIC_DEMO_PRODUCT with `reel.attached_product`
 * (or API product by id) once backend attaches inventory products to reels.
 * Search the codebase for "BACKEND_SWAP" to find all swap points.
 */
export const DEMO_SHOP_PRODUCT_ID = "demo-level3-matte-paste";

export const STATIC_DEMO_PRODUCT: ShopProduct = {
  id: DEMO_SHOP_PRODUCT_ID,
  name: "Level3 Matte Paste",
  brand: "Level3",
  category: "Hair Styling",
  description:
    "Strong hold. Matte finish. Perfect for all hair types.",
  imageUri: null,
  sellingPrice: 20,
  cost: 12,
  inventoryCount: 25,
  lowStockAlertEnabled: true,
  lowStockThreshold: 5,
  trackInventory: true,
  shippingPrice: STANDARD_SHIPPING_PRICE,
  freeShippingOver: FREE_SHIPPING_THRESHOLD,
  pickupAvailable: true,
  published: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export function formatShopPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
