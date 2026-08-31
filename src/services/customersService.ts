import { ApiService } from "./api";
import { customersEndpoints } from "./endpoints";
import type {
  BusinessCustomer,
  BusinessCustomerDetailResponse,
  BusinessCustomersListParams,
  BusinessCustomersListResponse,
} from "@/src/types/customers";

export const CUSTOMERS_PER_PAGE = 20;

function normalizeCustomer(customer: BusinessCustomer): BusinessCustomer {
  return {
    ...customer,
    subscriptions: customer.subscriptions ?? [],
    purchases: customer.purchases ?? [],
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
