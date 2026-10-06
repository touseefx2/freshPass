import { ApiService } from "@/src/services/api";
import { businessEndpoints, staffEndpoints } from "@/src/services/endpoints";

export type ReelServiceOption = { id: number; name: string; price?: string | number };

function pickList(res: any): ReelServiceOption[] {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.services)) return data.services;
  return [];
}

/**
 * Services a reel can be tagged with.
 * Owner: their active services. Staff: the owner's business services via the
 * public `GET /api/services?business_id=` (business id from status, else staff details).
 */
async function resolveStaffBusinessId(
  businessId?: number | null,
): Promise<number | null> {
  if (businessId) return businessId;
  const details = await ApiService.get<{ data?: { business_id?: number } }>(
    staffEndpoints.profile,
  );
  return details?.data?.business_id ?? null;
}

/**
 * Staff: the category of the business they work for, so new reels default to it
 * (owners read theirs from business status).
 */
export async function fetchStaffBusinessCategory(
  businessId?: number | null,
): Promise<{ id: number; name: string } | null> {
  const id = await resolveStaffBusinessId(businessId);
  if (!id) return null;
  const response = await ApiService.get<{
    data?: { business?: { category?: { id?: number; name?: string } | null } };
  }>(businessEndpoints.businessDetails(id));
  const category = response?.data?.business?.category;
  return category?.id != null
    ? { id: category.id, name: category.name ?? "" }
    : null;
}

export async function fetchReelServiceOptions(params: {
  userRole?: string | null;
  businessId?: number | null;
}): Promise<ReelServiceOption[]> {
  if (params.userRole !== "staff") {
    return pickList(await ApiService.get(businessEndpoints.services));
  }
  const businessId = await resolveStaffBusinessId(params.businessId);
  if (!businessId) return [];
  const list = pickList(
    await ApiService.get(businessEndpoints.servicesForBusiness(businessId)),
  );
  // Public list may include inactive ones on some builds — only taggable services
  return list.filter((svc: any) => svc?.active !== false && svc?.status !== "inactive");
}
