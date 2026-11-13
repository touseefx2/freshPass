import { Platform, TurboModuleRegistry } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { ApiService } from "./api";
import { store } from "@/src/state/store";
import type {
  BusinessCustomerDetail,
  BusinessCustomerListMeta,
  BusinessCustomerListParams,
  BusinessCustomerRecord,
  BusinessCustomerUpdate,
  CustomerEmailHistoryItem,
  CustomerImport,
  CustomerVisit,
  ImportField,
  ImportRow,
  ImportRowPatch,
  ImportSummary,
} from "@/src/types/businessCustomer";

// Owner customer list + Import Customers. The server reads import files and
// checks every row; the app uploads and shows what comes back.

const BASE = "/api/business-customers";

type AnyRecord = Record<string, any>;

const query = (params: Record<string, unknown>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    q.append(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const businessCustomerEndpoints = {
  list: (params: BusinessCustomerListParams = {}) =>
    `${BASE}${query(params as Record<string, unknown>)}`,
  byId: (id: number | string) => `${BASE}/${id}`,
  template: (format: "csv" | "xlsx") => `${BASE}/import-template?format=${format}`,
  imports: `${BASE}/imports`,
  importById: (id: number | string) => `${BASE}/imports/${id}`,
  importSheet: (id: number | string) => `${BASE}/imports/${id}/sheet`,
  importPreview: (id: number | string) => `${BASE}/imports/${id}/preview`,
  importRows: (id: number | string, params: { status?: string; page?: number } = {}) =>
    `${BASE}/imports/${id}/rows${query(params)}`,
  importRow: (id: number | string, rowId: number | string) =>
    `${BASE}/imports/${id}/rows/${rowId}`,
  skipProblems: (id: number | string) => `${BASE}/imports/${id}/skip-problems`,
  confirm: (id: number | string) => `${BASE}/imports/${id}/confirm`,
  errors: (id: number | string) => `${BASE}/imports/${id}/errors`,
};

// ── Helpers ──────────────────────────────────────────────────────────

const asRecord = (value: unknown): AnyRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const toStr = (value: unknown): string | null => {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value : null;
};

const toBool = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true";

const pick = (r: AnyRecord, camel: string, snake: string) =>
  r[camel] !== undefined ? r[camel] : r[snake];

const toStrList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const s = toStr(value);
    return s ? [s] : [];
  }
  return value
    .map((v) => {
      if (typeof v === "string" || typeof v === "number") return String(v);
      const r = asRecord(v);
      return r ? toStr(r.name ?? r.title ?? r.label ?? r.message) : null;
    })
    .filter((v): v is string => !!v && !!v.trim());
};

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

/** `{ success, data: { data: [...], meta } }`, `{ data: [...], meta }` or a bare array. */
function unwrapList(res: unknown): { rows: unknown[]; meta: AnyRecord | null; outer: AnyRecord | null } {
  const body = asRecord(res);
  let inner: unknown = body && "success" in body ? body.data : res;
  if (Array.isArray(inner)) {
    return { rows: inner, meta: asRecord(body?.meta), outer: body };
  }
  const page = asRecord(inner);
  if (!page) return { rows: [], meta: null, outer: body };
  if (!Array.isArray(page.data) && asRecord(page.data)?.data) inner = page.data;
  const level = asRecord(inner) ?? {};
  return {
    rows: Array.isArray(level.data) ? level.data : [],
    meta: asRecord(level.meta ?? page.meta ?? body?.meta),
    outer: page,
  };
}

function normalizeMeta(m: AnyRecord | null, count: number): BusinessCustomerListMeta {
  return {
    current_page: toNum(m?.current_page ?? m?.currentPage) ?? 1,
    per_page: toNum(m?.per_page ?? m?.perPage) ?? 20,
    total: toNum(m?.total) ?? count,
    last_page: Math.max(1, toNum(m?.last_page ?? m?.lastPage) ?? 1),
  };
}

