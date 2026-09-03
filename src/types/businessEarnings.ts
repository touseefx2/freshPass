export type RevenueSourceFilter =
  | "all"
  | "subscription"
  | "appointment"
  | "tip"
  | "other";

export type PaymentStatusFilter =
  | "all"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type TransactionTypeFilter = "all" | "charge" | "refund";

export type EarningsTransactionStatus =
  | "paid"
  | "refunded"
  | "partially_refunded";

export type EarningsRevenueSource =
  | "subscription"
  | "appointment"
  | "tip"
  | "other";

export type StaffIdFilter = number | "all";

export interface EarningsFilters {
  revenueSource?: RevenueSourceFilter;
  paymentStatus?: PaymentStatusFilter;
  transactionType?: TransactionTypeFilter;
  staffId?: StaffIdFilter;
}

export interface EarningsQueryParams extends EarningsFilters {
  month?: string;
  page?: number;
  per_page?: number;
}

export interface EarningsPeriod {
  type: "month" | "range";
  month: string | null;
  label: string;
  from: string;
  to: string;
  timezone: string;
}

export interface EarningsStaffRef {
  id: number;
  name: string | null;
  profileImage: string | null;
  active: boolean;
  removed: boolean;
}

export interface EarningsSummary {
  grossEarnings: number;
  totalDeductions: number;
  netEarnings: number;
  transactionsCount: number;
  refundsCount: number;
  hasActivity: boolean;
}

export interface EarningsRevenue {
  subscriptionRevenue: number;
  appointmentRevenue: number;
  tipRevenue: number;
  otherRevenue: number;
  total: number;
}

export interface EarningsDeductions {
  stripeFees: number;
  platformFees: number;
  refunds: number;
  refundedPlatformFees: number;
  otherDeductions: number;
  total: number;
}

export interface RevenueBySourceRow {
  source: EarningsRevenueSource;
  label: string;
  gross: number;
  stripeFees: number;
  platformFees: number;
  refunds: number;
  refundedPlatformFees: number;
  net: number;
  transactions: number;
  refundsCount: number;
  transactionsMissingFeeData: number;
}

export interface TipRecipient {
  recipientType: "staff" | "business";
  recipientStaffId: number | null;
  recipientName: string | null;
  amount: number;
  count: number;
}

export interface EarningsTips {
  total: number;
  count: number;
  byRecipient: TipRecipient[];
}

export interface CollectedAtLocation {
  total: number;
  appointmentsCount: number;
  includedInGross: boolean;
  note: string;
}

export interface FeeDataCoverage {
  transactionsWithFeeData: number;
  transactionsMissingFeeData: number;
  isComplete: boolean;
}

export interface EarningsPayouts {
  available: boolean;
  note: string;
}

export interface EarningsReport {
  period: EarningsPeriod;
  currency: string;
  filters: {
    revenueSource: RevenueSourceFilter;
    transactionType: TransactionTypeFilter;
    paymentStatus: PaymentStatusFilter;
    staffId: number | null;
  };
  staff: EarningsStaffRef | null;
  summary: EarningsSummary;
  revenue: EarningsRevenue;
  deductions: EarningsDeductions;
  revenueBySource: RevenueBySourceRow[];
  tips: EarningsTips;
  collectedAtLocation: CollectedAtLocation;
  feeDataCoverage: FeeDataCoverage;
  payouts: EarningsPayouts;
}

export interface EarningsMonthRow {
  month: string;
  label: string;
  grossEarnings: number;
  totalDeductions: number;
  netEarnings: number;
  transactionsCount: number;
  hasActivity: boolean;
}

export interface StaffEarningsRevenue {
  subscriptionRevenue: number;
  appointmentRevenue: number;
  tipRevenue: number;
  otherRevenue: number;
}

export interface StaffEarningsRow {
  staffId: number | null;
  name: string;
  profileImage: string | null;
  active: boolean | null;
  removed: boolean;
  isUnassigned: boolean;
  grossEarnings: number;
  stripeFees: number;
  platformFees: number;
  refunds: number;
  refundedPlatformFees: number;
  totalDeductions: number;
  netEarnings: number;
  revenue: StaffEarningsRevenue;
  transactionsCount: number;
  refundsCount: number;
  transactionsMissingFeeData: number;
}

export interface StaffEarningsReport {
  period: EarningsPeriod;
  currency: string;
  filters: {
    revenueSource: RevenueSourceFilter;
    transactionType: TransactionTypeFilter;
    paymentStatus: PaymentStatusFilter;
  };
  totals: {
    grossEarnings: number;
    totalDeductions: number;
    netEarnings: number;
    transactionsCount: number;
    staffCount: number;
  };
  staff: StaffEarningsRow[];
}

export interface EarningsTransaction {
  id: number;
  source: EarningsRevenueSource;
  sourceLabel: string;
  description: string;
  customerName: string | null;
  amount: number;
  /** null means Stripe has not reported a fee. Render as "—", never 0. */
  stripeFee: number | null;
  platformFee: number | null;
  netAmount: number;
  refundAmount: number;
  refundedAt: string | null;
  status: EarningsTransactionStatus;
  paidAt: string | null;
  cardLastFour: string | null;
  receiptUrl: string | null;
  appointmentId: number | null;
  subscriptionId: number | null;
  tipRecipientName: string | null;
  staffId: number | null;
  staffName: string | null;
}

export interface EarningsTransactionsMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  hasMore: boolean;
}

export interface EarningsReportApiResponse {
  success: boolean;
  message: string;
  data: EarningsReport;
}

export interface EarningsMonthsApiResponse {
  success: boolean;
  message: string;
  data: {
    months: EarningsMonthRow[];
  };
}

export interface StaffEarningsApiResponse {
  success: boolean;
  message: string;
  data: StaffEarningsReport;
}

export interface EarningsTransactionsApiResponse {
  success: boolean;
  message: string;
  data: {
    data: EarningsTransaction[];
    meta: EarningsTransactionsMeta;
  };
}
