import type { ShopProduct } from "@/src/types/shopProduct";

export function resolveShopProduct(
  productId: string | undefined | null,
  inventory: ShopProduct[],
): ShopProduct | null {
  if (!productId) return null;
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