// ── Normalizers ─────────────────────────────────────────────────────

export function normalizeCustomerRecord(value: unknown): BusinessCustomerRecord {
  const r = asRecord(value) ?? {};
  const firstName = toStr(pick(r, "firstName", "first_name"));
  const lastName = toStr(pick(r, "lastName", "last_name"));
  const name =
    toStr(r.name) ?? [firstName, lastName].filter(Boolean).join(" ").trim();
  const history = toStr(r.history);
  const emailStatus = toStr(pick(r, "emailStatus", "email_status"));
  const suppression = toStr(r.suppression);
  return {
    id: toNum(r.id) ?? 0,
    userId: toNum(pick(r, "userId", "user_id")),
    name: name || "",
    firstName,
    lastName,
    email: toStr(r.email),
    phone: toStr(r.phone),
    profileImageUrl: toStr(
      pick(r, "profileImageUrl", "profile_image_url") ?? r.avatar ?? r.image_url,
    ),
    source: toStr(r.source),
    sources: toStrList(r.sources),
    history: history === "yes" || history === "no" ? history : "unknown",
    lastVisitOn: toStr(pick(r, "lastVisitOn", "last_visit_on")),
    lastVisitSource: toStr(pick(r, "lastVisitSource", "last_visit_source")),
    daysSinceVisit: toNum(pick(r, "daysSinceVisit", "days_since_visit")),
    nextAppointmentOn: toStr(pick(r, "nextAppointmentOn", "next_appointment_on")),
    emailStatus:
      emailStatus === "subscribed" || emailStatus === "unsubscribed"
        ? emailStatus
        : "unknown",
    suppression:
      suppression === "bounced" ||
      suppression === "complained" ||
      suppression === "invalid"
        ? suppression
        : null,
    canReceiveOffers: toBool(pick(r, "canReceiveOffers", "can_receive_offers")),
    hasAccount: toBool(pick(r, "hasAccount", "has_account")),
  };
}

function normalizeVisit(value: unknown): CustomerVisit | null {
  const r = asRecord(value);
  if (!r) return null;
  const counts = pick(r, "countsAsVisit", "counts_as_visit");
  return {
    id: toNum(r.id),
    date: toStr(r.date),
    time: toStr(r.time),
    status: toStr(r.status),
    countsAsVisit: counts === undefined ? true : toBool(counts),
    source: toStr(r.source),
    services: toStrList(r.services),
    staffName: toStr(pick(r, "staffName", "staff_name")),
    amount: toNum(r.amount),
  };
}

function normalizeEmailHistory(value: unknown): CustomerEmailHistoryItem | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    status: toStr(r.status ?? pick(r, "emailStatus", "email_status") ?? r.to ?? r.action),
    source: toStr(r.source),
    note: toStr(r.note),
    date: toStr(
      r.date ??
        pick(r, "changedAt", "changed_at") ??
        pick(r, "createdAt", "created_at") ??
        pick(r, "consentOn", "consent_on"),
    ),
  };
}

export function normalizeCustomerDetail(value: unknown): BusinessCustomerDetail {
  const r = asRecord(value) ?? {};
  const record = asRecord(r.customer) ?? r;
  const up = asRecord(pick(r, "upcomingAppointment", "upcoming_appointment"));
  return {
    ...normalizeCustomerRecord(record),
    upcomingAppointment: up
      ? {
          id: toNum(up.id),
          date: toStr(up.date ?? pick(up, "appointmentDate", "appointment_date")),
          time: toStr(up.time ?? pick(up, "appointmentTime", "appointment_time")),
          services: toStrList(up.services),
          staffName: toStr(pick(up, "staffName", "staff_name")),
        }
      : null,
    visits: (Array.isArray(r.visits) ? r.visits : [])
      .map(normalizeVisit)
      .filter(Boolean) as CustomerVisit[],
    emailHistory: (Array.isArray(pick(r, "emailHistory", "email_history"))
      ? pick(r, "emailHistory", "email_history")
      : []
    )
      .map(normalizeEmailHistory)
      .filter(Boolean) as CustomerEmailHistoryItem[],
  };
}

