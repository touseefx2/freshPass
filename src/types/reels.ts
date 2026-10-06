import type { MediaVideo } from "@/src/types/media";
import type { ShopProduct } from "@/src/types/shopProduct";

export type ReelStatus = "draft" | "published" | "removed";

export type ReelCategory = {
  id: number;
  name: string;
  slug?: string;
  image_url?: string | null;
};

export type ReelService = {
  id: number;
  name: string;
  price?: string | number | null;
};

export type ReelBusiness = {
  id: number;
  title: string;
  slug?: string;
  image_url?: string | null;
  city?: string | null;
  state?: string | null;
  followers_count?: number;
  is_official?: boolean;
  is_verified?: boolean;
};

export type ReelStats = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

export type ReelViewer = {
  liked: boolean;
  saved: boolean;
  following: boolean;
};

export type ReelVideo = {
  playback_url: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
};

/** Owner reel object (create/list/get mine) */
export type OwnerReel = {
  id: number;
  business_id: number;
  status: ReelStatus;
  caption: string;
  look_tag: string | null;
  promotion_text: string | null;
  product_tag: string | null;
  product_id?: number | null;
  product?: ShopProduct | null;
  available_now: boolean;
  published_at: string | null;
  category: ReelCategory | null;
  service: ReelService | null;
  video: MediaVideo | ReelVideo;
  stats: ReelStats;
  /** Present while Shotstack render is in flight / finished */
  generation_status?: GenerationStatus | null;
  generation_error?: string | null;
  /** User id of whoever made it; null on reels made before this was saved */
  created_by?: number | null;
  /** True when the logged-in user made it — staff may only change their own */
  is_mine?: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Public feed reel object */
export type FeedReel = {
  id: number;
  caption: string;
  look_tag: string | null;
  promotion_text: string | null;
  product_tag: string | null;
  product_id?: number | null;
  product?: ShopProduct | null;
  available_now: boolean;
  published_at: string | null;
  video: ReelVideo;
  category: ReelCategory | null;
  service: ReelService | null;
  business: ReelBusiness;
  distance_km?: number | null;
  stats: ReelStats;
  viewer: ReelViewer;
  share_url?: string | null;
};

export type ReelCategoryCard = {
  id: number;
  name: string;
  slug?: string;
  image_url?: string | null;
  total_views: number;
  cover_reel: FeedReel;
};

export type PageMeta = {
  current_page?: number;
  per_page: number;
  total?: number;
  last_page?: number;
  from?: number | null;
  to?: number | null;
  has_more: boolean;
  next_cursor?: string | null;
  tab?: "for_you" | "following";
  following_count?: number;
  requires_login?: boolean;
  /** Present when listing my-looks with type=all */
  cursors?: {
    reels?: string | null;
    ai?: string | null;
  };
};

/** GET /api/reels/{id}/look — drives the I Want This Look sheet */
export type ReelLookResponse = {
  reel_id: number;
  look_tag: string | null;
  category: { id: number; name: string } | null;
  try_on: {
    available: boolean;
    recommended: boolean;
    requires_login: boolean;
    prompt: string | null;
    credits_required: number;
    credits_balance: number;
    can_afford: boolean;
    reason: "sign_in_required" | "insufficient_credits" | string | null;
  };
  save: {
    saved: boolean;
    requires_login: boolean;
  };
  book: {
    business_id: number | null;
    business_title: string | null;
    service_id: number | null;
    service_name: string | null;
  };
  find_another_pro: {
    category_id: number | null;
    look_tag: string | null;
  };
};

export type ReelTryOnJobStatus = "processing" | "completed" | "failed";

export type ReelTryOnViewImages = {
  front?: { url?: string } | null;
  left?: { url?: string } | null;
  right?: { url?: string } | null;
  back?: { url?: string } | null;
};

export type ReelTryOnStartResponse = {
  job_id: string;
  reel_id: number;
  prompt?: string | null;
  status: ReelTryOnJobStatus;
  estimated_time_minutes?: number;
  credits_charged?: number;
  credits_balance?: number;
};

export type ReelTryOnStatusResponse = {
  job_id: string;
  reel_id: number;
  status: ReelTryOnJobStatus;
  images: ReelTryOnViewImages | null;
  prompt?: string | null;
};

export type SavedAiLook = {
  id: number;
  image_url: string;
  view: string;
  created_at?: string;
  reel?: FeedReel | null;
};

export type MyLookListItem =
  | {
      type: "reel";
      saved_at?: string;
      reel: FeedReel;
      look?: null;
    }
  | {
      type: "ai_look";
      saved_at?: string;
      reel?: FeedReel | null;
      look: SavedAiLook;
    };

export type CreateReelPayload = {
  media_asset_id: number;
  category_id: number;
  caption: string;
  service_id?: number;
  look_tag?: string;
  promotion_text?: string;
  product_tag?: string;
  product_id?: number | null;
  available_now?: boolean;
  publish?: boolean;
};

export type UpdateReelPayload = {
  media_asset_id?: number;
  category_id?: number;
  caption?: string;
  service_id?: number | null;
  look_tag?: string | null;
  promotion_text?: string | null;
  product_tag?: string | null;
  product_id?: number | null;
  available_now?: boolean;
};

export type FunnelWindow = {
  all_time: number;
  last_7_days: number;
  last_30_days: number;
};

export type ReelPerformanceStats = {
  funnel: {
    view: FunnelWindow;
    profile_tap: FunnelWindow;
    booking_started: FunnelWindow;
    booking_completed: FunnelWindow;
    subscription_started: FunnelWindow;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  views_by_day: Array<{ date: string; views: number }>;
  reels?: { total: number; published: number };
  top_reels?: Array<{
    id: number;
    caption: string;
    status: ReelStatus;
    thumbnail_url: string | null;
    views: number;
    bookings: number;
  }>;
};

export type LikeResponse = {
  success: boolean;
  data: { liked: boolean; likes: number };
};

export type SaveResponse = {
  success: boolean;
  data: { saved: boolean; saves: number };
};

export type ShareResponse = {
  success: boolean;
  data: { share_url: string; shares: number };
};

export type FollowResponse = {
  success: boolean;
  data: { following: boolean; followers: number };
};

export type ReportResponse = {
  success: boolean;
  data: { already: boolean };
};

export type ReelEventType = "profile_tap" | "booking_started";

/** Top-level reel comment (R-13). */
export type ReelComment = {
  id: number;
  body: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    avatar_url?: string | null;
  };
  is_mine: boolean;
};

export type ReportReason = {
  value: string;
  label: string;
};

/** Reasons that need a note before the report can be submitted. */
export const REPORT_REASONS_REQUIRING_NOTE = ["copyright", "other"];

/** Legacy Shotstack generation state on older owner reels */
export type GenerationStatus =
  | "pending"
  | "rendering"
  | "ready"
  | "failed";

export type GenerationStatusResponse = {
  reel_id: number;
  generation_status: GenerationStatus;
  generation_error: string | null;
  video_url: string | null;
  progress: number | null;
};

/** AI Auto Reels — GET /api/auto-reels/templates */
export type AutoReelTemplateKind = "haircut" | "custom";

export type AutoReelTemplate = {
  id: number;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  kind: AutoReelTemplateKind;
};

export type AutoReelStatus =
  | "pending"
  | "analyzing"
  | "rendering"
  | "ready"
  | "failed";

export type AutoReelRenderStatus =
  | "queued"
  | "fetching"
  | "rendering"
  | "saving"
  | "done";

export type AutoReelErrorCode =
  | "not_suitable"
  | "not_found"
  | "too_many_moments"
  | "source_too_long"
  | "source_missing"
  | "analysis_failed"
  | "render_failed"
  | "store_failed";

/** Draft reel attached to a ready auto reel */
export type AutoReelDraft = {
  id: number;
  status: ReelStatus;
  caption: string | null;
  is_mine?: boolean;
  created_by?: number | null;
  category: ReelCategory | null;
  service: ReelService | null;
  video: {
    id: number;
    playback_url: string;
    thumbnail_url: string | null;
    duration_seconds: number | null;
  } | null;
};

export type AutoReel = {
  id: number;
  status: AutoReelStatus;
  template: Pick<AutoReelTemplate, "id" | "name" | "kind"> | null;
  error_code: AutoReelErrorCode | string | null;
  error_message: string | null;
  render_status: AutoReelRenderStatus | null;
  has_before: boolean | null;
  has_reveal: boolean | null;
  total_seconds: number | null;
  source_media_asset_id: number | null;
  reel_id: number | null;
  reel: AutoReelDraft | null;
  /** User id of whoever started it */
  created_by?: number | null;
  /** True when the logged-in user started it — staff may only retry their own */
  is_mine?: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateAutoReelPayload = {
  media_asset_id: number;
  template_id: number;
  category_id: number;
  service_id?: number;
  caption?: string;
};

/**
 * Owner can change any reel in the business; staff only the ones they made
 * (`is_mine`). Old reels with created_by null count as the business's (owner only).
 */
export function canChangeReel(
  item: { is_mine?: boolean } | null | undefined,
  userRole: string | null | undefined,
): boolean {
  if (userRole !== "staff") return true;
  return item?.is_mine === true;
}

export function isAutoReelInProgress(status: AutoReelStatus | null | undefined) {
  return status === "pending" || status === "analyzing" || status === "rendering";
}

/** Failures where POST /retry is worth offering (server-side problems). */
export const AUTO_REEL_RETRYABLE_ERRORS: readonly string[] = [
  "analysis_failed",
  "render_failed",
  "store_failed",
];
