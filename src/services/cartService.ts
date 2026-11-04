import { ApiService } from "./api";
import { cartEndpoints } from "./endpoints";
import { store } from "@/src/state/store";
import {
  setMarketCart,
  setMarketCartCount,
} from "@/src/state/slices/marketCartSlice";
import type {
  ShopDeliveryOptions,
  ShopSeller,
} from "@/src/types/shopProduct";
import type {
  MarketCart,
  MarketCartGroup,
  MarketCartItem,
  MarketCartItemIssue,
} from "@/src/types/marketplace";

/**
 * Marketplace cart, saved on the account (signed-in customers only). Every
 * change answers with the whole cart, which goes straight into the
 * `marketCart` slice so the cart screen and every badge refresh together.
 * Guests / signed-out: nothing is called (null / 0).
 */

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

type Raw = Record<string, any>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" ? (value as Raw) : null;
}

function toNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return value != null && value !== "" && Number.isFinite(n) ? n : fallback;
}

function toNullableNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function canUseCart(): boolean {
  const user = store.getState().user;
  return !user.isGuest && !!user.accessToken;
}

// ── Normalizing ─────────────────────────────────────────────────────

function normalizeIssue(value: unknown): MarketCartItemIssue | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    code: toText(raw.code) ?? "unavailable",
    message: toText(raw.message) ?? "",
  };
}

function normalizeItem(value: unknown): MarketCartItem {
  const raw = asRecord(value) ?? {};
  const unitPrice = toNum(raw.unitPrice);
  const quantity = toNum(raw.quantity, 1);
  return {
    id: toNum(raw.id),
    productId: toNum(raw.productId),
    variantId: toNullableNum(raw.variantId),
    name: toText(raw.name) ?? "",
    variantName: toText(raw.variantName),
    imageUrl: toText(raw.imageUrl),
    unitPrice,
    regularUnitPrice: toNum(raw.regularUnitPrice, unitPrice),
    onSale: raw.onSale === true,
    quantity,
    maxQuantity: toNum(raw.maxQuantity, quantity),
    lineTotal: toNum(raw.lineTotal, unitPrice * quantity),
    issue: normalizeIssue(raw.issue),
  };
}

function normalizeSeller(value: unknown): ShopSeller {
  const raw = asRecord(value) ?? {};
  return {
    id: toNum(raw.id),
    name: toText(raw.name) ?? "",
    imageUrl: toText(raw.imageUrl),
  };
}

function normalizeDelivery(value: unknown): ShopDeliveryOptions {
  const raw = asRecord(value) ?? {};
  return {
    shipping:
      raw.shipping === "paid" || raw.shipping === "free" ? raw.shipping : "none",
    shippingPrice: toNullableNum(raw.shippingPrice),
    pickupAvailable: raw.pickupAvailable === true,
    configured: raw.configured !== false,
  };
}

function normalizeGroup(value: unknown): MarketCartGroup {
  const raw = asRecord(value) ?? {};
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [];
  const issueCount = toNum(
    raw.issueCount,
    items.filter((item) => item.issue).length,
  );
  return {
    seller: normalizeSeller(raw.seller),
    delivery: normalizeDelivery(raw.delivery),
    items,
    itemCount: toNum(
      raw.itemCount,
      items.reduce((sum, item) => sum + item.quantity, 0),
    ),
    subtotal: toNum(raw.subtotal),
    shippingEstimate: toNum(raw.shippingEstimate),
    taxEstimate: toNum(raw.taxEstimate),
    totalEstimate: toNum(raw.totalEstimate),
    issueCount,
    canCheckout:
      typeof raw.canCheckout === "boolean"
        ? raw.canCheckout
        : issueCount === 0 && items.length > 0,
  };
}

export function normalizeMarketCart(value: unknown): MarketCart {
  const raw = asRecord(value) ?? {};
  const groups = Array.isArray(raw.groups) ? raw.groups.map(normalizeGroup) : [];
  return {
    itemCount: toNum(
      raw.itemCount,
      groups.reduce((sum, group) => sum + group.itemCount, 0),
    ),
    groups,
  };
}

