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

/**
 * Offline fallback only: the real list comes from GET /api/product-categories
 * (fetchProductCategories in marketplaceService).
 */
export const SHOP_PRODUCT_CATEGORIES: ShopProductCategory[] = [
  "Hair Styling",
  "Hair Care",
  "Beard Care",
  "Tools",
  "Other",
];

/** Gallery photo (main image first). */
export interface ShopProductImage {
  id: number;
  url: string;
}

/** Option (colour / model) with its own stock and optional own price. */
export interface ShopProductVariant {
  id: number;
  name: string;
  /** Own regular price; null = follows the product's price. */
  sellingPrice: number | null;
  salePrice: number | null;
  /** What the buyer pays for one. */
  price: number;
  onSale: boolean;
  hasOwnPrice: boolean;
  inventoryCount: number;
  inStock: boolean;
  images: ShopProductImage[];
}

/** Selling business (open its profile with `id`). */
export interface ShopSeller {
  id: number;
  name: string;
  imageUrl: string | null;
}

/** `average` null = no reviews → "No reviews yet", never 0 stars. */
export interface ShopRating {
  average: number | null;
  count: number;
}

/** Owner only: FreshPass admin moderation of a Marketplace product. */
export interface ShopProductModeration {
  status: "active" | "flagged" | "removed";
  note: string | null;
  featuredBlocked: boolean;
}

export interface ShopProduct {
  id: string;
  /** Owning business — lets customer mode block buying your own product */
  business_id?: number | null;
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
  /** false = the business has no Stripe Connect, so it can't sell in the app */
  paymentsEnabled?: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;

  // ── Marketplace fields (older payloads may lack them; see normalizeShopProduct)
  /** Set when on sale; show `sellingPrice` crossed out. */
  salePrice?: number | null;
  /** What the buyer pays for one (salePrice ?? sellingPrice). */
  price?: number;
  onSale?: boolean;
  /** false → "Out of stock", no add to cart. */
  inStock?: boolean;
  benefits?: string[];
  /** Up to 4, main image first (`imageUri` is the first one). */
  images?: ShopProductImage[];
  variants?: ShopProductVariant[];
  seller?: ShopSeller | null;
  /** Signed-in customers only. */
  isFavorite?: boolean;
  rating?: ShopRating;
  /** Owner only. */
  showInMarketplace?: boolean;
  /** Owner only: seller nominated it for Featured. */
  featuredRequested?: boolean;
  /** Owner only. */
  moderation?: ShopProductModeration | null;
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
