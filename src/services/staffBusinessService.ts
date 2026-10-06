import { ApiService } from "@/src/services/api";
import { businessEndpoints, staffEndpoints } from "@/src/services/endpoints";
import { resolveApiImageUrl } from "@/src/utils/media";

export type StaffBusinessCategory = { id: number; name: string };

export type StaffBusinessSummary = {
  id: number;
  name: string;
  logoUrl: string | null;
  category: StaffBusinessCategory | null;
};

/** Staff: their owner's business id (from the store, else staff details). */
export async function resolveStaffBusinessId(
  businessId?: number | null,
): Promise<number | null> {
  if (businessId) return businessId;
  const details = await ApiService.get<{ data?: { business_id?: number } }>(
    staffEndpoints.profile,
  );
  return details?.data?.business_id ?? null;
}

/** Staff: name, logo and category of the business they work for. */
export async function fetchStaffBusinessSummary(
  businessId?: number | null,
): Promise<StaffBusinessSummary | null> {
  const id = await resolveStaffBusinessId(businessId);
  if (!id) return null;
  const response = await ApiService.get<{
    data?: {
      business?: {
        title?: string;
        name?: string;
        logo_url?: string | null;
        category?: { id?: number; name?: string } | null;
      };
    };
  }>(businessEndpoints.businessDetails(id));
  const business = response?.data?.business;
  if (!business) return null;
  const category = business.category;
  return {
    id,
    name: business.title || business.name || "",
    logoUrl: resolveApiImageUrl(business.logo_url),
    category:
      category?.id != null ? { id: category.id, name: category.name ?? "" } : null,
  };
}

/**
 * Staff: the category of the business they work for, so new reels default to it
 * (owners read theirs from business status).
 */
export async function fetchStaffBusinessCategory(
  businessId?: number | null,
): Promise<StaffBusinessCategory | null> {
  return (await fetchStaffBusinessSummary(businessId))?.category ?? null;
}
