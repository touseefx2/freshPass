import type {
  ShopDeliveryOptions,
  ShopSeller,
} from "@/src/types/shopProduct";

/** GET /api/product-categories (admin-managed list). */
export interface ProductCategory {
  id: number;
  name: string;
}

/** Catalog filter chips. Leave out for all products, newest first. */
export type MarketplaceFilter = "featured" | "new" | "best_sellers" | "on_sale";

export interface MarketplaceListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
}

// ── Cart (GET /api/cart and every cart change) ─────────────────────

/** Why a cart line can't be checked out; its group is blocked until fixed. */
export interface MarketCartItemIssue {
  code:
    | "unavailable"
    | "option_unavailable"
    | "choose_option"
    | "out_of_stock"
    | "not_enough_stock"
    | string;
  message: string;
}

export interface MarketCartItem {
  /** Cart line id (PATCH / DELETE /api/cart/items/{id}), not the product id. */
  id: number;
  productId: number;
  variantId: number | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  /** Today's price for one. */
  unitPrice: number;
  regularUnitPrice: number;
  onSale: boolean;
  quantity: number;
  /** Caps the + button. */
  maxQuantity: number;
  lineTotal: number;
  issue: MarketCartItemIssue | null;
}

/** One seller's lines: one Checkout button, one payment. */
export interface MarketCartGroup {
  seller: ShopSeller;
  delivery: ShopDeliveryOptions;
  items: MarketCartItem[];
  itemCount: number;
  subtotal: number;
  shippingEstimate: number;
  taxEstimate: number;
  totalEstimate: number;
  issueCount: number;
  canCheckout: boolean;
}

export interface MarketCart {
  /** Units across all groups (header badge). */
  itemCount: number;
  groups: MarketCartGroup[];
}

// ── Reviews ─────────────────────────────────────────────────────────

export interface ProductReview {
  id: number;
  rating: number;
  comment: string | null;
  photoUrl: string | null;
  variantName: string | null;
  verifiedBuyer: boolean;
  /** First name + last initial, e.g. "Sam J." */
  reviewer: { name: string; imageUrl: string | null };
  isMine: boolean;
  /** Own review only: FreshPass hid it. */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewSummary {
  /** null = no reviews yet. */
  average: number | null;
  count: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ProductReviewsPage {
  summary: ProductReviewSummary;
  reviews: ProductReview[];
  meta: MarketplaceListMeta;
  /** Signed-in only: they received this product (false for guests). */
  canReview: boolean;
  /** Signed-in only: their own review. */
  myReview: ProductReview | null;
}

// ── Checkout (a cart group or Buy Now) ──────────────────────────────

export interface MarketCheckoutLine {
  productId: number;
  variantId: number | null;
  quantity: number;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPrice: number;
  regularUnitPrice: number;
}

/** What the Marketplace checkout screen pays for: one seller, one payment. */
export interface MarketCheckoutDraft {
  mode: "cart" | "buyNow";
  seller: ShopSeller;
  delivery: ShopDeliveryOptions;
  lines: MarketCheckoutLine[];
}
