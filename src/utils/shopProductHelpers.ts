import {
  DEMO_SHOP_PRODUCT_ID,
  STATIC_DEMO_PRODUCT,
} from "@/src/constants/demoShopProduct";
import type { ShopProduct } from "@/src/types/shopProduct";

/**
 * Resolve a product for shop screens.
 * BACKEND_SWAP: fetch by API id; keep demo fallback only for local UI testing.
 */
export function resolveShopProduct(
  productId: string | undefined | null,
  inventory: ShopProduct[],
): ShopProduct | null {
  if (!productId) return null;
  if (productId === DEMO_SHOP_PRODUCT_ID) return STATIC_DEMO_PRODUCT;
  return inventory.find((p) => p.id === productId) ?? null;
}

export function createEmptyProductDraft(): Omit<
  ShopProduct,
  "id" | "createdAt" | "updatedAt" | "published"
> {
  return {
    name: "",
    brand: "",
    category: "Hair Styling",
    description: "",
    imageUri: null,
    sellingPrice: 0,
    cost: null,
    inventoryCount: 0,
    lowStockAlertEnabled: true,
    lowStockThreshold: 5,
    trackInventory: true,
    shippingPrice: 5.99,
    freeShippingOver: 50,
    pickupAvailable: true,
  };
}
