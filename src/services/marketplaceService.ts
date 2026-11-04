import { ApiService } from "./api";
import { marketplaceEndpoints } from "./endpoints";
import type { ShopProduct } from "@/src/types/shopProduct";
import type {
  MarketplaceFilter,
  MarketplaceListMeta,
  ProductCategory,
  ProductReview,
  ProductReviewSummary,
  ProductReviewsPage,
} from "@/src/types/marketplace";
import { normalizeShopProduct } from "@/src/utils/shopProductHelpers";

/** Every Marketplace endpoint answers `{ success, message, data }`. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response?.success && response.data != null) {
    return response.data;
  }
  throw new Error(response?.message || fallback);
}

type Raw = Record<string, any>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" ? (value as Raw) : null;
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return value != null && value !== "" && Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Paging meta; `has_more` falls back to current_page < last_page. */
export function normalizeMarketplaceMeta(
  value: unknown,
  itemCount = 0,
): MarketplaceListMeta {
  const raw = asRecord(value) ?? {};
  const current_page = toNum(raw.current_page, 1);
  const last_page = toNum(raw.last_page, current_page);
  return {
    current_page,
    per_page: toNum(raw.per_page, itemCount),
    total: toNum(raw.total, itemCount),
    last_page,
    has_more:
      typeof raw.has_more === "boolean" ? raw.has_more : current_page < last_page,
  };
}

/** `{ data: [...], meta }` page (or a plain array) → products + meta. */
function parseProductPage(data: unknown): {
  products: ShopProduct[];
  meta: MarketplaceListMeta;
} {
  const page = asRecord(data);
  const rows: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(page?.data)
      ? page!.data
      : [];
  const products = rows.map(normalizeShopProduct);
  return {
    products,
    meta: normalizeMarketplaceMeta(page?.meta, products.length),
  };
}

// ── Favourite changes → every heart / list on screen ────────────────

type FavoriteListener = (productId: string, isFavorite: boolean) => void;

const favoriteListeners = new Set<FavoriteListener>();

/** Heart toggled anywhere (catalog, product page, saved list) → keep others in sync. */
export function subscribeToFavoriteChanges(
  listener: FavoriteListener,
): () => void {
  favoriteListeners.add(listener);
  return () => {
    favoriteListeners.delete(listener);
  };
}

function publishFavoriteChange(productId: string, isFavorite: boolean): void {
  favoriteListeners.forEach((listener) => listener(productId, isFavorite));
}

// ── Catalog ─────────────────────────────────────────────────────────

/**
 * GET /api/products — Marketplace catalog (customer or guest token).
 * `category` is a category name; leave out for All. Out-of-stock comes last.
 */
export async function fetchMarketplaceProducts(params: {
  search?: string;
  category?: string;
  filter?: MarketplaceFilter;
  page?: number;
  perPage?: number;
}): Promise<{ products: ShopProduct[]; meta: MarketplaceListMeta }> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    marketplaceEndpoints.products({
      search: params.search?.trim() || undefined,
      category: params.category || undefined,
      filter: params.filter,
      page: params.page,
      per_page: params.perPage,
    }),
  );
  return parseProductPage(unwrap(response, "Failed to load products"));
}

/**
 * GET /api/product-categories. `inMarketplace` = chips for the catalog (only
 * categories with live products; put "All" first yourself). Without it = the
 * full admin list for the seller's product form.
 */
export async function fetchProductCategories(options?: {
  inMarketplace?: boolean;
}): Promise<ProductCategory[]> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    marketplaceEndpoints.categories(options?.inMarketplace),
  );
  const data = unwrap(response, "Failed to load categories");
  const rows: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data)?.data)
      ? (asRecord(data)!.data as unknown[])
      : [];
  return rows
    .map((row) => {
      const raw = asRecord(row) ?? {};
      return { id: toNum(raw.id), name: toText(raw.name) ?? "" };
    })
    .filter((c) => c.name !== "");
}

// ── Favourites (signed in) ──────────────────────────────────────────

/**
 * POST (on) / DELETE (off) /api/products/{id}/favorite. Returns the product
 * when the server sends it back. Every heart on screen is told about the change.
 */
export async function setProductFavorite(
  id: string | number,
  favorite: boolean,
): Promise<ShopProduct | null> {
  const url = marketplaceEndpoints.favorite(id);
  const response = favorite
    ? await ApiService.post<ApiEnvelope<unknown>>(url)
    : await ApiService.delete<ApiEnvelope<unknown>>(url);
  if (response && response.success === false) {
    throw new Error(response.message || "Failed to update favourite");
  }
  publishFavoriteChange(String(id), favorite);
  const data = asRecord(response?.data);
  return data && data.id != null ? normalizeShopProduct(data) : null;
}

