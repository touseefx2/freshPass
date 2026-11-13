import { ApiService } from "./api";
import { promotionEndpoints } from "./endpoints";
import type {
  AppointmentPromotion,
  BusinessPromotionsResponse,
  MyPromotionsResult,
  Promotion,
  PromotionPayload,
  PromotionResults,
  PromotionSource,
  QuotePromotion,
  ReschedulePromotion,
} from "@/src/types/promotion";

// Profile Promotions. The server does every price and eligibility check;
// these helpers only normalise what comes back so screens can trust types.

type AnyRecord = Record<string, any>;

const asRecord = (value: unknown): AnyRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const toStr = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const toBool = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true";

const toNumList = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.map(toNum).filter((n): n is number => n != null)
    : [];

/** `{ success, data }` → data; throws the server message on success:false. */
function unwrapData(res: unknown, fallback = "Something went wrong"): unknown {
  const body = asRecord(res);
  if (!body) return res;
  if (body.success === false) {
    throw Object.assign(new Error(toStr(body.message) ?? fallback), {
      data: body,
    });
  }
  return "data" in body ? body.data : body;
}

function normalizeResults(value: unknown): PromotionResults | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    views: toNum(r.views) ?? 0,
    booking_starts: toNum(r.booking_starts) ?? 0,
    confirmed_bookings: toNum(r.confirmed_bookings) ?? 0,
    completed_visits: toNum(r.completed_visits) ?? 0,
    discount_total: toNum(r.discount_total) ?? 0,
    revenue: toNum(r.revenue) ?? 0,
  };
}

export function normalizePromotion(value: unknown): Promotion {
  const p = asRecord(value) ?? {};
  const business = asRecord(p.business);
  const eligibility = asRecord(p.eligibility);
  return {
    id: toNum(p.id) ?? 0,
    business: business
      ? {
          id: toNum(business.id) ?? 0,
          title: toStr(business.title) ?? "",
          slug: toStr(business.slug),
          image_url: toStr(business.image_url),
        }
      : null,
    title: toStr(p.title) ?? "",
    description: toStr(p.description),
    image_url: toStr(p.image_url),
    savings_label: toStr(p.savings_label),
    chip_label: toStr(p.chip_label),
    audience: (toStr(p.audience) ?? "everyone") as Promotion["audience"],
    audience_label: toStr(p.audience_label),
    discount_type: p.discount_type === "fixed" ? "fixed" : "percent",
    discount_value: toNum(p.discount_value) ?? 0,
    services: (Array.isArray(p.services) ? p.services : [])
      .map((s: unknown) => {
        const r = asRecord(s);
        if (!r) return null;
        const original = toNum(r.original_price) ?? toNum(r.price) ?? 0;
        return {
          id: toNum(r.id) ?? 0,
          name: toStr(r.name) ?? "",
          original_price: original,
          discount: toNum(r.discount) ?? 0,
          final_price: toNum(r.final_price) ?? original,
        };
      })
      .filter(Boolean) as Promotion["services"],
    staff: (Array.isArray(p.staff) ? p.staff : [])
      .map((s: unknown) => {
        const r = asRecord(s);
        return r ? { id: toNum(r.id) ?? 0, name: toStr(r.name) ?? "" } : null;
      })
      .filter(Boolean) as Promotion["staff"],
    booking_label: toStr(p.booking_label),
    visit_label: toStr(p.visit_label),
    booking_starts_at: toStr(p.booking_starts_at),
    booking_ends_at: toStr(p.booking_ends_at),
    visit_starts_on: toStr(p.visit_starts_on),
    visit_ends_on: toStr(p.visit_ends_on),
    weekdays: toNumList(p.weekdays),
    time_from: toStr(p.time_from),
    time_to: toStr(p.time_to),
    timezone: toStr(p.timezone),
    max_redemptions: toNum(p.max_redemptions),
    reel_id: toNum(p.reel_id ?? asRecord(p.reel)?.id),
    restrictions: Array.isArray(p.restrictions)
      ? p.restrictions.filter((l: unknown) => typeof l === "string" && l.trim())
      : [],
    eligibility: eligibility
      ? {
          eligible:
            eligibility.eligible === null || eligibility.eligible === undefined
              ? null
              : toBool(eligibility.eligible),
          reason: toStr(eligibility.reason),
          message: toStr(eligibility.message),
        }
      : null,
    status: toStr(p.status) ?? "active",
    suspended_reason: toStr(p.suspended_reason),
    reserved_count: toNum(p.reserved_count) ?? 0,
    used_count: toNum(p.used_count) ?? 0,
    views_count: toNum(p.views_count) ?? 0,
    results: normalizeResults(p.results),
  };
}

