import { ApiService } from "./api";
import { productEndpoints, orderEndpoints } from "./endpoints";
import type {
  ShopDeliveryOptions,
  ShopDeliveryShipping,
  ShopProduct,
} from "@/src/types/shopProduct";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import Logger from "./logger";

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
    return response.data;
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
    return { products: response.data.data, meta: response.data.meta };
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
    return response.data;
  }
  throw new Error(response.message || "Failed to fetch product");
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
    return response.data;
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
    return response.data;
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
