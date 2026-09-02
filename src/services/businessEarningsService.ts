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
  TransactionTypeFilter,
} from "@/src/types/businessEarnings";

export const EARNINGS_PREVIEW_PER_PAGE = 5;
export const EARNINGS_TRANSACTIONS_PER_PAGE = 20;
export const EARNINGS_MONTHS_COUNT = 12;

export const DEFAULT_EARNINGS_FILTERS: Required<EarningsFilters> = {
  revenueSource: "all",
  paymentStatus: "all",
  transactionType: "all",
};

function toQueryFilters(filters: EarningsFilters = {}) {
  return {
    revenue_source: (filters.revenueSource ?? "all") as RevenueSourceFilter,
    payment_status: (filters.paymentStatus ?? "all") as PaymentStatusFilter,
    transaction_type: (filters.transactionType ??
      "all") as TransactionTypeFilter,
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

export async function fetchEarningsMonths(
  months: number = EARNINGS_MONTHS_COUNT,
): Promise<EarningsMonthRow[]> {
  const response = await ApiService.get<EarningsMonthsApiResponse>(
    businessEarningsEndpoints.months(months),
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