/** GET /api/products/favorites — saved products still in the Marketplace, newest first. */
export async function fetchFavoriteProducts(params?: {
  page?: number;
  perPage?: number;
}): Promise<{ products: ShopProduct[]; meta: MarketplaceListMeta }> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    marketplaceEndpoints.favorites({
      page: params?.page,
      per_page: params?.perPage,
    }),
  );
  const page = parseProductPage(unwrap(response, "Failed to load saved products"));
  // Everything here is saved, even if the payload leaves isFavorite out
  return {
    ...page,
    products: page.products.map((p) => ({ ...p, isFavorite: true })),
  };
}

// ── Reviews ─────────────────────────────────────────────────────────

export function normalizeProductReview(value: unknown): ProductReview {
  const raw = asRecord(value) ?? {};
  const reviewer = asRecord(raw.reviewer) ?? {};
  return {
    id: toNum(raw.id),
    rating: Math.max(0, Math.min(5, toNum(raw.rating))),
    comment: toText(raw.comment),
    photoUrl: toText(raw.photoUrl),
    variantName: toText(raw.variantName),
    verifiedBuyer: raw.verifiedBuyer !== false,
    reviewer: {
      name: toText(reviewer.name) ?? "",
      imageUrl: toText(reviewer.imageUrl),
    },
    isMine: raw.isMine === true,
    ...(typeof raw.hidden === "boolean" && { hidden: raw.hidden }),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

function normalizeReviewSummary(value: unknown): ProductReviewSummary {
  const raw = asRecord(value) ?? {};
  const breakdown = asRecord(raw.breakdown) ?? {};
  const count = toNum(raw.count);
  const average = raw.average == null ? null : toNum(raw.average);
  return {
    // No reviews → null, never a 0-star rating
    average: count > 0 ? average : null,
    count,
    breakdown: {
      "1": toNum(breakdown["1"]),
      "2": toNum(breakdown["2"]),
      "3": toNum(breakdown["3"]),
      "4": toNum(breakdown["4"]),
      "5": toNum(breakdown["5"]),
    },
  };
}

/**
 * GET /api/products/{id}/reviews (guest token works). `canReview` / `myReview`
 * only come for signed-in customers (false / null otherwise).
 */
export async function fetchProductReviews(
  productId: string | number,
  params?: { page?: number; perPage?: number },
): Promise<ProductReviewsPage> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    marketplaceEndpoints.reviews(productId, {
      page: params?.page,
      per_page: params?.perPage,
    }),
  );
  const data = asRecord(unwrap(response, "Failed to load reviews")) ?? {};
  const rows: unknown[] = Array.isArray(data.data) ? data.data : [];
  const reviews = rows.map(normalizeProductReview);
  return {
    summary: normalizeReviewSummary(data.summary),
    reviews,
    meta: normalizeMarketplaceMeta(data.meta, reviews.length),
    canReview: data.canReview === true,
    myReview: asRecord(data.myReview)
      ? normalizeProductReview(data.myReview)
      : null,
  };
}

/**
 * POST /api/products/{id}/reviews (multipart). Posting again replaces the
 * customer's review. 422 when they haven't received the product yet.
 */
export async function submitProductReview(
  productId: string | number,
  body: {
    rating: number;
    comment?: string | null;
    photo?: { uri: string; name: string; type: string } | null;
    removePhoto?: boolean;
  },
): Promise<ProductReview | null> {
  const formData = new FormData();
  formData.append("rating", String(Math.round(body.rating)));
  if (body.comment != null) formData.append("comment", body.comment.trim());
  if (body.photo) {
    formData.append("photo", {
      uri: body.photo.uri,
      name: body.photo.name,
      type: body.photo.type,
    } as any);
  } else if (body.removePhoto) {
    formData.append("remove_photo", "1");
  }
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    marketplaceEndpoints.review(productId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  if (response && response.success === false) {
    throw new Error(response.message || "Failed to save review");
  }
  const data = asRecord(response?.data);
  if (!data) return null;
  // The review itself, or wrapped as { review } / { myReview }
  const review = data.rating != null ? data : asRecord(data.review) ?? asRecord(data.myReview);
  return review ? normalizeProductReview(review) : null;
}

/** DELETE /api/products/{id}/reviews — removes the customer's own review. */
export async function deleteProductReview(
  productId: string | number,
): Promise<void> {
  const response = await ApiService.delete<ApiEnvelope<unknown>>(
    marketplaceEndpoints.review(productId),
  );
  if (response && response.success === false) {
    throw new Error(response.message || "Failed to delete review");
  }
}
