import { ApiService } from "./api";
import { classEnrollmentEndpoints, masterClassEndpoints } from "./endpoints";
import { getStripeModeHeaders } from "./stripeService";
import type {
  ClassEnrollment,
  ClassEnrollmentCancelResult,
  ClassEnrollmentFilter,
  ClassEnrollmentListResult,
  ClassEnrollmentPaymentSheet,
  ClassEnrollmentRefund,
  ClassListing,
  ClassListingPaymentSheet,
  ClassStudent,
  ClassStudentListResult,
  MasterClass,
  MasterClassApiError,
  MasterClassCounts,
  MasterClassListMeta,
  MasterClassMineResult,
  MasterClassPayload,
  MasterClassPublicResult,
  MasterClassTab,
  PublicClassListParams,
} from "@/src/types/masterClass";

// Every call answers `{ success, message, data }`; lists put
// `{ data: [...], meta, counts? }` inside `data`. Flat shapes are accepted too.

const EMPTY_META: MasterClassListMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
};
const EMPTY_COUNTS: MasterClassCounts = { upcoming: 0, drafts: 0, past: 0 };
const LIST_TIMEOUT = 15_000;

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

/** Inner payload of `{ success, data }`; throws the server message on success:false. */
function unwrapData(res: unknown, fallback: string): unknown {
  const body = asRecord(res);
  if (!body) return res;
  if (body.success === false) {
    throw Object.assign(new Error(toStr(body.message) ?? fallback), {
      data: body,
    });
  }
  return "data" in body ? body.data : body;
}

/** `{ data: [...], meta, counts }` — also accepts a bare array. */
function unwrapList(res: unknown): {
  rows: unknown[];
  meta: MasterClassListMeta | null;
  counts: AnyRecord | null;
} {
  const body = asRecord(res);
  // { success, data: { data, meta, counts } } or { data: [...], meta }
  let inner: unknown = body && "success" in body ? body.data : res;
  if (Array.isArray(inner)) {
    return {
      rows: inner,
      meta: normalizeMeta(body?.meta),
      counts: asRecord(body?.counts),
    };
  }
  const page = asRecord(inner);
  if (!page) return { rows: [], meta: null, counts: null };
  // Some wrappers nest one level deeper: { data: { data: { data: [...] } } }
  if (!Array.isArray(page.data) && asRecord(page.data)?.data) {
    inner = page.data;
  }
  const level = asRecord(inner) ?? {};
  return {
    rows: Array.isArray(level.data) ? level.data : [],
    meta: normalizeMeta(level.meta ?? page.meta),
    counts: asRecord(level.counts ?? page.counts),
  };
}

function normalizeMeta(value: unknown): MasterClassListMeta | null {
  const m = asRecord(value);
  if (!m) return null;
  return {
    current_page: toNum(m.current_page) ?? 1,
    per_page: toNum(m.per_page) ?? 20,
    total: toNum(m.total) ?? 0,
    last_page: Math.max(1, toNum(m.last_page) ?? 1),
  };
}

// ── Normalizers ─────────────────────────────────────────────────────

function normalizeListing(value: unknown): ClassListing | null {
  const l = asRecord(value);
  if (!l) return null;
  return {
    status: (toStr(l.status) ?? "none") as ClassListing["status"],
    ends_at: toStr(l.ends_at),
    listed_until: toStr(l.listed_until),
    can_renew: toBool(l.can_renew),
    fee: toNum(l.fee) ?? 50,
    days: toNum(l.days) ?? 30,
  };
}

function normalizeMissing(value: unknown): Record<string, string> | null {
  const m = asRecord(value);
  if (!m) return Array.isArray(value) ? {} : null;
  const out: Record<string, string> = {};
  Object.entries(m).forEach(([key, msg]) => {
    const text = Array.isArray(msg) ? msg[0] : msg;
    if (typeof text === "string" && text.trim()) out[key] = text;
  });
  return out;
}

