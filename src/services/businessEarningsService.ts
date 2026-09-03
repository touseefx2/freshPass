import { ApiService } from "./api";
import { businessEarningsEndpoints } from "./endpoints";
import type {
  EarningsFilters,
  EarningsMonthRow,
  EarningsReport,
  EarningsReportApiResponse,
  EarningsMonthsApiResponse,
  EarningsTransaction,
  EarningsTransactionsApiResponse,
  EarningsTransactionsMeta,
  PaymentStatusFilter,
  RevenueSourceFilter,
  StaffEarningsApiResponse,
  StaffEarningsReport,
  StaffIdFilter,
  TransactionTypeFilter,
} from "@/src/types/businessEarnings";

export const EARNINGS_PREVIEW_PER_PAGE = 5;
export const EARNINGS_TRANSACTIONS_PER_PAGE = 20;
export const EARNINGS_MONTHS_COUNT = 12;
export const EARNINGS_STAFF_PREVIEW_COUNT = 3;

export const DEFAULT_EARNINGS_FILTERS: Required<
  Omit<EarningsFilters, "staffId">
> & { staffId: StaffIdFilter } = {
  revenueSource: "all",
  paymentStatus: "all",
  transactionType: "all",
  staffId: "all",
};

function toQueryFilters(filters: EarningsFilters = {}) {
  const staffId = filters.staffId ?? "all";
  return {
    revenue_source: (filters.revenueSource ?? "all") as RevenueSourceFilter,
    payment_status: (filters.paymentStatus ?? "all") as PaymentStatusFilter,
    transaction_type: (filters.transactionType ??
      "all") as TransactionTypeFilter,
    staff_id: staffId === "all" ? undefined : staffId,
  };
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string = "USD",
  options?: { signed?: boolean; showNullAsDash?: boolean },
): string {
  if (amount === null || amount === undefined) {
    return options?.showNullAsDash === false ? `${currency} $0.00` : "—";
  }

  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (options?.signed) {
    if (amount > 0) return `+${currency} $${formatted}`;
    if (amount < 0) return `−${currency} $${formatted}`;
    return `${currency} $${formatted}`;
  }

  if (amount < 0) {
    return `−${currency} $${formatted}`;
  }

  return `${currency} $${formatted}`;
}

export function formatMoneyPlain(
  amount: number | null | undefined,
  currency: string = "USD",
): string {
  if (amount === null || amount === undefined) return "—";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = amount < 0 ? "−" : "";
  return `${prefix}$${formatted}`;
}

export function isDashboardReceiptUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("https://dashboard.stripe.com");
}

export function isViewableReceiptUrl(url: string | null | undefined): boolean {
  return !!url && !isDashboardReceiptUrl(url);
}

export function isStaffIdValidationError(error: unknown): boolean {
  const err = error as {
    status?: number;
    data?: { errors?: Record<string, unknown> };
    response?: { status?: number; data?: { errors?: Record<string, unknown> } };
  };
  const status = err?.status ?? err?.response?.status;
  if (status !== 422) return false;
  const errors = err?.data?.errors ?? err?.response?.data?.errors;
  if (!errors) return true;
  return Object.keys(errors).some(
    (key) => key === "staff_id" || key === "staffId",
  );
}

export async function fetchEarningsMonths(
  months: number = EARNINGS_MONTHS_COUNT,
  staffId: StaffIdFilter = "all",
): Promise<EarningsMonthRow[]> {
  const response = await ApiService.get<EarningsMonthsApiResponse>(
    businessEarningsEndpoints.months(
      months,
      staffId === "all" ? undefined : staffId,
    ),
  );
  return response.data?.months ?? [];
}

export async function fetchEarningsReport(
  month: string,
  filters: EarningsFilters = {},
): Promise<EarningsReport> {
  const queryFilters = toQueryFilters(filters);
  const response = await ApiService.get<EarningsReportApiResponse>(
    businessEarningsEndpoints.report({
      month,
      ...queryFilters,
    }),
  );

  if (!response.data) {
    throw new Error(response.message || "Failed to load earnings report");
  }

  return response.data;
}

export async function fetchStaffEarnings(
  month: string,
  filters: EarningsFilters = {},
): Promise<StaffEarningsReport> {
  const queryFilters = toQueryFilters({ ...filters, staffId: "all" });
  const response = await ApiService.get<StaffEarningsApiResponse>(
    businessEarningsEndpoints.staff({
      month,
      revenue_source: queryFilters.revenue_source,
      payment_status: queryFilters.payment_status,
      transaction_type: queryFilters.transaction_type,
    }),
  );

  if (!response.data) {
    throw new Error(response.message || "Failed to load staff earnings");
  }

  return response.data;
}

export async function fetchEarningsTransactions(
  month: string,
  filters: EarningsFilters = {},
  page: number = 1,
  perPage: number = EARNINGS_TRANSACTIONS_PER_PAGE,
): Promise<{
  transactions: EarningsTransaction[];
  meta: EarningsTransactionsMeta;
}> {
  const queryFilters = toQueryFilters(filters);
  const response = await ApiService.get<EarningsTransactionsApiResponse>(
    businessEarningsEndpoints.transactions({
      month,
      ...queryFilters,
      page,
      per_page: perPage,
    }),
  );

  const transactions = response.data?.data ?? [];
  const meta = response.data?.meta ?? {
    currentPage: page,
    perPage,
    total: transactions.length,
    lastPage: 1,
    hasMore: false,
  };

  return { transactions, meta };
}

/** Current month as YYYY-MM in local calendar (picker default). */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getStaffInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
