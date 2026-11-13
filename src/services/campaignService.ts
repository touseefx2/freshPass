import { ApiService } from "./api";
import type {
  Campaign,
  CampaignAllowance,
  CampaignAudience,
  CampaignAudienceCustomer,
  CampaignAudienceQuery,
  CampaignListMeta,
  CampaignOffer,
  CampaignPayload,
  CampaignRecipient,
  CampaignRecipientStatus,
  CampaignResults,
  CampaignTemplate,
  CampaignTemplates,
} from "@/src/types/campaign";

// Bring Customers Back (offer emails). Every route is under
// /api/business-campaigns. The server picks recipients, checks limits and
// sends; these helpers only normalise what comes back.

const BASE = "/api/business-campaigns";

export const campaignEndpoints = {
  allowance: `${BASE}/allowance`,
  templates: `${BASE}/templates`,
  audience: `${BASE}/audience`,
  list: (params: { page?: number; per_page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.page != null) q.append("page", String(params.page));
    if (params.per_page != null) q.append("per_page", String(params.per_page));
    const query = q.toString();
    return `${BASE}${query ? `?${query}` : ""}`;
  },
  create: BASE,
  byId: (id: number | string) => `${BASE}/${id}`,
  preview: (id: number | string) => `${BASE}/${id}/preview`,
  test: (id: number | string) => `${BASE}/${id}/test`,
  send: (id: number | string) => `${BASE}/${id}/send`,
  cancel: (id: number | string) => `${BASE}/${id}/cancel`,
  recipients: (
    id: number | string,
    params: { status?: CampaignRecipientStatus; page?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.page != null) q.append("page", String(params.page));
    const query = q.toString();
    return `${BASE}/${id}/recipients${query ? `?${query}` : ""}`;
  },
};

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
    ? value
        .map((v) => toNum(asRecord(v)?.id ?? v))
        .filter((n): n is number => n != null)
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

/** Pick `key` from the body or its `data` (both shapes are accepted). */
const pick = (body: AnyRecord | null, key: string): unknown =>
  body?.[key] ?? asRecord(body?.data)?.[key];

// ── Normalizers ─────────────────────────────────────────────────────

export function normalizeAllowance(value: unknown): CampaignAllowance | null {
  const a = asRecord(value);
  if (!a) return null;
  const limit = toNum(a.limit) ?? 0;
  const used = toNum(a.used) ?? 0;
  return {
    limit,
    used,
    remaining: toNum(a.remaining) ?? Math.max(0, limit - used),
    resetsOn: toStr(a.resetsOn ?? a.resets_on),
    period: toStr(a.period),
    plan: toStr(a.plan),
    frequencyDays: toNum(a.frequencyDays ?? a.frequency_days),
  };
}

function normalizeTemplate(key: string, value: unknown): CampaignTemplate | null {
  const t = asRecord(value);
  if (!t) return null;
  return {
    key: toStr(t.key ?? t.template ?? t.id) ?? key,
    name: toStr(t.name ?? t.label ?? t.title),
    subject: toStr(t.subject) ?? "",
    message: toStr(t.message ?? t.body) ?? "",
    button: toStr(t.button),
  };
}

export function normalizeTemplates(value: unknown): CampaignTemplates {
  const body = asRecord(value) ?? {};
  const raw = body.templates;
  let templates: CampaignTemplate[] = [];
  if (Array.isArray(raw)) {
    templates = raw
      .map((t, i) => normalizeTemplate(String(i), t))
      .filter(Boolean) as CampaignTemplate[];
  } else if (asRecord(raw)) {
    templates = Object.entries(raw as AnyRecord)
      .map(([key, t]) => normalizeTemplate(key, t))
      .filter(Boolean) as CampaignTemplate[];
  } else {
    // Flat: { return: {...}, holiday: {...} }
    templates = ["return", "holiday"]
      .map((key) => normalizeTemplate(key, body[key]))
      .filter(Boolean) as CampaignTemplate[];
  }

  const rawTokens = body.tokens;
  const tokens: string[] = Array.isArray(rawTokens)
    ? rawTokens
        .map((tk) => toStr(tk) ?? toStr(asRecord(tk)?.token ?? asRecord(tk)?.key))
        .filter((tk): tk is string => !!tk)
    : asRecord(rawTokens)
      ? Object.keys(rawTokens)
      : [];

  const holidays = (Array.isArray(body.holidays) ? body.holidays : [])
    .map((h: unknown) => {
      const r = asRecord(h);
      const name = toStr(r?.name) ?? toStr(h);
      return name ? { name, date: toStr(r?.date) } : null;
    })
    .filter(Boolean) as CampaignTemplates["holidays"];

  return {
    templates,
    // Always show tokens wrapped, e.g. "{first_name}"
    tokens: tokens.map((tk) => (tk.startsWith("{") ? tk : `{${tk}}`)),
    holidays,
  };
}