export function normalizeMasterClass(value: unknown): MasterClass {
  const c = asRecord(value) ?? {};
  const media = asRecord(c.media);
  const location = asRecord(c.location);
  const business = asRecord(c.business);
  const myEnrollment = asRecord(c.my_enrollment);
  return {
    ...(c as Partial<MasterClass>),
    id: toNum(c.id) ?? 0,
    title: toStr(c.title) ?? "",
    label: toStr(c.label),
    description: toStr(c.description),
    prerequisites: toStr(c.prerequisites),
    date: toStr(c.date),
    time: toStr(c.time),
    end_date: toStr(c.end_date),
    starts_at: toStr(c.starts_at),
    ends_at: toStr(c.ends_at),
    timezone: toStr(c.timezone),
    duration_minutes: toNum(c.duration_minutes),
    capacity: toNum(c.capacity),
    seats_taken: toNum(c.seats_taken) ?? 0,
    seats_left: toNum(c.seats_left),
    price: toNum(c.price),
    discounted_price: toNum(c.discounted_price),
    enrollment_price: toNum(c.enrollment_price),
    cancellation_window_hours: toNum(c.cancellation_window_hours),
    cancellation_terms: toStr(c.cancellation_terms),
    format: (toStr(c.format) as MasterClass["format"]) ?? null,
    location_type:
      (toStr(c.location_type) as MasterClass["location_type"]) ?? null,
    location: location
      ? {
          address: toStr(location.address),
          latitude: toNum(location.latitude),
          longitude: toNum(location.longitude),
        }
      : null,
    meeting_url: toStr(c.meeting_url ?? c.meetingUrl),
    media: media
      ? {
          id: toNum(media.id) ?? 0,
          type: media.type === "video" ? "video" : "image",
          url: toStr(media.url),
          thumbnail_url: toStr(media.thumbnail_url),
        }
      : null,
    business: business
      ? {
          id: toNum(business.id) ?? 0,
          title: toStr(business.title) ?? "",
          image_url: toStr(business.image_url),
          instructor_name: toStr(business.instructor_name),
          category: business.category ?? null,
        }
      : null,
    status: (toStr(c.status) ?? "draft") as MasterClass["status"],
    can_enroll: "can_enroll" in c ? toBool(c.can_enroll) : undefined,
    my_enrollment: myEnrollment
      ? {
          id: toNum(myEnrollment.id) ?? 0,
          status: (toStr(myEnrollment.status) ??
            "confirmed") as ClassEnrollment["status"],
        }
      : null,
    distance_km: toNum(c.distance_km),
    listing: normalizeListing(c.listing),
    missing: normalizeMissing(c.missing),
  };
}

function normalizeRefund(value: unknown): ClassEnrollmentRefund | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    amount: toNum(r.amount) ?? 0,
    reason: toStr(r.reason),
    status: r.status === "refunded" ? "refunded" : "processing",
  };
}

export function normalizeClassEnrollment(value: unknown): ClassEnrollment {
  const e = asRecord(value) ?? {};
  const cls = e.class ?? e.master_class ?? e.masterClass;
  return {
    id: toNum(e.id) ?? 0,
    status: (toStr(e.status) ?? "pending") as ClassEnrollment["status"],
    amount: toNum(e.amount) ?? 0,
    cancellation_window_hours: toNum(e.cancellation_window_hours),
    cancelled_by: (toStr(e.cancelled_by) as ClassEnrollment["cancelled_by"]) ?? null,
    can_cancel: toBool(e.can_cancel ?? e.canCancel),
    refund_if_cancelled_now:
      toNum(e.refund_if_cancelled_now ?? e.refundIfCancelledNow) ?? 0,
    refund_deadline: toStr(e.refund_deadline ?? e.refundDeadline),
    rescheduled: toBool(e.rescheduled),
    refund: normalizeRefund(e.refund),
    hold_expires_at: toStr(e.hold_expires_at),
    paid_at: toStr(e.paid_at),
    cancelled_at: toStr(e.cancelled_at),
    created_at: toStr(e.created_at),
    class: asRecord(cls) ? normalizeMasterClass(cls) : null,
  };
}