function storeCart(response: ApiEnvelope<unknown>, fallback: string): MarketCart {
  if (!response?.success || response.data == null) {
    throw new Error(response?.message || fallback);
  }
  const cart = normalizeMarketCart(response.data);
  store.dispatch(setMarketCart(cart));
  return cart;
}

// ── Calls ───────────────────────────────────────────────────────────

/** GET /api/cart — grouped by seller, most recently changed first. */
export async function fetchCart(): Promise<MarketCart | null> {
  if (!canUseCart()) return null;
  const response = await ApiService.get<ApiEnvelope<unknown>>(cartEndpoints.cart);
  return storeCart(response, "Failed to load cart");
}

/** GET /api/cart/count — units in the cart for the header badge. */
export async function fetchCartCount(): Promise<number> {
  if (!canUseCart()) return 0;
  const response = await ApiService.get<ApiEnvelope<unknown>>(cartEndpoints.count);
  if (!response?.success) {
    throw new Error(response?.message || "Failed to load cart count");
  }
  const data = asRecord(response.data);
  const count = toNum(data?.itemCount ?? response.data);
  store.dispatch(setMarketCartCount(count));
  return count;
}

/**
 * POST /api/cart/items — adds to the existing line for the same
 * product/option. `variantId` is required when the product has options.
 * 422 (stock / option) and 403 own_business → see getCartErrorMessage.
 */
export async function addCartItem(params: {
  productId: string | number;
  variantId?: number | null;
  quantity?: number;
}): Promise<MarketCart | null> {
  if (!canUseCart()) return null;
  const body: { product_id: number; variant_id?: number; quantity?: number } = {
    product_id: Number(params.productId),
  };
  if (params.variantId != null) body.variant_id = params.variantId;
  if (params.quantity != null) body.quantity = params.quantity;
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    cartEndpoints.items,
    body,
  );
  return storeCart(response, "Failed to add to cart");
}

/** PATCH /api/cart/items/{lineId} — quantity 1–99 (cart line id, not product id). */
export async function updateCartItemQuantity(
  lineId: string | number,
  quantity: number,
): Promise<MarketCart | null> {
  if (!canUseCart()) return null;
  const response = await ApiService.patch<ApiEnvelope<unknown>>(
    cartEndpoints.item(lineId),
    { quantity: Math.max(1, Math.min(99, Math.round(quantity))) },
  );
  return storeCart(response, "Failed to update cart");
}

/** DELETE /api/cart/items/{lineId}. */
export async function removeCartItem(
  lineId: string | number,
): Promise<MarketCart | null> {
  if (!canUseCart()) return null;
  const response = await ApiService.delete<ApiEnvelope<unknown>>(
    cartEndpoints.item(lineId),
  );
  return storeCart(response, "Failed to remove item");
}

const CART_ERROR_FIELDS = ["quantity", "variant_id", "product_id"];

/**
 * Message to show for a failed cart call: the first 422 field message
 * (quantity, then variant_id, then product_id, then any other) or the 403
 * own_business message. Null when the error is something else (network…).
 */
export function getCartErrorMessage(err: unknown): string | null {
  const error = asRecord(err);
  const status = toNum(error?.status ?? asRecord(error?.response)?.status);
  const body = asRecord(error?.data) ?? asRecord(asRecord(error?.response)?.data);
  if (status === 422) {
    const errors = asRecord(body?.errors);
    if (errors) {
      const keys = [
        ...CART_ERROR_FIELDS.filter((key) => key in errors),
        ...Object.keys(errors).filter((key) => !CART_ERROR_FIELDS.includes(key)),
      ];
      for (const key of keys) {
        const value = errors[key];
        const message = Array.isArray(value) ? toText(value[0]) : toText(value);
        if (message) return message;
      }
    }
    return toText(body?.message);
  }
  if (status === 403) {
    return toText(body?.message);
  }
  return null;
}
