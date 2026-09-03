export type BusinessCustomerSubscription = {
  plan: string;
  price: number | string;
  status: string;
  hasAccess: boolean;
  startedAt: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
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
  purchasedAt: string;
  appointmentDate: string | null;
  appointmentTime: string | null;
  amount: number | string;
  services: BusinessCustomerPurchaseService[];
  additionalServices: BusinessCustomerPurchaseService[];
  paymentMethod: string | null;
  status: string;
};

export type BusinessCustomer = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  profile_image_url?: string | null;
  customerSince: string | null;
  currentStatus: string | null;
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