function normalizeStudent(value: unknown): ClassStudent {
  const s = asRecord(value) ?? {};
  const st = asRecord(s.student ?? s.user) ?? {};
  return {
    id: toNum(s.id) ?? 0,
    status: (toStr(s.status) ?? "confirmed") as ClassStudent["status"],
    amount: toNum(s.amount) ?? 0,
    paid_at: toStr(s.paid_at),
    student: {
      id: toNum(st.id),
      name: toStr(st.name) ?? toStr(st.full_name) ?? "",
      email: toStr(st.email),
      phone: toStr(st.phone),
      image_url: toStr(st.image_url ?? st.avatar_url ?? st.profile_image_url),
    },
  };
}

// ── Change events (editor / publish → open lists) ───────────────────

export type MasterClassChange =
  | { type: "saved"; masterClass: MasterClass }
  | { type: "deleted"; id: number };

type MasterClassListener = (change: MasterClassChange) => void;
const listeners = new Set<MasterClassListener>();

/** Lists can patch their copy when a class is saved / deleted elsewhere. */
export function subscribeToMasterClassChanges(
  listener: MasterClassListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(change: MasterClassChange) {
  listeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // a broken listener must never break a save
    }
  });
}

// ── Pro ─────────────────────────────────────────────────────────────

/** GET /master-classes/mine?tab=…&page=… */
export async function listMine(
  tab: MasterClassTab,
  page = 1,
): Promise<MasterClassMineResult> {
  const res = await ApiService.get(masterClassEndpoints.mine({ tab, page }), {
    timeout: LIST_TIMEOUT,
  });
  unwrapData(res, "Failed to load classes");
  const { rows, meta, counts } = unwrapList(res);
  return {
    items: rows.map(normalizeMasterClass),
    meta: meta ?? EMPTY_META,
    counts: {
      upcoming: toNum(counts?.upcoming) ?? EMPTY_COUNTS.upcoming,
      drafts: toNum(counts?.drafts) ?? EMPTY_COUNTS.drafts,
      past: toNum(counts?.past) ?? EMPTY_COUNTS.past,
    },
  };
}

/** POST /master-classes — only `title` is required for a draft. 422 `stripe` when Connect isn't done. */
export async function create(payload: MasterClassPayload): Promise<MasterClass> {
  const res = await ApiService.post(masterClassEndpoints.create, payload);
  const masterClass = normalizeMasterClass(
    unwrapData(res, "Failed to save class"),
  );
  emit({ type: "saved", masterClass });
  return masterClass;
}

/** PATCH /master-classes/{id} — drafts: any field; published: date, time, duration only. */
export async function update(
  id: number | string,
  payload: MasterClassPayload,
): Promise<MasterClass> {
  const res = await ApiService.patch(masterClassEndpoints.byId(id), payload);
  const masterClass = normalizeMasterClass(
    unwrapData(res, "Failed to save class"),
  );
  emit({ type: "saved", masterClass });
  return masterClass;
}

/** DELETE /master-classes/{id} — drafts only. */
export async function remove(id: number | string): Promise<void> {
  const res = await ApiService.delete(masterClassEndpoints.byId(id));
  unwrapData(res, "Failed to delete class");
  emit({ type: "deleted", id: Number(id) });
}

/** POST /master-classes/{id}/duplicate — returns the new draft (no date). */
export async function duplicate(id: number | string): Promise<MasterClass> {
  const res = await ApiService.post(masterClassEndpoints.duplicate(id));
  const masterClass = normalizeMasterClass(
    unwrapData(res, "Failed to duplicate class"),
  );
  emit({ type: "saved", masterClass });
  return masterClass;
}

/** POST /master-classes/{id}/cancel — published only; every student refunded. */
export async function cancel(id: number | string): Promise<MasterClass | null> {
  const res = await ApiService.post(masterClassEndpoints.cancel(id));
  const data = unwrapData(res, "Failed to cancel class");
  if (!asRecord(data)?.id) return null;
  const masterClass = normalizeMasterClass(data);
  emit({ type: "saved", masterClass });
  return masterClass;
}