function normalizeAudienceCustomer(value: unknown): CampaignAudienceCustomer | null {
  const c = asRecord(value);
  if (!c) return null;
  const first = toStr(c.firstName ?? c.first_name);
  const last = toStr(c.lastName ?? c.last_name);
  return {
    id: toNum(c.id) ?? toStr(c.id) ?? Math.random().toString(36).slice(2),
    name:
      toStr(c.name) ??
      ([first, last].filter(Boolean).join(" ") || toStr(c.email) || ""),
    email: toStr(c.email),
    lastVisitOn: toStr(c.lastVisitOn ?? c.last_visit_on),
    daysSinceVisit: toNum(c.daysSinceVisit ?? c.days_since_visit),
    reason: toStr(c.reason),
    reasonLabel: toStr(c.reasonLabel ?? c.reason_label),
  };
}

export function normalizeAudience(value: unknown): CampaignAudience {
  const a = asRecord(value) ?? {};
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map(normalizeAudienceCustomer)
      .filter(Boolean) as CampaignAudienceCustomer[];
  return {
    selected: toNum(a.selected) ?? 0,
    eligible: toNum(a.eligible) ?? 0,
    excluded: toNum(a.excluded) ?? 0,
    exclusions: (Array.isArray(a.exclusions) ? a.exclusions : [])
      .map((e: unknown) => {
        const r = asRecord(e);
        if (!r) return null;
        return {
          reason: toStr(r.reason) ?? "",
          label: toStr(r.label) ?? toStr(r.reason) ?? "",
          count: toNum(r.count) ?? 0,
        };
      })
      .filter(Boolean) as CampaignAudience["exclusions"],
    eligibleCustomers: list(a.eligibleCustomers ?? a.eligible_customers),
    excludedCustomers: list(a.excludedCustomers ?? a.excluded_customers),
    allowance: normalizeAllowance(a.allowance),
  };
}

function normalizeResults(value: unknown): CampaignResults | null {
  const r = asRecord(value);
  if (!r) return null;
  const n = (k: string, snake?: string) => toNum(r[k] ?? (snake ? r[snake] : undefined)) ?? 0;
  return {
    selected: n("selected"),
    eligible: n("eligible"),
    excluded: n("excluded"),
    queued: n("queued"),
    sent: n("sent"),
    delivered: n("delivered"),
    clicked: n("clicked"),
    failed: n("failed"),
    skipped: n("skipped"),
    unsubscribed: n("unsubscribed"),
    bookings: n("bookings"),
    completedReturns: n("completedReturns", "completed_returns"),
    discountTotal: n("discountTotal", "discount_total"),
    revenue: n("revenue"),
  };
}

function normalizeOffer(value: unknown, fallbackId: number | null): CampaignOffer | null {
  const o = asRecord(value);
  if (!o) return null;
  return {
    id: toNum(o.id) ?? fallbackId,
    title: toStr(o.title),
    savings_label: toStr(o.savings_label ?? o.savingsLabel),
    audience_label: toStr(o.audience_label ?? o.audienceLabel),
    booking_label: toStr(o.booking_label ?? o.bookingLabel),
    visit_label: toStr(o.visit_label ?? o.visitLabel),
    is_public:
      o.is_public === undefined && o.isPublic === undefined
        ? null
        : toBool(o.is_public ?? o.isPublic),
    status: toStr(o.status),
  };
}

