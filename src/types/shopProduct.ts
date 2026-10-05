export type ShopShippingMethod = "standard" | "local_pickup";

/** Salon-level delivery setting. Shipping is charged once per order. */
export type ShopDeliveryShipping = "none" | "paid" | "free";

export interface ShopDeliveryOptions {
  shipping: ShopDeliveryShipping;
  shippingPrice: number | null;
  pickupAvailable: boolean;
  configured: boolean;
  /** Owner endpoint only: ready-made "charged once per order" text. */
  note?: string;
}

export type ShopProductCategory =
  | "Hair Styling"
  | "Hair Care"
  | "Beard Care"
  | "Tools"
  | "Other";

export const SHOP_PRODUCT_CATEGORIES: ShopProductCategory[] = [
  "Hair Styling",
  "Hair Care",
  "Beard Care",
  "Tools",
  "Other",
];

export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  category: ShopProductCategory | string;
  description: string;
  imageUri: string | null;
  sellingPrice: number;
  /** Only present for the salon owner; missing for customers. */
  cost?: number | null;
  inventoryCount: number;
  lowStockAlertEnabled: boolean;
  lowStockThreshold: number;
  trackInventory: boolean;
  delivery?: ShopDeliveryOptions | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShopStockFilter = "all" | "in_stock" | "low_stock";

export function isLowStock(product: ShopProduct): boolean {
  if (!product.trackInventory) return false;
  if (!product.lowStockAlertEnabled) return false;
  return product.inventoryCount <= product.lowStockThreshold;
}

export function isInStock(product: ShopProduct): boolean {
  if (!product.trackInventory) return true;
  return product.inventoryCount > 0;
}

export function getStockFilterMatch(
  product: ShopProduct,
  filter: ShopStockFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "in_stock") return isInStock(product);
  return isLowStock(product);
}

export interface ShopShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function canShip(delivery?: ShopDeliveryOptions | null): boolean {
  return delivery?.shipping === "paid" || delivery?.shipping === "free";
}

/** Shipping charged once per order; pickup is always free. */
export function getShippingCost(
  delivery: ShopDeliveryOptions | null | undefined,
  method: ShopShippingMethod | null,
): number {
  if (method !== "standard" || delivery?.shipping !== "paid") return 0;
  return delivery.shippingPrice ?? 0;
}