const DEFAULT_FIELDS: ImportField[] = [
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone",
  "last_completed_visit_date",
  "previous_customer",
  "email_marketing_status",
  "email_consent_date",
  "email_consent_source",
].map((key) => ({ key, label: null, required: false }));

function normalizeSummary(value: unknown): ImportSummary {
  const s = asRecord(value) ?? {};
  const n = (camel: string, snake?: string) =>
    toNum(snake ? pick(s, camel, snake) : s[camel]) ?? 0;
  return {
    valid: n("valid"),
    invalid: n("invalid"),
    duplicate: n("duplicate"),
    conflict: n("conflict"),
    skipping: n("skipping"),
    needsDecision: n("needsDecision", "needs_decision"),
    created: n("created"),
    updated: n("updated"),
    skipped: n("skipped"),
    failed: n("failed"),
  };
}

function normalizeFields(value: unknown): ImportField[] {
  if (Array.isArray(value) && value.length) {
    const out = value
      .map((f) => {
        if (typeof f === "string") return { key: f, label: null, required: false };
        const r = asRecord(f);
        const key = r ? toStr(r.key ?? r.name ?? r.field) : null;
        return key
          ? { key, label: toStr(r!.label), required: toBool(r!.required) }
          : null;
      })
      .filter(Boolean) as ImportField[];
    if (out.length) return out;
  }
  const r = asRecord(value);
  if (r && Object.keys(r).length) {
    // { first_name: "First name", ... } or { first_name: { label, required } }
    return Object.entries(r).map(([key, v]) => {
      const meta = asRecord(v);
      return {
        key,
        label: meta ? toStr(meta.label) : toStr(v),
        required: meta ? toBool(meta.required) : false,
      };
    });
  }
  return DEFAULT_FIELDS;
}

export function normalizeImport(value: unknown): CustomerImport {
  const r = asRecord(value) ?? {};
  const imp = asRecord(r.import) ?? r;
  const mappingRaw = asRecord(imp.mapping) ?? {};
  const mapping: Record<string, number | null> = {};
  Object.entries(mappingRaw).forEach(([key, v]) => {
    mapping[key] = toNum(v);
  });
  const sheets = Array.isArray(imp.sheets)
    ? imp.sheets
        .map((s: unknown) => (typeof s === "string" ? s : toStr(asRecord(s)?.name)))
        .filter((s: string | null): s is string => !!s)
    : [];
  return {
    id: toNum(imp.id) ?? 0,
    fileName: toStr(pick(imp, "fileName", "file_name")),
    fileType: toStr(pick(imp, "fileType", "file_type")),
    status: toStr(imp.status) ?? "uploaded",
    sheets,
    sheet: toStr(imp.sheet),
    headerRow: toNum(pick(imp, "headerRow", "header_row")),
    columns: Array.isArray(imp.columns)
      ? imp.columns.map((c: unknown) =>
          typeof c === "string" || typeof c === "number"
            ? String(c)
            : (toStr(asRecord(c)?.name ?? asRecord(c)?.label) ?? ""),
        )
      : [],
    mapping,
    fields: normalizeFields(imp.fields),
    totalRows: toNum(pick(imp, "totalRows", "total_rows")) ?? 0,
    summary: normalizeSummary(imp.summary ?? r.summary),
    createdAt: toStr(pick(imp, "createdAt", "created_at")),
  };
}

