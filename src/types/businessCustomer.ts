/**
 * Owner customer list + Import Customers
 * (backend guide: customer-list-import-app-guide.md). camelCase from the server.
 */

export type CustomerSource = "booking" | "walk_in" | "import" | (string & {});
export type CustomerHistory = "yes" | "no" | "unknown";
export type CustomerEmailStatus = "subscribed" | "unsubscribed" | "unknown";
export type CustomerSuppression = "bounced" | "complained" | "invalid" | null;

export interface BusinessCustomerRecord {
  /** Customer record id (not a user id) */
  id: number;
  /** Null for an imported customer with no FreshPass account */
  userId: number | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  source: CustomerSource | null;
  sources: CustomerSource[];
  history: CustomerHistory;
  lastVisitOn: string | null;
  lastVisitSource: CustomerSource | null;
  daysSinceVisit: number | null;
  nextAppointmentOn: string | null;
  emailStatus: CustomerEmailStatus;
  suppression: CustomerSuppression;
  canReceiveOffers: boolean;
  hasAccount: boolean;
}

export interface CustomerUpcomingAppointment {
  id: number | null;
  date: string | null;
  time: string | null;
  services: string[];
  staffName: string | null;
}

export interface CustomerVisit {
  id: number | null;
  date: string | null;
  time: string | null;
  status: string | null;
  countsAsVisit: boolean;
  source: CustomerSource | null;
  services: string[];
  staffName: string | null;
  amount: number | null;
}

export interface CustomerEmailHistoryItem {
  status: string | null;
  source: string | null;
  note: string | null;
  date: string | null;
}

export interface BusinessCustomerDetail extends BusinessCustomerRecord {
  upcomingAppointment: CustomerUpcomingAppointment | null;
  visits: CustomerVisit[];
  emailHistory: CustomerEmailHistoryItem[];
}

export interface BusinessCustomerListParams {
  search?: string;
  source?: "booking" | "walk_in" | "import";
  history?: CustomerHistory;
  email_status?: CustomerEmailStatus | "suppressed";
  inactive_days?: number;
  last_visit_from?: string;
  last_visit_to?: string;
  has_upcoming?: 0 | 1;
  import_id?: number | string;
  sort?: "last_visit" | "name" | "created_at";
  direction?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

export interface BusinessCustomerListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/** PATCH /api/business-customers/{id} */
export interface BusinessCustomerUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  history?: "yes" | "no";
  last_visit_on?: string;
  email_status?: "subscribed" | "unsubscribed";
  email_consent_on?: string;
  email_consent_source?: string;
  permission_confirmed?: boolean;
}

// ── Import ──────────────────────────────────────────────────────────

export type ImportStatus = "uploaded" | "previewed" | "completed" | (string & {});
export type ImportRowStatus = "valid" | "duplicate" | "invalid" | "conflict" | (string & {});
export type ImportRowAction = "create" | "update" | "skip" | (string & {});

/** Field keys the server maps to file columns */
export type ImportFieldKey =
  | "first_name"
  | "last_name"
  | "full_name"
  | "email"
  | "phone"
  | "last_completed_visit_date"
  | "previous_customer"
  | "email_marketing_status"
  | "email_consent_date"
  | "email_consent_source"
  | (string & {});

export interface ImportField {
  key: ImportFieldKey;
  label: string | null;
  required: boolean;
}

export interface ImportSummary {
  valid: number;
  invalid: number;
  duplicate: number;
  conflict: number;
  skipping: number;
  needsDecision: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface CustomerImport {
  id: number;
  fileName: string | null;
  fileType: string | null;
  status: ImportStatus;
  sheets: string[];
  sheet: string | null;
  headerRow: number | null;
  /** Column names on the header row (index = column index) */
  columns: string[];
  /** field → 0-based column index, or null */
  mapping: Record<string, number | null>;
  fields: ImportField[];
  totalRows: number;
  summary: ImportSummary;
  createdAt: string | null;
}

export interface ImportRow {
  id: number;
  rowNumber: number | null;
  status: ImportRowStatus;
  action: ImportRowAction | null;
  errors: string[];
  warnings: string[];
  /** What the server read (snake_case field keys) */
  data: Record<string, string | null>;
  /** The file's cells */
  /** File cells: label = column name when the server keys them by column */
  raw: { label: string | null; value: string }[];
  candidateIds: number[];
}

export interface ImportRowPatch {
  data?: Partial<
    Record<
      | "first_name"
      | "last_name"
      | "email"
      | "phone"
      | "last_visit_on"
      | "previous_customer"
      | "email_status"
      | "consent_on"
      | "consent_source",
      string | null
    >
  >;
  action?: "skip" | "create" | "update";
  match_customer_id?: number;
}
