import type { MaterialIcons } from "@expo/vector-icons";
import type {
  ProductDraftImage,
  ProductDraftVariant,
} from "@/src/components/productFormScreen";

/** Hard cap when 0-4 options: main + option photos share this total. */
export const MAX_PRODUCT_PHOTOS = 4;
export const MAX_BENEFITS = 10;

export type PhotoLimits = {
  /** false when 5+ options: main photos are not allowed. */
  mainAllowed: boolean;
  /** Max photos for main (0 when blocked). */
  mainMax: number;
  /** Max photos per option. */
  perOption: number;
  /** The overall cap. */
  total: number;
};

/** Compute photo limits from the current option count. */
export function getPhotoLimits(
  optionCount: number,
  mainPhotos: number,
  allOptionPhotos: number,
): PhotoLimits {
  if (optionCount >= 5) {
    return { mainAllowed: false, mainMax: 0, perOption: 1, total: optionCount };
  }
  return {
    mainAllowed: true,
    mainMax: Math.max(0, MAX_PRODUCT_PHOTOS - allOptionPhotos),
    perOption: MAX_PRODUCT_PHOTOS,
    total: MAX_PRODUCT_PHOTOS,
  };
}
export const MAX_BENEFIT_LENGTH = 120;

/** Editor steps: Photos & name → Category & details → Price & stock → Options → Marketplace → Review. */
export const STEP_PHOTOS = 0;
export const STEP_DETAILS = 1;
export const STEP_PRICE = 2;
export const STEP_OPTIONS = 3;
export const STEP_MARKETPLACE = 4;
export const STEP_REVIEW = 5;
export type EditorStep = 0 | 1 | 2 | 3 | 4 | 5;
export const EDITOR_TOTAL_STEPS = 6;

