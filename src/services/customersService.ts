import { ApiService } from "./api";
import { customersEndpoints } from "./endpoints";
import type {
  BusinessCustomer,
  BusinessCustomerDetailResponse,
  BusinessCustomerPurchase,
  BusinessCustomerSubscription,
  BusinessCustomersListParams,
  BusinessCustomersListResponse,
} from "@/src/types/customers";

export const CUSTOMERS_PER_PAGE = 20;

function normalizeSubscription(
  subscription: BusinessCustomerSubscription,
): BusinessCustomerSubscription {
  return {
    ...subscription,
    services: subscription.services ?? [],
    appointments: subscription.appointments ?? [],
    visits: subscription.visits ?? null,
    reflectsPlanChanges:
      typeof subscription.reflectsPlanChanges === "boolean"
        ? subscription.reflectsPlanChanges
        : subscription.hasAccess,
    appointmentCount:
      typeof subscription.appointmentCount === "number"
        ? subscription.appointmentCount
        : (subscription.appointments ?? []).length,
  };
}

function normalizePurchase(
  purchase: BusinessCustomerPurchase,
): BusinessCustomerPurchase {
  return {
    ...purchase,
    services: purchase.services ?? [],
    additionalServices: purchase.additionalServices ?? [],
    staffId: purchase.staffId ?? null,
    staffName: purchase.staffName ?? null,
    staffImageUrl: purchase.staffImageUrl ?? null,
  };
}

function normalizeCustomer(customer: BusinessCustomer): BusinessCustomer {
  const subscriptions = (customer.subscriptions ?? []).map(
    normalizeSubscription,
  );
  const purchases = (customer.purchases ?? []).map(normalizePurchase);

  return {
    ...customer,
    subscriptions,
    purchases,
    subscriptionCount:
      typeof customer.subscriptionCount === "number"
        ? customer.subscriptionCount
        : subscriptions.length,
    purchaseCount:
      typeof customer.purchaseCount === "number"
        ? customer.purchaseCount
        : purchases.length,
  };
}

export async function fetchBusinessCustomers(
  page: number,
  filters: Omit<BusinessCustomersListParams, "page" | "per_page"> = {},
  perPage: number = CUSTOMERS_PER_PAGE,
): Promise<{
  customers: BusinessCustomer[];
  currentPage: number;
  lastPage: number;
  total: number;
}> {
  const response = await ApiService.get<BusinessCustomersListResponse>(
    customersEndpoints.list({
      ...filters,
      page,
      per_page: perPage,
    }),
  );

  const customers = (response.data?.data ?? []).map(normalizeCustomer);

  return {
    customers,
    currentPage: response.data?.meta?.current_page ?? page,
    lastPage: response.data?.meta?.last_page ?? 1,
    total: response.data?.meta?.total ?? customers.length,
  };
}

export async function fetchBusinessCustomerDetail(
  id: string | number,
): Promise<BusinessCustomer> {
  const response = await ApiService.get<BusinessCustomerDetailResponse>(
    customersEndpoints.detail(id),
  );

  if (!response.data) {
    throw new Error(response.message || "Customer not found");
  }

  return normalizeCustomer(response.data);
}
