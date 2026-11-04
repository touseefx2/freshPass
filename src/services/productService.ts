import { ApiService } from "./api";
import { productEndpoints, orderEndpoints } from "./endpoints";
import type {
  ShopDeliveryOptions,
  ShopDeliveryShipping,
  ShopProduct,
} from "@/src/types/shopProduct";
import type {
  ProductDraftImage,
  ProductFormDraft,
} from "@/src/components/productFormScreen";
import Logger from "./logger";
import { markGoldDone } from "@/src/utils/goldFrames";
import { normalizeShopProduct } from "@/src/utils/shopProductHelpers";

// Product categories for the owner form come from the server (admin list):
// fetchProductCategories() in marketplaceService. Keep sending the category
// *name* as `category`; SHOP_PRODUCT_CATEGORIES is only an offline fallback.

interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
    data: ShopProduct[];
    meta: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number | null;
      to: number | null;
      has_more: boolean;
    };
  };
}

interface ProductResponse {
  success: boolean;
  message: string;
  data: ShopProduct;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  data?: { unlinkedReels: number; cancelledCheckouts: number };
}

/** Why the server refused a delete (409). `has_links` can be retried with force. */
export type ProductDeleteBlockReason = "has_links" | "open_orders";

export class ProductDeleteBlockedError extends Error {
  reason: ProductDeleteBlockReason;
  canForce: boolean;

  constructor(message: string, reason: ProductDeleteBlockReason, canForce: boolean) {
    super(message);
    this.name = "ProductDeleteBlockedError";
    this.reason = reason;
    this.canForce = canForce;
  }
}

/**
 * Customer view of one product, fresher than `reel.product` from the feed.
 * Rejects with `status: 404` when it was deleted or unpublished.
 */
export async function fetchProduct(id: string | number): Promise<ShopProduct> {
  const response = await ApiService.get<ProductResponse>(productEndpoints.byId(id));
  if (response.success && response.data) {
    return normalizeShopProduct(response.data);
  }
  throw new Error(response.message || "Failed to fetch product");
}

export async function fetchMyProducts(params?: {
  category?: string;
  stock?: string;
  published?: string;
  page?: number;
  per_page?: number;
}): Promise<{ products: ShopProduct[]; meta: ProductListResponse["data"]["meta"] }> {
  const response = await ApiService.get<ProductListResponse>(
    productEndpoints.mine(params),
  );
  if (response.success && response.data) {
    return {
      products: (response.data.data ?? []).map(normalizeShopProduct),
      meta: response.data.meta,
    };
  }
  throw new Error(response.message || "Failed to fetch products");
}

export async function fetchProductById(
  id: string | number,
): Promise<ShopProduct> {
  const response = await ApiService.get<ProductResponse>(
    productEndpoints.mineById(id),
  );
  if (response.success && response.data) {
    return normalizeShopProduct(response.data);
  }
  throw new Error(response.message || "Failed to fetch product");
}

type ProductImageFile = { uri: string; name: string; type: string };

function toImageFile(image: ProductDraftImage, index: number): ProductImageFile {
  return {
    uri: image.uri,
    name: image.name || `product-${Date.now()}-${index}.jpg`,
    type: image.type || "image/jpeg",
  };
}

/**
 * Marketplace seller fields (guide §6 Step 1). Only fields set on the draft
 * are sent. `isUpdate` allows the "clear" forms (empty sale_price / benefits,
 * remove_image_ids, remove_variants).
 */
function appendMarketplaceFields(
  formData: FormData,
  draft: Partial<ProductFormDraft>,
  isUpdate: boolean,
): void {
  if (draft.salePrice !== undefined) {
    if (draft.salePrice != null && draft.salePrice > 0) {
      formData.append("sale_price", String(draft.salePrice));
    } else if (isUpdate) {
      formData.append("sale_price", "");
    }
  }

  if (draft.benefits !== undefined) {
    const benefits = draft.benefits.map((b) => b.trim()).filter(Boolean);
    if (benefits.length > 0) {
      benefits.forEach((b) => formData.append("benefits[]", b));
    } else if (isUpdate) {
      formData.append("benefits", "");
    }
  }

  if (draft.showInMarketplace !== undefined) {
    formData.append("show_in_marketplace", draft.showInMarketplace ? "1" : "0");
  }
  if (draft.featuredRequested !== undefined) {
    formData.append("featured_requested", draft.featuredRequested ? "1" : "0");
  }

  // Gallery: new photos are added after the kept ones (4 in all)
  (draft.images ?? [])
    .filter((img) => img.isNew)
    .forEach((img, i) => formData.append("images[]", toImageFile(img, i) as any));
  if (isUpdate) {
    (draft.removedImageIds ?? [])
      .filter((id) => id > 0)
      .forEach((id) => formData.append("remove_image_ids[]", String(id)));
  }

  if (draft.variants !== undefined) {
    if (draft.variants.length === 0) {
      // Multipart can't send an empty list
      if (isUpdate) formData.append("remove_variants", "1");
    } else {
      // Full list: variants left out are removed
      draft.variants.forEach((variant, n) => {
        const prefix = `variants[${n}]`;
        if (variant.id != null) formData.append(`${prefix}[id]`, String(variant.id));
        formData.append(`${prefix}[name]`, variant.name.trim());
        formData.append(
          `${prefix}[selling_price]`,
          variant.sellingPrice != null ? String(variant.sellingPrice) : "",
        );
        formData.append(
          `${prefix}[sale_price]`,
          variant.salePrice != null ? String(variant.salePrice) : "",
        );
        formData.append(
          `${prefix}[inventory_count]`,
          String(Math.max(0, Math.round(variant.inventoryCount || 0))),
        );
        variant.images
          .filter((img) => img.isNew)
          .forEach((img, i) =>
            formData.append(`${prefix}[images][]`, toImageFile(img, i) as any),
          );
        if (variant.id != null) {
          variant.removedImageIds
            .filter((id) => id > 0)
            .forEach((id) =>
              formData.append(`${prefix}[remove_image_ids][]`, String(id)),
            );
        }
      });
    }
  }
}

