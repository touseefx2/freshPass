import { ApiService } from "./api";
import { productEndpoints, orderEndpoints } from "./endpoints";
import type { ShopProduct } from "@/src/types/shopProduct";
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
  formData.append("shipping_price", String(draft.shippingPrice));
  formData.append("free_shipping_over", String(draft.freeShippingOver));
  formData.append("pickup_available", draft.pickupAvailable ? "1" : "0");
  formData.append("published", "1");

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
  draft: Partial<ProductFormDraft>,
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
  if (draft.shippingPrice != null)
    formData.append("shipping_price", String(draft.shippingPrice));
  if (draft.freeShippingOver != null)
    formData.append("free_shipping_over", String(draft.freeShippingOver));
  if (draft.pickupAvailable != null)
    formData.append("pickup_available", draft.pickupAvailable ? "1" : "0");

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

export async function deleteProduct(id: string | number): Promise<void> {
  const response = await ApiService.delete<DeleteResponse>(
    productEndpoints.delete(id),
  );
  if (!response.success) {
    throw new Error(response.message || "Failed to delete product");
  }
}

export async function publishProduct(
  id: string | number,
  published: boolean,
): Promise<ShopProduct> {
  return updateProduct(id, {} as any).then(() =>
    fetchProductById(id),
  );
}
