import { ApiService } from "@/src/services/api";
import {
  businessEndpoints,
  businessFollowersEndpoints,
  followingEndpoints,
} from "@/src/services/endpoints";
import type {
  BusinessFollower,
  BusinessFollowersPage,
} from "@/src/types/businessFollowers";
import type { FollowResponse, PageMeta } from "@/src/types/reels";

export const FOLLOWING_PER_PAGE = 15;
export const BUSINESS_FOLLOWERS_PER_PAGE = 15;

type FollowResult = { following: boolean; followers: number | null };

export async function followBusiness(
  businessId: number | string,
  options?: { reelId?: number | string },
): Promise<FollowResult> {
  const body =
    options?.reelId != null ? { reel_id: Number(options.reelId) } : undefined;
  const response = await ApiService.post<FollowResponse>(
    businessEndpoints.follow(businessId),
    body,
  );
  return {
    following: response?.data?.following ?? true,
    followers: response?.data?.followers ?? null,
  };
}

export async function unfollowBusiness(
  businessId: number | string,
): Promise<FollowResult> {
  const response = await ApiService.delete<FollowResponse>(
    businessEndpoints.follow(businessId),
  );
  return {
    following: response?.data?.following ?? false,
    followers: response?.data?.followers ?? null,
  };
}

export async function fetchFollowing(params?: {
  page?: number;
  per_page?: number;
}): Promise<{ businesses: any[]; meta: PageMeta }> {
  const perPage = params?.per_page ?? FOLLOWING_PER_PAGE;
  const page = params?.page ?? 1;
  const response = await ApiService.get<{
    success: boolean;
    data: { data: any[]; meta: PageMeta };
  }>(followingEndpoints.list({ page, per_page: perPage }));
  return {
    businesses: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      per_page: perPage,
      current_page: page,
      has_more: false,
    },
  };
}

export async function fetchBusinessFollowers(params?: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<{ followers: BusinessFollower[]; meta: PageMeta }> {
  const perPage = params?.per_page ?? BUSINESS_FOLLOWERS_PER_PAGE;
  const page = params?.page ?? 1;
  const response = await ApiService.get<{
    success: boolean;
    data: BusinessFollowersPage;
  }>(
    businessFollowersEndpoints.list({
      page,
      per_page: perPage,
      search: params?.search,
    }),
  );

  return {
    followers: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      per_page: perPage,
      current_page: page,
      has_more: false,
    },
  };
}