export function normalizeImportRow(value: unknown): ImportRow {
  const r = asRecord(value) ?? {};
  const dataRaw = asRecord(r.data) ?? {};
  const data: Record<string, string | null> = {};
  Object.entries(dataRaw).forEach(([key, v]) => {
    data[key] = toStr(v);
  });
  // `raw` is keyed by the file's column names (array kept as a fallback)
  const rawCells = Array.isArray(r.raw)
    ? r.raw.map((c: unknown) => ({ label: null, value: c == null ? "" : String(c) }))
    : Object.entries(asRecord(r.raw) ?? {}).map(([label, c]) => ({
        label,
        value: c == null ? "" : String(c),
      }));
  const candidates = pick(r, "candidateIds", "candidate_ids");
  return {
    id: toNum(r.id) ?? 0,
    rowNumber: toNum(pick(r, "rowNumber", "row_number") ?? r.row ?? r.line),
    status: toStr(r.status) ?? "valid",
    action: toStr(r.action),
    errors: toStrList(r.errors),
    warnings: toStrList(r.warnings),
    data,
    raw: rawCells,
    candidateIds: Array.isArray(candidates)
      ? candidates.map(toNum).filter((n: number | null): n is number => n != null)
      : [],
  };
}

// ── Errors ───────────────────────────────────────────────────────────

/** Field → first message (keys like `data.email` → `email`). */
export function customerFieldErrors(err: any): Record<string, string> {
  const errors = asRecord(err?.data?.errors ?? err?.response?.data?.errors);
  const out: Record<string, string> = {};
  if (!errors) return out;
  Object.entries(errors).forEach(([key, v]) => {
    const text = Array.isArray(v) ? toStr(v[0]) : toStr(v);
    const parts = key.split(".");
    const field = parts[0] === "data" && parts[1] ? parts[1] : parts[0];
    if (text && !out[field]) out[field] = text;
  });
  return out;
}

export function customerErrorText(err: any, fallback: string): string {
  const errors = asRecord(err?.data?.errors ?? err?.response?.data?.errors);
  if (errors) {
    for (const v of Object.values(errors)) {
      const text = Array.isArray(v) ? toStr(v[0]) : toStr(v);
      if (text) return text;
    }
  }
  return toStr(err?.data?.message) ?? toStr(err?.message) ?? fallback;
}

export const isForbiddenError = (err: any) =>
  (err?.status ?? err?.response?.status) === 403;

// ── Customer list ────────────────────────────────────────────────────

export async function listBusinessCustomers(
  params: BusinessCustomerListParams = {},
): Promise<{ items: BusinessCustomerRecord[]; meta: BusinessCustomerListMeta }> {
  const { rows, meta } = unwrapList(
    await ApiService.get(businessCustomerEndpoints.list(params), { timeout: 45_000 }),
  );
  const items = rows.map(normalizeCustomerRecord);
  return { items, meta: normalizeMeta(meta, items.length) };
}

/** Just the total (a per_page=1 query). */
export async function countBusinessCustomers(
  params: BusinessCustomerListParams = {},
): Promise<number> {
  const { meta } = await listBusinessCustomers({ ...params, per_page: 1, page: 1 });
  return meta.total;
}

export async function getBusinessCustomerRecord(
  id: number | string,
): Promise<BusinessCustomerDetail> {
  return normalizeCustomerDetail(
    unwrapData(await ApiService.get(businessCustomerEndpoints.byId(id))),
  );
}

export async function updateBusinessCustomerRecord(
  id: number | string,
  body: BusinessCustomerUpdate,
): Promise<BusinessCustomerDetail> {
  return normalizeCustomerDetail(
    unwrapData(await ApiService.patch(businessCustomerEndpoints.byId(id), body)),
  );
}

// ── Import ───────────────────────────────────────────────────────────

export async function uploadCustomerImport(file: {
  uri: string;
  name: string;
  mimeType?: string | null;
}): Promise<CustomerImport> {
  const form = new FormData();
  const lower = file.name.toLowerCase();
  const type =
    file.mimeType ||
    (lower.endsWith(".csv")
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  form.append("file", { uri: file.uri, name: file.name, type } as any);
  return normalizeImport(
    unwrapData(
      await ApiService.post(businessCustomerEndpoints.imports, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      }),
    ),
  );
}

