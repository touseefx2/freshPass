import { ApiService } from "@/src/services/api";
import { reelsEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import type {
  CreateReelPayload,
  FeedReel,
  LikeResponse,
  OwnerReel,
  PageMeta,
  ReelCategoryCard,
  ReelEventType,
  ReelPerformanceStats,
  UpdateReelPayload,
} from "@/src/types/reels";

export const REELS_MINE_PER_PAGE = 20;
export const REELS_FEED_PER_PAGE = 10;

type Envelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function createReel(
  payload: CreateReelPayload,
): Promise<OwnerReel> {
  const response = await ApiService.post<Envelope<OwnerReel>>(
    reelsEndpoints.create,
    payload,
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to create reel");
  }
  return response.data;
}

export async function listMyReels(
  page: number = 1,
  status?: string,
  perPage: number = REELS_MINE_PER_PAGE,
): Promise<{ reels: OwnerReel[]; meta: PageMeta }> {
  const response = await ApiService.get<
    Envelope<{ data: OwnerReel[]; meta: PageMeta }>
  >(reelsEndpoints.mine({ page, per_page: perPage, status }));
  return {
    reels: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      per_page: perPage,
      has_more: false,
      current_page: page,
    },
  };
}

export async function getMyReel(id: number | string): Promise<OwnerReel> {
  const response = await ApiService.get<Envelope<OwnerReel>>(
    reelsEndpoints.mineById(id),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Reel not found");
  }
  return response.data;
}

export async function updateReel(
  id: number | string,
  payload: UpdateReelPayload,
): Promise<OwnerReel> {
  const response = await ApiService.put<Envelope<OwnerReel>>(
    reelsEndpoints.update(id),
    payload,
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to update reel");
  }
  return response.data;
}

export async function publishReel(id: number | string): Promise<OwnerReel> {
  const response = await ApiService.post<Envelope<OwnerReel>>(
    reelsEndpoints.publish(id),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to publish reel");
  }
  return response.data;
}

export async function unpublishReel(id: number | string): Promise<OwnerReel> {
  const response = await ApiService.post<Envelope<OwnerReel>>(
    reelsEndpoints.unpublish(id),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to unpublish reel");
  }
  return response.data;
}

export async function deleteReel(id: number | string): Promise<void> {
  await ApiService.delete(reelsEndpoints.delete(id));
}

export async function getBusinessReelStats(): Promise<ReelPerformanceStats> {
  const response = await ApiService.get<Envelope<ReelPerformanceStats>>(
    reelsEndpoints.mineStats,
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to load stats");
  }
  return response.data;
}

export async function getReelStats(
  id: number | string,
): Promise<ReelPerformanceStats> {
  const response = await ApiService.get<Envelope<ReelPerformanceStats>>(
    reelsEndpoints.mineReelStats(id),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to load reel stats");
  }
  return response.data;
}

export async function fetchReelCategories(): Promise<ReelCategoryCard[]> {
  const response = await ApiService.get<Envelope<ReelCategoryCard[]>>(
    reelsEndpoints.categories,
  );
  return response?.data ?? [];
}

export async function fetchReelFeed(params: {
  category_id?: number | string;
  first_reel_id?: number | string;
  per_page?: number;
  cursor?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ reels: FeedReel[]; meta: PageMeta }> {
  const response = await ApiService.get<
    Envelope<{ data: FeedReel[]; meta: PageMeta }>
  >(
    reelsEndpoints.feed({
      ...params,
      per_page: params.per_page ?? REELS_FEED_PER_PAGE,
    }),
  );
  return {
    reels: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      per_page: params.per_page ?? REELS_FEED_PER_PAGE,
      has_more: false,
      next_cursor: null,
    },
  };
}

export async function getPublicReel(
  id: number | string,
  coords?: { latitude?: number; longitude?: number },
): Promise<FeedReel> {
  const response = await ApiService.get<Envelope<FeedReel>>(
    reelsEndpoints.getById(id, coords),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Reel not found");
  }
  return response.data;
}

/** Fire-and-forget view count. Ignores 429. */
export async function recordReelView(id: number | string): Promise<number | null> {
  try {
    const response = await ApiService.post<Envelope<{ views?: number }>>(
      reelsEndpoints.view(id),
    );
    return response?.data?.views ?? null;
  } catch (error: any) {
    if (error?.response?.status === 429 || error?.status === 429) return null;
    Logger.error(`Failed to record reel view ${id}:`, error);
    return null;
  }
}

/** Fire-and-forget conversion events. */
export async function reportReelEvent(
  id: number | string,
  event: ReelEventType,
): Promise<void> {
  try {
    await ApiService.post(reelsEndpoints.events(id), { event });
  } catch (error: any) {
    if (error?.response?.status === 429 || error?.status === 429) return;
    if (error?.response?.status === 404 || error?.status === 404) return;
    Logger.error(`Failed to report reel event ${event} for ${id}:`, error);
  }
}

export async function likeReel(
  id: number | string,
): Promise<{ liked: boolean; likes: number }> {
  const response = await ApiService.post<LikeResponse>(reelsEndpoints.like(id));
  return {
    liked: response?.data?.liked ?? true,
    likes: response?.data?.likes ?? 0,
  };
}

export async function unlikeReel(
  id: number | string,
): Promise<{ liked: boolean; likes: number }> {
  const response = await ApiService.delete<LikeResponse>(
    reelsEndpoints.like(id),
  );
  return {
    liked: response?.data?.liked ?? false,
    likes: response?.data?.likes ?? 0,
  };
}