export function normalizeQuotePromotion(value: unknown): QuotePromotion | null {
  const p = asRecord(value);
  if (!p) return null;
  return {
    id: toNum(p.id) ?? 0,
    title: toStr(p.title) ?? "",
    eligible: toBool(p.eligible),
    reason: toStr(p.reason),
    message: toStr(p.message),
    originalPrice: toNum(p.originalPrice) ?? 0,
    discount: toNum(p.discount) ?? 0,
    finalPrice: toNum(p.finalPrice) ?? 0,
    services: (Array.isArray(p.services) ? p.services : [])
      .map((s: unknown) => {
        const r = asRecord(s);
        if (!r) return null;
        return {
          id: toNum(r.id) ?? 0,
          originalPrice: toNum(r.originalPrice) ?? 0,
          discount: toNum(r.discount) ?? 0,
          finalPrice: toNum(r.finalPrice) ?? 0,
        };
      })
      .filter(Boolean) as QuotePromotion["services"],
  };
}

export function normalizeAppointmentPromotion(
  value: unknown,
): AppointmentPromotion | null {
  const p = asRecord(value);
  if (!p) return null;
  return {
    id: toNum(p.id) ?? 0,
    title: toStr(p.title) ?? "",
    source: (toStr(p.source) as PromotionSource | null) ?? null,
    originalPrice: toNum(p.originalPrice) ?? 0,
    discount: toNum(p.discount) ?? 0,
    finalPrice: toNum(p.finalPrice) ?? 0,
    conflict: p.conflict ?? null,
  };
}

/**
 * Text to show for `promotion.conflict` (shop side). The guide doesn't say if
 * it's a flag or the message, so accept a string, `{ message }` or `true`.
 */
export function promotionConflictText(
  conflict: unknown,
  fallback: string,
): string | null {
  if (!conflict) return null;
  if (typeof conflict === "string") return conflict.trim() || fallback;
  const r = asRecord(conflict);
  if (r) return toStr(r.message) ?? fallback;
  return conflict === true || conflict === 1 ? fallback : null;
}

export function normalizeReschedulePromotion(
  value: unknown,
): ReschedulePromotion | null {
  const p = asRecord(value);
  if (!p) return null;
  return {
    applies: toBool(p.applies),
    reason: toStr(p.reason),
    message: toStr(p.message),
    currentPrice: toNum(p.currentPrice) ?? 0,
    newPrice: toNum(p.newPrice) ?? 0,
    paidOnline: toBool(p.paidOnline),
  };
}

/** `422` refusal: `{ errors: { promotion_id: [msg], promotion_reason: [code] } }`. */
export function getPromotionRefusal(
  error: any,
): { message: string; reason: string | null } | null {
  const errors = asRecord(error?.data?.errors ?? error?.response?.data?.errors);
  if (!errors) return null;
  const first = (v: unknown) => (Array.isArray(v) ? toStr(v[0]) : toStr(v));
  const message = first(errors.promotion_id) ?? first(errors.promotion_change_accepted);
  if (!message) return null;
  return { message, reason: first(errors.promotion_reason) };
}

// ── Customer ─────────────────────────────────────────────────────────

export async function fetchBusinessPromotions(
  businessId: number | string,
): Promise<BusinessPromotionsResponse> {
  const res = asRecord(
    unwrapData(
      await ApiService.get(promotionEndpoints.forBusiness(businessId, "profile")),
    ),
  );
  return {
    chip_label: toStr(res?.chip_label),
    promotions: (Array.isArray(res?.promotions) ? res!.promotions : []).map(
      normalizePromotion,
    ),
  };
}

/** Counts a view. Returns null on 404 (draft, suspended, private, gone). */
export async function fetchPublicPromotion(
  id: number | string,
  source?: PromotionSource,
  /** Claim code from a Bring Customers Back email (private offers) */
  claim?: string,
): Promise<Promotion | null> {
  try {
    const res = unwrapData(
      await ApiService.get(promotionEndpoints.publicById(id, source, claim)),
    );
    const body = asRecord(res);
    return normalizePromotion(asRecord(body?.promotion) ?? body);
  } catch (err: any) {
    if ((err?.status ?? err?.response?.status) === 404) return null;
    throw err;
  }
}

// ── Owner ────────────────────────────────────────────────────────────

const EMPTY_META = { current_page: 1, per_page: 20, total: 0, last_page: 1 };

