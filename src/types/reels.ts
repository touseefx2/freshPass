import type { MediaVideo } from "@/src/types/media";

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
  available_now: boolean;
  published_at: string | null;
  category: ReelCategory | null;
  service: ReelService | null;
  video: MediaVideo | ReelVideo;
  stats: ReelStats;
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
};

export type CreateReelPayload = {
  media_asset_id: number;
  category_id: number;
  caption: string;
  service_id?: number;
  look_tag?: string;
  promotion_text?: string;
  product_tag?: string;
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