/** GET /master-classes/{id}/enrollments */
export async function enrollments(
  id: number | string,
  page = 1,
): Promise<ClassStudentListResult> {
  const res = await ApiService.get(
    masterClassEndpoints.enrollments(id, { page }),
    { timeout: LIST_TIMEOUT },
  );
  unwrapData(res, "Failed to load students");
  const { rows, meta } = unwrapList(res);
  return { items: rows.map(normalizeStudent), meta };
}

/** POST /payment-sheet/class-listing — $50 publish or renew. 422 = missing fields. */
export async function listingPaymentSheet(
  id: number | string,
): Promise<ClassListingPaymentSheet> {
  const res = await ApiService.post(
    masterClassEndpoints.listingPaymentSheet,
    { master_class_id: Number(id) },
    { headers: await getStripeModeHeaders() },
  );
  const d = asRecord(unwrapData(res, "Failed to start payment")) ?? {};
  return {
    paymentIntentClientSecret: readSecret(d.paymentIntent ?? d.paymentIntentClientSecret),
    customerId: toStr(d.customerId ?? d.customer) ?? "",
    customerSessionClientSecret:
      toStr(d.customerSessionClientSecret) ??
      (readSecret(d.customerSession) || null),
    amount: toNum(d.amount) ?? 50,
    days: toNum(d.days) ?? 30,
  };
}

// ── Customer ────────────────────────────────────────────────────────

/** GET /master-classes/{id} — public; 404 once no longer listed (unless the viewer holds a seat). */
export async function getClass(id: number | string): Promise<MasterClass> {
  const res = await ApiService.get(masterClassEndpoints.byId(id));
  return normalizeMasterClass(unwrapData(res, "Failed to load class"));
}

/** GET /master-classes — classes listed in Deals right now, soonest first. */
export async function listPublic(
  params: PublicClassListParams = {},
): Promise<MasterClassPublicResult> {
  const res = await ApiService.get(masterClassEndpoints.list(params), {
    timeout: LIST_TIMEOUT,
  });
  unwrapData(res, "Failed to load classes");
  const { rows, meta } = unwrapList(res);
  return { items: rows.map(normalizeMasterClass), meta: meta ?? EMPTY_META };
}

/** POST /payment-sheet/class-enrollment — present WITH connectedAccountId. */
export async function enrollmentPaymentSheet(
  id: number | string,
): Promise<ClassEnrollmentPaymentSheet> {
  const res = await ApiService.post(
    masterClassEndpoints.enrollmentPaymentSheet,
    { master_class_id: Number(id) },
    { headers: await getStripeModeHeaders() },
  );
  const d = asRecord(unwrapData(res, "Failed to start payment")) ?? {};
  return {
    paymentIntentClientSecret: readSecret(d.paymentIntent ?? d.paymentIntentClientSecret),
    customerId: toStr(d.customerId ?? d.customer) ?? "",
    customerSessionClientSecret:
      (readSecret(d.customerSession) || null) ??
      toStr(d.customerSessionClientSecret),
    connectedAccountId: toStr(d.connectedAccountId) ?? "",
    enrollmentId: toNum(d.enrollmentId ?? d.enrollment_id) ?? 0,
    amount: toNum(d.amount) ?? 0,
    holdExpiresAt: toStr(d.holdExpiresAt ?? d.hold_expires_at),
  };
}

/** Accepts a client-secret string or `{ client_secret }`. */
function readSecret(value: unknown): string {
  if (typeof value === "string") return value;
  return toStr(asRecord(value)?.client_secret) ?? "";
}

/** GET /class-enrollments?status=…&page=… — each item carries the full `class`. */
export async function myEnrollments(
  status: ClassEnrollmentFilter,
  page = 1,
): Promise<ClassEnrollmentListResult> {
  const res = await ApiService.get(
    classEnrollmentEndpoints.list({ status, page }),
    { timeout: LIST_TIMEOUT },
  );
  unwrapData(res, "Failed to load classes");
  const { rows, meta } = unwrapList(res);
  return {
    items: rows.map(normalizeClassEnrollment),
    meta: meta ?? EMPTY_META,
  };
}

