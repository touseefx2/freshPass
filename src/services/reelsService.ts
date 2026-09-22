import { ApiService } from "@/src/services/api";
import {
  myLooksEndpoints,
  reelsEndpoints,
  reportsEndpoints,
} from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import type {
  CreateReelPayload,
  FeedReel,
  LikeResponse,
  OwnerReel,
  PageMeta,
  ReelCategoryCard,
  ReelComment,
  ReelEventType,
  ReelPerformanceStats,
  ReportReason,
  ReportResponse,
  SaveResponse,
  ShareResponse,
  UpdateReelPayload,
} from "@/src/types/reels";

export const REELS_MINE_PER_PAGE = 20;
export const REELS_FEED_PER_PAGE = 10;
export const REELS_COMMENTS_PER_PAGE = 20;
export const MY_LOOKS_PER_PAGE = 20;

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
  tab?: "for_you" | "following";
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

export async function saveReel(
  id: number | string,
): Promise<{ saved: boolean; saves: number }> {
  const response = await ApiService.post<SaveResponse>(reelsEndpoints.save(id));
  return {
    saved: response?.data?.saved ?? true,
    saves: response?.data?.saves ?? 0,
  };
}

export async function unsaveReel(
  id: number | string,
): Promise<{ saved: boolean; saves: number }> {
  const response = await ApiService.delete<SaveResponse>(
    reelsEndpoints.save(id),
  );
  return {
    saved: response?.data?.saved ?? false,
    saves: response?.data?.saves ?? 0,
  };
}

/** Saved reels, most recently saved first. Cursor paged. */
export async function fetchMyLooks(params?: {
  cursor?: string;
  per_page?: number;
  latitude?: number;
  longitude?: number;
}): Promise<{ reels: FeedReel[]; meta: PageMeta }> {
  const perPage = params?.per_page ?? MY_LOOKS_PER_PAGE;
  const response = await ApiService.get<
    Envelope<{ data: FeedReel[]; meta: PageMeta }>
  >(myLooksEndpoints.list({ ...params, per_page: perPage }));
  return {
    reels: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      per_page: perPage,
      has_more: false,
      next_cursor: null,
    },
  };
}

/**
 * Counts a share. Fire-and-forget — the link is already on the item, so a
 * failure here must never block the share sheet.
 */
export async function shareReel(
  id: number | string,
): Promise<{ share_url: string | null; shares: number | null }> {
  try {
    const response = await ApiService.post<ShareResponse>(
      reelsEndpoints.share(id),
    );
    return {
      share_url: response?.data?.share_url ?? null,
      shares: response?.data?.shares ?? null,
    };
  } catch (error: any) {
    const status = error?.response?.status ?? error?.status;
    if (status === 429 || status === 404) return { share_url: null, shares: null };
    Logger.error(`Failed to count reel share ${id}:`, error);
    return { share_url: null, shares: null };
  }
}

export async function listReelComments(
  id: number | string,
  params?: { cursor?: string; per_page?: number },
): Promise<{ comments: ReelComment[]; meta: PageMeta }> {
  const perPage = params?.per_page ?? REELS_COMMENTS_PER_PAGE;
  const response = await ApiService.get<any>(
    reelsEndpoints.comments(id, { cursor: params?.cursor, per_page: perPage }),
  );
  // Backend may return either { data: { data, meta } } or { data: [], meta }.
  const root = response?.data;
  const comments: ReelComment[] = Array.isArray(root)
    ? root
    : Array.isArray(root?.data)
      ? root.data
      : [];
  const meta: PageMeta =
    (Array.isArray(root) ? response?.meta : root?.meta) ?? {
      per_page: perPage,
      has_more: false,
      next_cursor: null,
    };
  return { comments, meta };
}

export async function postReelComment(
  id: number | string,
  body: string,
): Promise<ReelComment> {
  const response = await ApiService.post<any>(reelsEndpoints.comments(id), {
    body,
  });
  const created = response?.data?.data ?? response?.data;
  if (!created || typeof created !== "object" || !("id" in created)) {
    throw new Error(response?.message || "Failed to post comment");
  }
  return created as ReelComment;
}

export async function deleteReelComment(
  id: number | string,
  commentId: number | string,
): Promise<void> {
  await ApiService.delete(reelsEndpoints.commentDelete(id, commentId));
}

export async function reportReel(
  id: number | string,
  reason: string,
  note?: string,
): Promise<{ already: boolean }> {
  const response = await ApiService.post<ReportResponse>(
    reelsEndpoints.report(id),
    { reason, ...(note?.trim() ? { note: note.trim() } : {}) },
  );
  return { already: response?.data?.already ?? false };
}

export async function reportReelComment(
  id: number | string,
  commentId: number | string,
  reason: string,
  note?: string,
): Promise<{ already: boolean }> {
  const response = await ApiService.post<ReportResponse>(
    reelsEndpoints.commentReport(id, commentId),
    { reason, ...(note?.trim() ? { note: note.trim() } : {}) },
  );
  return { already: response?.data?.already ?? false };
}

let cachedReportReasons: ReportReason[] | null = null;

/** Report reasons change rarely — cached for the session. */
export async function fetchReportReasons(): Promise<ReportReason[]> {
  if (cachedReportReasons) return cachedReportReasons;
  const response = await ApiService.get<Envelope<ReportReason[]>>(
    reportsEndpoints.reasons,
  );
  cachedReportReasons = response?.data ?? [];
  return cachedReportReasons;
}