export async function setImportSheet(
  id: number | string,
  body: { sheet?: string | null; header_row?: number | null },
): Promise<CustomerImport> {
  return normalizeImport(
    unwrapData(await ApiService.post(businessCustomerEndpoints.importSheet(id), body)),
  );
}

export async function previewCustomerImport(
  id: number | string,
  body: {
    mapping: Record<string, number | null>;
    permission_confirmed: boolean;
    permission_note: string | null;
  },
): Promise<CustomerImport> {
  return normalizeImport(
    unwrapData(
      await ApiService.post(businessCustomerEndpoints.importPreview(id), body, {
        timeout: 120_000,
      }),
    ),
  );
}

export async function listImportRows(
  id: number | string,
  params: { status?: string; page?: number } = {},
): Promise<{ items: ImportRow[]; meta: BusinessCustomerListMeta }> {
  const { rows, meta } = unwrapList(
    await ApiService.get(businessCustomerEndpoints.importRows(id, params)),
  );
  const items = rows.map(normalizeImportRow);
  return { items, meta: normalizeMeta(meta, items.length) };
}

export async function updateImportRow(
  id: number | string,
  rowId: number | string,
  body: ImportRowPatch,
): Promise<{ row: ImportRow; summary: ImportSummary }> {
  const res = asRecord(
    unwrapData(await ApiService.patch(businessCustomerEndpoints.importRow(id, rowId), body)),
  ) ?? {};
  return {
    row: normalizeImportRow(res.row ?? res),
    summary: normalizeSummary(res.summary),
  };
}

export async function skipImportProblems(id: number | string): Promise<CustomerImport> {
  return normalizeImport(
    unwrapData(await ApiService.post(businessCustomerEndpoints.skipProblems(id))),
  );
}

export async function confirmCustomerImport(id: number | string): Promise<CustomerImport> {
  return normalizeImport(
    unwrapData(
      await ApiService.post(businessCustomerEndpoints.confirm(id), undefined, {
        timeout: 120_000,
      }),
    ),
  );
}

export async function getCustomerImport(id: number | string): Promise<CustomerImport> {
  return normalizeImport(
    unwrapData(await ApiService.get(businessCustomerEndpoints.importById(id))),
  );
}

export async function listCustomerImports(): Promise<CustomerImport[]> {
  const { rows } = unwrapList(await ApiService.get(businessCustomerEndpoints.imports));
  return rows.map(normalizeImport);
}

// ── File downloads (template, error report) ──────────────────────────

const MIME: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const absoluteUrl = (path: string) => {
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * Downloads a server file with the signed-in token, then opens the phone share
 * sheet so the owner can save it to Files / Drive or send it on.
 */
async function downloadAndShare(path: string, fileName: string): Promise<void> {
  const token = store.getState().user?.accessToken;
  const dir = `${FileSystem.cacheDirectory ?? ""}customer-files/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const dest = `${dir}${fileName}`;
  await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
  const result = await FileSystem.downloadAsync(absoluteUrl(path), dest, {
    headers: {
      Accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    throw Object.assign(new Error(`Download failed (${result.status})`), {
      status: result.status,
    });
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const canShareFiles =
    Platform.OS !== "web" && TurboModuleRegistry.get("RNShare") != null;
  if (!canShareFiles) {
    throw new Error("share_unavailable");
  }
  // Required lazily: importing it throws when the native module is missing
  const Share = require("react-native-share").default;
  await Share.open({
    url: result.uri,
    type: MIME[ext] ?? "application/octet-stream",
    filename: fileName,
    failOnCancel: false,
  });
}

export function downloadImportTemplate(format: "csv" | "xlsx") {
  return downloadAndShare(
    businessCustomerEndpoints.template(format),
    `freshpass-customers-template.${format}`,
  );
}

export function downloadImportErrors(id: number | string) {
  return downloadAndShare(
    businessCustomerEndpoints.errors(id),
    `import-${id}-errors.csv`,
  );
}
