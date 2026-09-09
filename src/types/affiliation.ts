export interface AffiliatedBusiness {
  id: number;
  title: string;
  slug?: string;
  logo_url?: string | null;
  owner?: {
    id: number;
    name: string;
  } | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  complete_address?: string | null;
}

export interface WorkingWithBusinessRequest {
  id: number;
  status: "pending";
  host_business_id: number;
  host_business: AffiliatedBusiness | null;
  requested_at: string | null;
}

export type AffiliationRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "removed";

export interface AffiliationRequestItem {
  id: number;
  status: AffiliationRequestStatus;
  requested_at: string | null;
  responded_at: string | null;
  removed_by?: string | null;
  solo_user: {
    id: number;
    name: string;
    profile_image_url?: string | null;
    phone?: string | null;
  };
  solo_business: {
    id: number;
    title: string;
    logo?: string | null;
    logo_url?: string | null;
  };
}

export interface AffiliationRequestsResponse {
  success: boolean;
  message: string;
  data:
    | AffiliationRequestItem[]
    | {
        requests?: AffiliationRequestItem[];
        data?: AffiliationRequestItem[];
        pagination?: {
          total: number;
          per_page: number;
          current_page: number;
          last_page: number;
        };
      };
}

export interface UserAffiliationFields {
  working_with_business_id?: number | null;
  working_with_business?: AffiliatedBusiness | null;
  working_with_business_request?: WorkingWithBusinessRequest | null;
}
