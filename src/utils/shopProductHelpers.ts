import type { TFunction } from "i18next";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type {
  ShopDeliveryOptions,
  ShopProduct,
  ShopProductImage,
  ShopProductModeration,
  ShopProductVariant,
  ShopRating,
  ShopSeller,
} from "@/src/types/shopProduct";
import type {
  ProductDraftVariant,
  ProductFormDraft,
} from "@/src/components/productFormScreen";

/** New product: Marketplace switch OFF by default (guide §1). */
export function createEmptyProductDraft(): ProductFormDraft {
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
    salePrice: null,
    benefits: [],
    showInMarketplace: false,
    featuredRequested: false,
    images: [],
    removedImageIds: [],
  };
}

export interface DeliveryLine {
  icon: "local-shipping" | "storefront";
  label: string;
}

/** Lines describing the salon's delivery, e.g. "Shipping $7.50 per order", "Pickup at the salon". */
export function describeDelivery(
  delivery: ShopDeliveryOptions | null | undefined,
  t: TFunction,
): DeliveryLine[] {
  if (!delivery?.configured) return [];
  const lines: DeliveryLine[] = [];
  if (delivery.shipping === "paid") {
    lines.push({
      icon: "local-shipping",
      label: t("shippingPerOrder", {
        amount: formatShopPrice(delivery.shippingPrice ?? 0),
      }),
    });
  } else if (delivery.shipping === "free") {
    lines.push({ icon: "local-shipping", label: t("freeShipping") });
  }
  if (delivery.pickupAvailable) {
    lines.push({ icon: "storefront", label: t("pickupAtSalon") });
  }
  return lines;
}

// ── Normalizing product payloads ────────────────────────────────────
// Older payloads (persisted inventory, reel feed before the Marketplace)
// lack the Marketplace fields; fill them so screens never branch on undefined.

/** Most a single cart line / checkout item can hold (backend rule). */
export const MAX_PRODUCT_QUANTITY = 99;

type Raw = Record<string, any>;

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return value != null && value !== "" && Number.isFinite(n) ? n : fallback;
}

function toNullableNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizeImages(value: unknown): ShopProductImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any, index: number): ShopProductImage | null => {
      if (typeof item === "string") return item ? { id: index, url: item } : null;
      const url = toStr(item?.url);
      return url ? { id: toNum(item?.id, index), url } : null;
    })
    .filter((img): img is ShopProductImage => img !== null);
}

function normalizeVariant(
  value: unknown,
  product: { sellingPrice: number; salePrice: number | null; trackInventory: boolean },
): ShopProductVariant {
  const raw = (value && typeof value === "object" ? value : {}) as Raw;
  const sellingPrice = toNullableNum(raw.sellingPrice);
  const salePrice = toNullableNum(raw.salePrice);
  const hasOwnPrice =
    typeof raw.hasOwnPrice === "boolean" ? raw.hasOwnPrice : sellingPrice != null;
  // A variant without its own price follows the product's sale price
  const fallbackPrice = hasOwnPrice
    ? (salePrice ?? sellingPrice ?? product.sellingPrice)
    : (product.salePrice ?? product.sellingPrice);
  const inventoryCount = toNum(raw.inventoryCount);
  return {
    id: toNum(raw.id),
    name: toStr(raw.name) ?? "",
    sellingPrice,
    salePrice,
    price: toNum(raw.price, fallbackPrice),
    onSale:
      typeof raw.onSale === "boolean"
        ? raw.onSale
        : hasOwnPrice
          ? salePrice != null
          : product.salePrice != null,
    hasOwnPrice,
    inventoryCount,
    inStock:
      typeof raw.inStock === "boolean"
        ? raw.inStock
        : !product.trackInventory || inventoryCount > 0,
    images: normalizeImages(raw.images),
  };
}

function normalizeSeller(value: unknown): ShopSeller | null {
  const raw = value && typeof value === "object" ? (value as Raw) : null;
  if (!raw || raw.id == null) return null;
  return {
    id: toNum(raw.id),
    name: toStr(raw.name) ?? "",
    imageUrl: toStr(raw.imageUrl),
  };
}

function normalizeRating(value: unknown): ShopRating {
  const raw = value && typeof value === "object" ? (value as Raw) : {};
  const count = toNum(raw.count);
  const average = toNullableNum(raw.average);
  // No reviews → null, never a 0-star rating
  return { average: count > 0 ? average : null, count };
}

function normalizeModeration(value: unknown): ShopProductModeration | null {
  const raw = value && typeof value === "object" ? (value as Raw) : null;
  if (!raw) return null;
  return {
    status:
      raw.status === "flagged" || raw.status === "removed" ? raw.status : "active",
    note: toStr(raw.note),
    featuredBlocked: raw.featuredBlocked === true,
  };
}