export function normalizeCampaign(value: unknown): Campaign {
  const c = asRecord(value) ?? {};
  // Server sends the offer as `promotion` ({ id, ... }), not always promotion_id
  const promotionId = toNum(
    c.promotion_id ?? c.promotionId ?? asRecord(c.promotion)?.id ?? asRecord(c.offer)?.id,
  );
  return {
    id: toNum(c.id) ?? 0,
    status: toStr(c.status) ?? "draft",
    template: toStr(c.template) ?? "return",
    holiday_name: toStr(c.holiday_name ?? c.holidayName),
    subject: toStr(c.subject) ?? "",
    message: toStr(c.message) ?? "",
    inactivity_days: toNum(c.inactivity_days ?? c.inactivityDays),
    service_ids: toNumList(c.service_ids ?? c.serviceIds),
    staff_ids: toNumList(c.staff_ids ?? c.staffIds),
    exclude_upcoming:
      c.exclude_upcoming === undefined && c.excludeUpcoming === undefined
        ? true
        : toBool(c.exclude_upcoming ?? c.excludeUpcoming),
    promotion_id: promotionId,
    offer: normalizeOffer(c.offer ?? c.promotion, promotionId),
    scheduled_at: toStr(c.scheduled_at ?? c.scheduledAt),
    sent_at: toStr(c.sent_at ?? c.sentAt),
    created_at: toStr(c.created_at ?? c.createdAt),
    results: normalizeResults(c.results),
  };
}

function normalizeRecipient(value: unknown): CampaignRecipient | null {
  const r = asRecord(value);
  if (!r) return null;
  const first = toStr(r.firstName ?? r.first_name);
  const last = toStr(r.lastName ?? r.last_name);
  return {
    id: toNum(r.id) ?? toStr(r.id) ?? Math.random().toString(36).slice(2),
    name:
      toStr(r.name) ??
      ([first, last].filter(Boolean).join(" ") || toStr(r.email) || ""),
    email: toStr(r.email),
    status: toStr(r.status),
    reason: toStr(r.reason),
    reasonLabel: toStr(r.reasonLabel ?? r.reason_label),
    sentAt: toStr(r.sentAt ?? r.sent_at),
    clickedAt: toStr(r.clickedAt ?? r.clicked_at),
    unsubscribedAt: toStr(r.unsubscribedAt ?? r.unsubscribed_at),
    error: toStr(r.error),
  };
}

function normalizeMeta(value: unknown, count: number): CampaignListMeta {
  const m = asRecord(value);
  return {
    current_page: toNum(m?.current_page) ?? 1,
    per_page: toNum(m?.per_page) ?? 20,
    total: toNum(m?.total) ?? count,
    last_page: Math.max(1, toNum(m?.last_page) ?? 1),
  };
}

/** `{ data: [...], meta }`, `{ data: { data, meta } }` or a bare array. */
function unwrapList(res: unknown): { rows: unknown[]; level: AnyRecord; outer: AnyRecord } {
  const outer = asRecord(res) ?? {};
  const inner = "success" in outer ? outer.data : res;
  if (Array.isArray(inner)) return { rows: inner, level: outer, outer };
  const level = asRecord(inner) ?? {};
  if (Array.isArray(level.data)) return { rows: level.data, level, outer };
  const deeper = asRecord(level.data);
  if (deeper && Array.isArray(deeper.data)) return { rows: deeper.data, level: deeper, outer };
  for (const key of ["campaigns", "recipients", "items"]) {
    if (Array.isArray(level[key])) return { rows: level[key], level, outer };
  }
  return { rows: [], level, outer };
}

// ── Requests ────────────────────────────────────────────────────────

export async function fetchCampaignAllowance(): Promise<CampaignAllowance | null> {
  return normalizeAllowance(unwrapData(await ApiService.get(campaignEndpoints.allowance)));
}

export async function fetchCampaignTemplates(): Promise<CampaignTemplates> {
  return normalizeTemplates(unwrapData(await ApiService.get(campaignEndpoints.templates)));
}

export async function fetchCampaignAudience(
  query: CampaignAudienceQuery,
): Promise<CampaignAudience> {
  return normalizeAudience(
    unwrapData(await ApiService.post(campaignEndpoints.audience, query)),
  );
}

