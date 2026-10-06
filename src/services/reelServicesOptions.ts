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
export async function fetchReelServiceOptions(params: {
  userRole?: string | null;
  businessId?: number | null;
}): Promise<ReelServiceOption[]> {
  if (params.userRole !== "staff") {
    return pickList(await ApiService.get(businessEndpoints.services));
  }
  let businessId = params.businessId ?? null;
  if (!businessId) {
    const details = await ApiService.get<{ data?: { business_id?: number } }>(
      staffEndpoints.profile,
    );
    businessId = details?.data?.business_id ?? null;
  }
  if (!businessId) return [];
  const list = pickList(
    await ApiService.get(businessEndpoints.servicesForBusiness(businessId)),
  );
  // Public list may include inactive ones on some builds — only taggable services
  return list.filter((svc: any) => svc?.active !== false && svc?.status !== "inactive");
}