// Keeps "12." while typing; one decimal point, two decimals max.
export const cleanMoney = (v: string) => {
  const digits = v.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
export const cleanInt = (v: string) => v.replace(/\D/g, "").slice(0, 6);
export const toMoney = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
/** Empty / zero text → null (an optional price that isn't set). */
export const toMoneyOrNull = (v: string): number | null => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const moneyText = (n: number | null | undefined) =>
  n != null && n > 0 ? String(n) : "";

/** An option while it is being edited: number fields stay text ("12."). */
export type VariantForm = {
  key: string;
  id?: number;
  name: string;
  priceText: string;
  saleText: string;
  stockText: string;
  images: ProductDraftImage[];
  removedImageIds: number[];
};

export type VariantErrorKey = "name" | "stock" | "price" | "sale" | "photos";
export type VariantErrors = Partial<Record<VariantErrorKey, string>>;

let variantSeq = 0;
export const newVariantKey = () => `new-${Date.now()}-${++variantSeq}`;

export function variantToForm(v: ProductDraftVariant): VariantForm {
  return {
    key: v.key,
    id: v.id,
    name: v.name,
    priceText: moneyText(v.sellingPrice),
    saleText: moneyText(v.salePrice),
    stockText: String(Math.max(0, v.inventoryCount || 0)),
    images: v.images,
    removedImageIds: v.removedImageIds,
  };
}

export function formToVariant(f: VariantForm): ProductDraftVariant {
  const sellingPrice = toMoneyOrNull(f.priceText);
  return {
    id: f.id,
    key: f.key,
    name: f.name.trim(),
    sellingPrice,
    // A sale needs the option's own price (otherwise it follows the product's sale)
    salePrice: sellingPrice != null ? toMoneyOrNull(f.saleText) : null,
    inventoryCount: parseInt(f.stockText || "0", 10) || 0,
    images: f.images,
    removedImageIds: f.removedImageIds,
  };
}

export function emptyVariantForm(): VariantForm {
  return {
    key: newVariantKey(),
    name: "",
    priceText: "",
    saleText: "",
    stockText: "",
    images: [],
    removedImageIds: [],
  };
}

/** Removes a photo; a server photo's id goes to removedImageIds. */
export function withoutImage(
  images: ProductDraftImage[],
  removedIds: number[],
  index: number,
): { images: ProductDraftImage[]; removedImageIds: number[] } {
  const target = images[index];
  if (!target) return { images, removedImageIds: removedIds };
  const next = images.filter((_, i) => i !== index);
  const removedImageIds =
    !target.isNew && target.id != null && target.id > 0
      ? [...removedIds, target.id]
      : removedIds;
  return { images: next, removedImageIds };
}

/** New picks are added after the kept ones (same order the server uses). */
export function withNewImages(
  images: ProductDraftImage[],
  uris: string[],
  max = MAX_PRODUCT_PHOTOS,
): ProductDraftImage[] {
  const room = Math.max(0, max - images.length);
  const added = uris.slice(0, room).map((uri, i) => ({
    uri,
    isNew: true,
    name: `product-${Date.now()}-${i}.jpg`,
    type: "image/jpeg",
  }));
  return [...images, ...added];
}

type IconName = keyof typeof MaterialIcons.glyphMap;

const CATEGORY_ICONS: Record<string, IconName> = {
  "hair styling": "auto-fix-high",
  "hair care": "spa",
  "beard care": "face",
  tools: "content-cut",
  nails: "brush",
  skincare: "face-retouching-natural",
  makeup: "palette",
  fragrance: "local-florist",
  "lashes & brows": "visibility",
  "wigs & extensions": "auto-awesome",
  other: "category",
};

export const getCategoryIcon = (name: string): IconName =>
  CATEGORY_ICONS[name.trim().toLowerCase()] ?? "category";

// ── Server 422 → step / field ───────────────────────────────────────

export type ProductFieldKey =
  | "photos"
  | "name"
  | "brand"
  | "category"
  | "description"
  | "benefits"
  | "price"
  | "sale"
  | "cost"
  | "inventory"
  | "threshold"
  | "marketplace"
  | "featured";

export type ServerFieldTarget = {
  step: EditorStep;
  field?: ProductFieldKey;
  /** Index into the options list for `variants.N.*` keys. */
  variantIndex?: number;
  variantField?: VariantErrorKey;
};

const PRODUCT_KEYS: Record<string, { step: EditorStep; field?: ProductFieldKey }> = {
  image: { step: STEP_PHOTOS, field: "photos" },
  images: { step: STEP_PHOTOS, field: "photos" },
  remove_image_ids: { step: STEP_PHOTOS, field: "photos" },
  name: { step: STEP_PHOTOS, field: "name" },
  brand: { step: STEP_PHOTOS, field: "brand" },
  category: { step: STEP_DETAILS, field: "category" },
  description: { step: STEP_DETAILS, field: "description" },
  benefits: { step: STEP_DETAILS, field: "benefits" },
  selling_price: { step: STEP_PRICE, field: "price" },
  sale_price: { step: STEP_PRICE, field: "sale" },
  cost: { step: STEP_PRICE, field: "cost" },
  inventory_count: { step: STEP_PRICE, field: "inventory" },
  low_stock_threshold: { step: STEP_PRICE, field: "threshold" },
  low_stock_alert_enabled: { step: STEP_PRICE, field: "threshold" },
  variants: { step: STEP_OPTIONS },
  remove_variants: { step: STEP_OPTIONS },
  show_in_marketplace: { step: STEP_MARKETPLACE, field: "marketplace" },
  featured_requested: { step: STEP_MARKETPLACE, field: "featured" },
};

const VARIANT_KEYS: Record<string, VariantErrorKey> = {
  name: "name",
  inventory_count: "stock",
  selling_price: "price",
  sale_price: "sale",
  images: "photos",
  remove_image_ids: "photos",
};

/** "benefits.2" → benefits, "variants.1.sale_price" → option 2's sale price, "images.0" → photos. */
export function mapServerErrorKey(key: string): ServerFieldTarget {
  const parts = key.replace(/\[(\w*)\]/g, ".$1").split(".").filter(Boolean);
  const root = parts[0] ?? "";
  if (root === "variants" && parts.length >= 3) {
    const index = parseInt(parts[1]!, 10);
    return {
      step: STEP_OPTIONS,
      variantIndex: Number.isFinite(index) ? index : undefined,
      variantField: VARIANT_KEYS[parts[2]!] ?? undefined,
    };
  }
  return PRODUCT_KEYS[root] ?? { step: STEP_REVIEW };
}

/** 422 from the save, handed back by the screen so the flow can point at the field. */
export type ProductServerError = {
  errors: Record<string, string[] | string>;
  message?: string | null;
  /** Changes on every failed save so the same error shows again. */
  nonce: number;
};

/** 422 field errors from ApiService, or null for any other failure. */
export function toProductServerError(err: any): ProductServerError | null {
  const errors = err?.data?.errors;
  if (err?.status !== 422 || !errors || typeof errors !== "object") return null;
  return { errors, message: err?.data?.message ?? null, nonce: Date.now() };
}

/** First readable message of a failed save (422 field message first). */
export function productSaveErrorMessage(
  err: any,
  serverError: ProductServerError | null,
): string | null {
  const first = serverError ? Object.values(serverError.errors)[0] : undefined;
  const fieldMessage = Array.isArray(first) ? first[0] : first;
  return (
    (typeof fieldMessage === "string" && fieldMessage) ||
    err?.data?.message ||
    err?.message ||
    null
  );
}
