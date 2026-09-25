export type ShopShippingMethod = "standard" | "free_over" | "local_pickup";

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
  cost: number | null;
  inventoryCount: number;
  lowStockAlertEnabled: boolean;
  lowStockThreshold: number;
  trackInventory: boolean;
  shippingPrice: number;
  freeShippingOver: number;
  pickupAvailable: boolean;
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

export interface ShopCartItem {
  productId: string;
  quantity: number;
}

export interface ShopShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ShopOrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export const MOCK_TAX_RATE = 0.06;
export const STANDARD_SHIPPING_PRICE = 5.99;
export const FREE_SHIPPING_THRESHOLD = 50;
