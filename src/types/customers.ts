export type BusinessCustomerSubscriptionService = {
  id: number;
  name: string;
  price: string | null;
  description: string | null;
  durationHours: number | null;
  durationMinutes: number | null;
  /** Allowance per billing period */
  quantity: number;
  /** Taken this period; can exceed quantity after a mid-period cut */
  used: number;
  /** Never negative */
  remaining: number;
};

export type BusinessCustomerServiceTotals = {
  quantity: number;
  used: number;
  remaining: number;
};

/** Plan-wide visit pool — null when the plan counts per service instead */
export type BusinessCustomerVisits = {
  total: number;
  used: number;
  upcoming: number;
  remaining: number;
};

export type BusinessCustomerAppointmentService = {
  id?: number | string;
  name?: string;
  title?: string;
  price?: string | number | null;
  [key: string]: unknown;
};

export type BusinessCustomerSubscriptionAppointment = {
  id: number;
  appointmentDate: string | null;
  appointmentTime: string | null;
  status: string | null;
  bookedAt: string | null;
  services: BusinessCustomerAppointmentService[];
  staffId: number | null;
  staffName: string | null;
  /** Storage path — prefix with API base URL */
  staffImageUrl: string | null;
};

export type BusinessCustomerSubscription = {
  id?: number;
  plan: string;
  planType?: string | null;
  planDescription?: string | null;
  price: number | string;
  status: string;
  stripeStatus?: string | null;
  provider?: string | null;
  hasAccess: boolean;
  startedAt: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  /** Same as hasAccess — whether allowance still tracks the live plan */
  reflectsPlanChanges?: boolean;
  services?: BusinessCustomerSubscriptionService[];
  serviceTotals?: BusinessCustomerServiceTotals | null;
  visits?: BusinessCustomerVisits | null;
  appointments?: BusinessCustomerSubscriptionAppointment[];
  appointmentCount?: number;
};

export type BusinessCustomerPurchaseService =
  | string
  | {
      id?: number | string;
      name?: string;
      title?: string;
      [key: string]: unknown;
    };

export type BusinessCustomerPurchase = {
  id?: number;
  purchasedAt: string;
  appointmentDate: string | null;
  appointmentTime: string | null;
  amount: number | string;
  services: BusinessCustomerPurchaseService[];
  additionalServices: BusinessCustomerPurchaseService[];
  paymentMethod: string | null;
  status: string;
  staffId?: number | null;
  staffName?: string | null;
  staffImageUrl?: string | null;
};

export type BusinessCustomer = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  profile_image_url?: string | null;
  customerSince: string | null;
  currentStatus: string | null;
  subscriptionCount?: number;
  purchaseCount?: number;
  subscriptions: BusinessCustomerSubscription[];
  purchases: BusinessCustomerPurchase[];
};

export type PaginatedMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type BusinessCustomersListResponse = {
  success: boolean;
  message: string;
  data: {
    data: BusinessCustomer[];
    meta: PaginatedMeta;
  };
};

export type BusinessCustomerDetailResponse = {
  success: boolean;
  message: string;
  data: BusinessCustomer;
};

export type BusinessCustomersListParams = {
  search?: string;
  subscription_state?: string;
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
  from_date?: string;
  to_date?: string;
};