export async function fetchMyPromotions(
  params: { status?: string; page?: number; per_page?: number } = {},
): Promise<MyPromotionsResult> {
  const raw = asRecord(await ApiService.get(promotionEndpoints.mine(params)));
  // { success, data: { data: [...], meta, can_promote, included_note } } or flat
  const inner = asRecord(raw && "success" in raw ? raw.data : raw) ?? {};
  const level = Array.isArray(inner.data) ? inner : (asRecord(inner.data) ?? inner);
  const rows: unknown[] = Array.isArray(level.data) ? level.data : [];
  const meta = asRecord(level.meta ?? inner.meta ?? raw?.meta);
  const canPromote = level.can_promote ?? inner.can_promote ?? raw?.can_promote;
  return {
    items: rows.map(normalizePromotion),
    meta: meta
      ? {
          current_page: toNum(meta.current_page) ?? 1,
          per_page: toNum(meta.per_page) ?? 20,
          total: toNum(meta.total) ?? rows.length,
          last_page: Math.max(1, toNum(meta.last_page) ?? 1),
        }
      : EMPTY_META,
    can_promote: canPromote === undefined ? true : toBool(canPromote),
    included_note: toStr(
      level.included_note ?? inner.included_note ?? raw?.included_note,
    ),
  };
}

export async function fetchMyPromotion(id: number | string): Promise<Promotion> {
  const res = asRecord(unwrapData(await ApiService.get(promotionEndpoints.mineById(id))));
  return normalizePromotion(asRecord(res?.promotion) ?? res);
}

/** Multipart only when an image is attached; JSON otherwise. */
function buildBody(payload: PromotionPayload): { body: any; multipart: boolean } {
  const { image, remove_image, ...rest } = payload;
  if (!image) {
    return {
      body: { ...rest, ...(remove_image ? { remove_image: 1 } : {}) },
      multipart: false,
    };
  }
  const form = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => form.append(`${key}[]`, String(v)));
    } else if (value === null) {
      form.append(key, "");
    } else {
      form.append(key, String(value));
    }
  });
  const name = image.name ?? image.uri.split("/").pop() ?? "promotion.jpg";
  form.append("image", {
    uri: image.uri,
    name,
    type: image.type ?? "image/jpeg",
  } as any);
  return { body: form, multipart: true };
}

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

export async function createPromotion(payload: PromotionPayload): Promise<Promotion> {
  const { body, multipart } = buildBody(payload);
  const res = asRecord(
    unwrapData(
      await ApiService.post(
        promotionEndpoints.create,
        body,
        multipart ? MULTIPART : undefined,
      ),
    ),
  );
  return normalizePromotion(asRecord(res?.promotion) ?? res);
}

/** Send only what changed. POST when an image is attached, PATCH otherwise. */
export async function updatePromotion(
  id: number | string,
  payload: PromotionPayload,
): Promise<Promotion> {
  const { body, multipart } = buildBody(payload);
  const raw = multipart
    ? await ApiService.post(promotionEndpoints.update(id), body, MULTIPART)
    : await ApiService.patch(promotionEndpoints.update(id), body);
  const res = asRecord(unwrapData(raw));
  return normalizePromotion(asRecord(res?.promotion) ?? res);
}

export async function setPromotionStatus(
  id: number | string,
  action: "pause" | "resume" | "publish",
): Promise<Promotion | null> {
  const res = asRecord(
    unwrapData(await ApiService.post(promotionEndpoints.status(id), { action })),
  );
  return res ? normalizePromotion(asRecord(res.promotion) ?? res) : null;
}

export async function deletePromotion(id: number | string): Promise<void> {
  unwrapData(await ApiService.delete(promotionEndpoints.remove(id)));
}

/** First field error → message → fallback (api.ts rejects with err.data). */
export function promotionErrorText(err: any, fallback: string): string {
  const errors = asRecord(err?.data?.errors ?? err?.response?.data?.errors);
  if (errors) {
    for (const v of Object.values(errors)) {
      const text = Array.isArray(v) ? toStr(v[0]) : toStr(v);
      if (text) return text;
    }
  }
  return toStr(err?.data?.message) ?? toStr(err?.message) ?? fallback;
}

/** Field → first message, for inline form errors. */
export function promotionFieldErrors(err: any): Record<string, string> {
  const errors = asRecord(err?.data?.errors ?? err?.response?.data?.errors);
  const out: Record<string, string> = {};
  if (!errors) return out;
  Object.entries(errors).forEach(([key, v]) => {
    const text = Array.isArray(v) ? toStr(v[0]) : toStr(v);
    // service_ids.0 → service_ids
    if (text) out[key.split(".")[0]] = out[key.split(".")[0]] ?? text;
  });
  return out;
}