export async function fetchCampaigns(
  params: { page?: number; per_page?: number } = {},
): Promise<{ items: Campaign[]; meta: CampaignListMeta; allowance: CampaignAllowance | null }> {
  const res = await ApiService.get(campaignEndpoints.list(params));
  const { rows, level, outer } = unwrapList(res);
  return {
    items: rows.map(normalizeCampaign),
    meta: normalizeMeta(level.meta ?? outer.meta, rows.length),
    allowance: normalizeAllowance(
      level.allowance ?? asRecord(outer.data)?.allowance ?? outer.allowance,
    ),
  };
}

export async function fetchCampaign(id: number | string): Promise<Campaign> {
  const res = asRecord(unwrapData(await ApiService.get(campaignEndpoints.byId(id))));
  return normalizeCampaign(asRecord(res?.campaign) ?? res);
}

export async function createCampaign(payload: CampaignPayload): Promise<Campaign> {
  const res = asRecord(unwrapData(await ApiService.post(campaignEndpoints.create, payload)));
  return normalizeCampaign(asRecord(res?.campaign) ?? res);
}

export async function updateCampaign(
  id: number | string,
  payload: CampaignPayload,
): Promise<Campaign> {
  const res = asRecord(unwrapData(await ApiService.patch(campaignEndpoints.byId(id), payload)));
  return normalizeCampaign(asRecord(res?.campaign) ?? res);
}

export async function deleteCampaign(id: number | string): Promise<void> {
  unwrapData(await ApiService.delete(campaignEndpoints.byId(id)));
}

/** The email as HTML. Accepts a raw HTML body or `{ html }`. */
export async function fetchCampaignPreview(id: number | string): Promise<string> {
  const res = await ApiService.get(campaignEndpoints.preview(id), {
    headers: { Accept: "text/html, application/json" },
  });
  if (typeof res === "string") return res;
  const body = asRecord(unwrapData(res));
  return (
    toStr(body?.html) ??
    toStr(pick(body, "html")) ??
    toStr(body?.preview) ??
    toStr(asRecord(body?.preview)?.html) ??
    ""
  );
}

export async function sendCampaignTest(id: number | string): Promise<string | null> {
  const res = await ApiService.post(campaignEndpoints.test(id));
  unwrapData(res);
  return toStr(asRecord(res)?.message);
}

/** Send now, or schedule with "YYYY-MM-DD HH:mm" (salon clock). */
export async function sendCampaign(
  id: number | string,
  scheduledAt?: string | null,
): Promise<{ campaign: Campaign | null; message: string | null }> {
  const res = await ApiService.post(
    campaignEndpoints.send(id),
    scheduledAt ? { scheduled_at: scheduledAt } : {},
  );
  const body = asRecord(unwrapData(res));
  return {
    campaign: body && (body.id || asRecord(body.campaign))
      ? normalizeCampaign(asRecord(body.campaign) ?? body)
      : null,
    message: toStr(asRecord(res)?.message),
  };
}

export async function cancelCampaign(id: number | string): Promise<void> {
  unwrapData(await ApiService.post(campaignEndpoints.cancel(id)));
}

export async function fetchCampaignRecipients(
  id: number | string,
  status: CampaignRecipientStatus,
  page = 1,
): Promise<{ items: CampaignRecipient[]; meta: CampaignListMeta }> {
  const res = await ApiService.get(campaignEndpoints.recipients(id, { status, page }));
  const { rows, level, outer } = unwrapList(res);
  return {
    items: rows.map(normalizeRecipient).filter(Boolean) as CampaignRecipient[],
    meta: normalizeMeta(level.meta ?? outer.meta, rows.length),
  };
}

/** First field error → message → fallback (api.ts rejects with err.data). */
export function campaignErrorText(err: any, fallback: string): string {
  const errors = asRecord(err?.data?.errors ?? err?.response?.data?.errors);
  if (errors) {
    for (const v of Object.values(errors)) {
      const text = Array.isArray(v) ? toStr(v[0]) : toStr(v);
      if (text) return text;
    }
  }
  return toStr(err?.data?.message) ?? toStr(err?.message) ?? fallback;
}

/** Staff get 403 on every campaign route. */
export const isCampaignForbidden = (err: any): boolean =>
  (err?.status ?? err?.response?.status) === 403 && !err?.isAccountSuspended;