/** GET /class-enrollments/{id} — poll after paying. */
export async function getEnrollment(
  id: number | string,
): Promise<ClassEnrollment> {
  const res = await ApiService.get(classEnrollmentEndpoints.byId(id));
  return normalizeClassEnrollment(unwrapData(res, "Failed to load enrollment"));
}

/** POST /class-enrollments/{id}/cancel — `refunded` or `cancelled` (no refund). */
export async function cancelEnrollment(
  id: number | string,
): Promise<ClassEnrollmentCancelResult> {
  const res = await ApiService.post(classEnrollmentEndpoints.cancel(id));
  const data = asRecord(unwrapData(res, "Failed to cancel")) ?? {};
  const enrollment = data.id ? normalizeClassEnrollment(data) : null;
  const status =
    (toStr(data.status) ?? enrollment?.status) === "refunded"
      ? "refunded"
      : "cancelled";
  return {
    status,
    enrollment,
    message: toStr(asRecord(res)?.message),
  };
}

// ── Errors ──────────────────────────────────────────────────────────

/**
 * The API client rejects with `Error` + `status` + `data` (response body).
 * Raw axios errors (`response.status` / `response.data`) are read too.
 */
export function parseApiError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): MasterClassApiError {
  const e = asRecord(err) ?? {};
  const response = asRecord(e.response);
  const status = toNum(e.status ?? response?.status);
  const body = asRecord(e.data ?? response?.data);
  const fieldErrors: Record<string, string> = {};
  const errors = asRecord(body?.errors) ?? asRecord(asRecord(body?.data)?.errors);
  if (errors) {
    Object.entries(errors).forEach(([field, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string" && first.trim()) fieldErrors[field] = first;
    });
  }
  // A field message reads better than Laravel's "(and 2 more errors)" summary
  const message =
    Object.values(fieldErrors)[0] ??
    toStr(body?.message) ??
    toStr(body?.error) ??
    (err instanceof Error ? toStr(err.message) : null) ??
    fallback;
  return { status, message, fieldErrors };
}

// ── Polling ─────────────────────────────────────────────────────────

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  /** Return true to stop early (screen unmounted). */
  isCancelled?: () => boolean;
}

export interface PollResult<T> {
  /** Last value fetched (null when every call failed). */
  value: T | null;
  /** True when the predicate matched. */
  matched: boolean;
  timedOut: boolean;
  cancelled: boolean;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Calls `fn` every `intervalMs` until `predicate(value)` is true or
 * `timeoutMs` passes. Failed calls are skipped (network blips while
 * the webhook lands). Defaults: 2 s / 30 s.
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { intervalMs = 2000, timeoutMs = 30000, isCancelled }: PollOptions = {},
): Promise<PollResult<T>> {
  const deadline = Date.now() + timeoutMs;
  let value: T | null = null;
  while (true) {
    if (isCancelled?.()) {
      return { value, matched: false, timedOut: false, cancelled: true };
    }
    try {
      value = await fn();
      if (predicate(value)) {
        return { value, matched: true, timedOut: false, cancelled: false };
      }
    } catch {
      // keep polling
    }
    if (Date.now() + intervalMs > deadline) {
      return { value, matched: false, timedOut: true, cancelled: false };
    }
    await wait(intervalMs);
  }
}

/** Namespace-style access: `masterClassService.listMine(...)`. */
export const masterClassService = {
  listMine,
  create,
  update,
  remove,
  duplicate,
  cancel,
  enrollments,
  getClass,
  listPublic,
  listingPaymentSheet,
  enrollmentPaymentSheet,
  myEnrollments,
  getEnrollment,
  cancelEnrollment,
  parseApiError,
  pollUntil,
  subscribeToMasterClassChanges,
};

export default masterClassService;
