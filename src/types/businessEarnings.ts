export type RevenueSourceFilter =
  | "all"
  | "subscription"
  | "appointment"
  | "tip"
  | "product"
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
  | "product"
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
  /** Business owner working as staff. At most one row. */
  isOwner?: boolean;
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
  /** Optional: older backends omit it. */
  productRevenue?: number;
  otherRevenue: number;
  total: number;
}

/** Period for the business home + Transactions screens. Never both shapes. */
export type EarningsPeriodQuery =
  | { month: string }
  | { from_date: string; to_date: string };

export interface OverviewLine {
  amount: number;
  count: number;
}

/**
 * Gross money taken in the period: online payments + confirmed shop visits +
 * confirmed cash tips. The four tiles + `other` add up to `totalRevenue`.
 */
export interface EarningsOverview {
  totalRevenue: number;
  onlineRevenue: number;
  inPersonRevenue: number;
  transactionsCount: number;
  services: OverviewLine;
  tips: OverviewLine;
  /** amount = membership charges; visits = completed visits a membership covered */
  memberships: OverviewLine & { visits: number };
  /** Missing for staff logins: products belong to the business */
  products?: OverviewLine;
  /** Cancellation and no-show fees */
  other: OverviewLine;
}

export interface RevenueChartPoint {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface RevenueChart {
  granularity: "hour" | "day" | "month";
  /** Empty buckets included with amount 0 */
  points: RevenueChartPoint[];
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

/** "I paid at the salon" claims the business hasn't confirmed yet. */
export interface CollectedAwaitingConfirmation {
  total: number;
  appointmentsCount: number;
}

/** Cash tips the business confirmed. Not in the online `tips` block. */
export interface CollectedCashTips {
  total: number;
  count: number;
}

export interface CollectedAtLocation {
  /** Confirmed in-person payments only. */
  total: number;
  appointmentsCount: number;
  includedInGross: boolean;
  note: string;
  /** NOT part of `total`. Optional: older backends omit it. */
  awaitingConfirmation?: CollectedAwaitingConfirmation;
  /** Optional: older backends omit it. */
  cashTips?: CollectedCashTips;
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
  /** Optional: older backends omit it. */
  overview?: EarningsOverview;
  /** Optional: older backends omit it. */
  chart?: RevenueChart;
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
  /** Always 0 for a person: product sales go to the business row */
  productRevenue?: number;
  otherRevenue: number;
}

export interface StaffEarningsRow {
  staffId: number | null;
  name: string;
  profileImage: string | null;
  active: boolean | null;
  removed: boolean;
  /** Business owner working as staff. Never true with isUnassigned. */
  isOwner?: boolean;
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
  /** True when credited staff is the business owner-as-staff. */
  staffIsOwner?: boolean;
  /**
   * Fields below come only with include_in_person=1 (and newer backends).
   * `id` is the id of that kind of record, so key rows by kind + id.
   */
  kind?: EarningsTransactionKind;
  paymentMethod?: EarningsPaymentMethod;
  /** in_person rows (incl. cash_tip, which can be a card tip): cash · card_terminal */
  inPersonMethod?: "cash" | "card_terminal" | null;
  customerImage?: string | null;
  /** ISO 8601 */
  occurredAt?: string | null;
  /** YYYY-MM-DD */
  appointmentDate?: string | null;
  /** HH:mm */
  appointmentTime?: string | null;
  orderId?: number | null;
}

export type EarningsTransactionKind =
  | "payment"
  | "in_person"
  | "cash_tip"
  | "membership_visit";

export type EarningsPaymentMethod = "online" | "in_person" | "membership";

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