export async function createProduct(
  draft: ProductFormDraft,
  published: boolean,
  imageFile?: { uri: string; name: string; type: string } | null,
): Promise<ShopProduct> {
  const formData = new FormData();
  formData.append("name", draft.name);
  formData.append("brand", draft.brand);
  formData.append("category", draft.category);
  formData.append("description", draft.description);
  formData.append("selling_price", String(draft.sellingPrice));
  if (draft.cost != null) formData.append("cost", String(draft.cost));
  formData.append("inventory_count", String(draft.inventoryCount));
  formData.append(
    "low_stock_alert_enabled",
    draft.lowStockAlertEnabled ? "1" : "0",
  );
  formData.append("low_stock_threshold", String(draft.lowStockThreshold));
  formData.append("track_inventory", draft.trackInventory ? "1" : "0");
  formData.append("published", published ? "1" : "0");
  appendMarketplaceFields(formData, draft, false);

  if (imageFile) {
    formData.append("image", {
      uri: imageFile.uri,
      name: imageFile.name,
      type: imageFile.type,
    } as any);
  }

  const response = await ApiService.post<ProductResponse>(
    productEndpoints.create,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  if (response.success && response.data) {
    // Drafts aren't listed in the shop yet
    if (response.data.published) markGoldDone("addProduct");
    return normalizeShopProduct(response.data);
  }
  throw new Error(response.message || "Failed to create product");
}

export async function updateProduct(
  id: string | number,
  draft: Partial<ProductFormDraft> & { published?: boolean },
  imageFile?: { uri: string; name: string; type: string } | null,
): Promise<ShopProduct> {
  const formData = new FormData();
  formData.append("_method", "PUT");

  if (draft.name != null) formData.append("name", draft.name);
  if (draft.brand != null) formData.append("brand", draft.brand);
  if (draft.category != null) formData.append("category", draft.category);
  if (draft.description != null)
    formData.append("description", draft.description);
  if (draft.sellingPrice != null)
    formData.append("selling_price", String(draft.sellingPrice));
  if (draft.cost !== undefined)
    formData.append("cost", draft.cost != null ? String(draft.cost) : "");
  if (draft.inventoryCount != null)
    formData.append("inventory_count", String(draft.inventoryCount));
  if (draft.lowStockAlertEnabled != null)
    formData.append(
      "low_stock_alert_enabled",
      draft.lowStockAlertEnabled ? "1" : "0",
    );
  if (draft.lowStockThreshold != null)
    formData.append("low_stock_threshold", String(draft.lowStockThreshold));
  if (draft.trackInventory != null)
    formData.append("track_inventory", draft.trackInventory ? "1" : "0");
  if (draft.published != null)
    formData.append("published", draft.published ? "1" : "0");
  appendMarketplaceFields(formData, draft, true);

  if (imageFile) {
    formData.append("image", {
      uri: imageFile.uri,
      name: imageFile.name,
      type: imageFile.type,
    } as any);
  }

  const response = await ApiService.post<ProductResponse>(
    productEndpoints.update(id),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  if (response.success && response.data) {
    if (response.data.published) markGoldDone("addProduct");
    return normalizeShopProduct(response.data);
  }
  throw new Error(response.message || "Failed to update product");
}

/**
 * Deletes (hides) a product. Throws ProductDeleteBlockedError on 409 so the caller
 * can offer "Delete anyway" when `canForce`; a 404 error keeps `status: 404`.
 */
export async function deleteProduct(
  id: string | number,
  options?: { force?: boolean },
): Promise<{ unlinkedReels: number; cancelledCheckouts: number }> {
  let response: DeleteResponse;
  try {
    response = await ApiService.delete<DeleteResponse>(
      productEndpoints.delete(id, options?.force),
    );
  } catch (err: any) {
    const data = err?.data?.data;
    if (err?.status === 409 && data?.reason) {
      throw new ProductDeleteBlockedError(
        err?.data?.message || err.message,
        data.reason,
        data.canForce === true,
      );
    }
    throw err;
  }
  if (!response.success) {
    throw new Error(response.message || "Failed to delete product");
  }
  return {
    unlinkedReels: response.data?.unlinkedReels ?? 0,
    cancelledCheckouts: response.data?.cancelledCheckouts ?? 0,
  };
}

interface DeliveryOptionsResponse {
  success: boolean;
  message: string;
  data: ShopDeliveryOptions;
}

export async function fetchDeliveryOptions(): Promise<ShopDeliveryOptions> {
  const response = await ApiService.get<DeliveryOptionsResponse>(
    productEndpoints.deliveryOptions,
  );
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || "Failed to fetch delivery options");
}

export async function updateDeliveryOptions(body: {
  shipping: ShopDeliveryShipping;
  shipping_price?: number;
  pickup_available: boolean;
}): Promise<ShopDeliveryOptions> {
  const response = await ApiService.put<DeliveryOptionsResponse>(
    productEndpoints.deliveryOptions,
    body,
  );
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || "Failed to save delivery options");
}