/** Product from any endpoint (owner, customer, catalog, reel feed) with every field filled. */
export function normalizeShopProduct(raw: any): ShopProduct {
  const src = (raw && typeof raw === "object" ? raw : {}) as Raw;
  const sellingPrice = toNum(src.sellingPrice);
  const salePrice = toNullableNum(src.salePrice);
  const trackInventory =
    typeof src.trackInventory === "boolean" ? src.trackInventory : true;
  const inventoryCount = toNum(src.inventoryCount);
  let images = normalizeImages(src.images);
  const imageUri = toStr(src.imageUri) ?? images[0]?.url ?? null;
  if (images.length === 0 && imageUri) images = [{ id: 0, url: imageUri }];
  const variants = Array.isArray(src.variants)
    ? src.variants.map((v: unknown) =>
        normalizeVariant(v, { sellingPrice, salePrice, trackInventory }),
      )
    : [];
  const benefits = Array.isArray(src.benefits)
    ? src.benefits.filter(
        (b: unknown): b is string => typeof b === "string" && b.trim() !== "",
      )
    : [];

  return {
    ...(src as ShopProduct),
    id: src.id == null ? "" : String(src.id),
    name: toStr(src.name) ?? "",
    brand: typeof src.brand === "string" ? src.brand : "",
    category: typeof src.category === "string" ? src.category : "",
    description: typeof src.description === "string" ? src.description : "",
    imageUri,
    sellingPrice,
    inventoryCount,
    lowStockAlertEnabled: src.lowStockAlertEnabled === true,
    lowStockThreshold: toNum(src.lowStockThreshold),
    trackInventory,
    published: src.published !== false,
    createdAt: typeof src.createdAt === "string" ? src.createdAt : "",
    updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : "",
    salePrice,
    price: toNum(src.price, salePrice ?? sellingPrice),
    onSale: typeof src.onSale === "boolean" ? src.onSale : salePrice != null,
    inStock:
      typeof src.inStock === "boolean"
        ? src.inStock
        : variants.length > 0
          ? variants.some((v: ShopProductVariant) => v.inStock)
          : !trackInventory || inventoryCount > 0,
    benefits,
    images,
    variants,
    seller: normalizeSeller(src.seller),
    isFavorite: src.isFavorite === true,
    rating: normalizeRating(src.rating),
    showInMarketplace:
      typeof src.showInMarketplace === "boolean"
        ? src.showInMarketplace
        : undefined,
    featuredRequested:
      typeof src.featuredRequested === "boolean"
        ? src.featuredRequested
        : undefined,
    moderation: normalizeModeration(src.moderation),
  };
}

export function productHasVariants(product: ShopProduct): boolean {
  return (product.variants?.length ?? 0) > 0;
}

export function findProductVariant(
  product: ShopProduct,
  variantId: number | null | undefined,
): ShopProductVariant | null {
  if (variantId == null) return null;
  return product.variants?.find((v) => v.id === variantId) ?? null;
}

/** Photos to show: the selected option's own photos, else the product gallery. */
export function getProductGallery(
  product: ShopProduct,
  variant?: ShopProductVariant | null,
): ShopProductImage[] {
  if (variant && variant.images.length > 0) return variant.images;
  if (product.images && product.images.length > 0) return product.images;
  return product.imageUri ? [{ id: 0, url: product.imageUri }] : [];
}

/** Price for one: what the buyer pays, the regular price, and whether it is on sale. */
export function getUnitPrice(
  product: ShopProduct,
  variant?: ShopProductVariant | null,
): { price: number; regular: number; onSale: boolean } {
  if (variant) {
    const regular = variant.sellingPrice ?? product.sellingPrice;
    return { price: variant.price, regular, onSale: variant.onSale && variant.price < regular };
  }
  const price = product.price ?? product.salePrice ?? product.sellingPrice;
  const regular = product.sellingPrice;
  return { price, regular, onSale: !!product.onSale && price < regular };
}

/**
 * Most the customer can pick: stock (capped at 99) when stock is tracked,
 * 99 otherwise, 0 when out of stock.
 */
export function getMaxQuantity(
  product: ShopProduct,
  variant?: ShopProductVariant | null,
): number {
  const inStock = variant ? variant.inStock : product.inStock !== false;
  if (!inStock) return 0;
  if (!product.trackInventory) return MAX_PRODUCT_QUANTITY;
  const stock = variant ? variant.inventoryCount : product.inventoryCount;
  return Math.max(0, Math.min(stock, MAX_PRODUCT_QUANTITY));
}

/** Can be added to the cart / bought now (an option must be chosen when it has options). */
export function isProductPurchasable(
  product: ShopProduct,
  variant?: ShopProductVariant | null,
): boolean {
  if (product.inStock === false) return false;
  if (productHasVariants(product) && !variant) return false;
  return getMaxQuantity(product, variant) > 0;
}

/**
 * Owner product → editor draft. Server images become kept draft images
 * (isNew false); `variants` stays undefined when there are none so a save
 * doesn't send `remove_variants`.
 */
export function productToFormDraft(product: ShopProduct): ProductFormDraft {
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    published: _p,
    delivery: _d,
    price: _price,
    onSale: _onSale,
    inStock: _inStock,
    seller: _seller,
    isFavorite: _fav,
    rating: _rating,
    moderation: _moderation,
    images,
    variants,
    ...rest
  } = product;
  const draftVariants: ProductDraftVariant[] | undefined =
    variants && variants.length > 0
      ? variants.map((v) => ({
          id: v.id,
          key: `v-${v.id}`,
          name: v.name,
          sellingPrice: v.sellingPrice,
          salePrice: v.salePrice,
          inventoryCount: v.inventoryCount,
          images: v.images.map((img) => ({
            id: img.id,
            uri: img.url,
            isNew: false,
          })),
          removedImageIds: [],
        }))
      : undefined;
  return {
    ...rest,
    salePrice: product.salePrice ?? null,
    benefits: product.benefits ?? [],
    showInMarketplace: product.showInMarketplace === true,
    featuredRequested: product.featuredRequested === true,
    images: (images ?? []).map((img) => ({
      id: img.id,
      uri: img.url,
      isNew: false,
    })),
    removedImageIds: [],
    variants: draftVariants,
  };
}
