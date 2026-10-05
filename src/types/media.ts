export type MediaVideoStatus = "processing" | "ready" | "failed";

export type MediaSourceType =
  | "camera"
  | "device"
  | "ai"
  | "imported"
  | "freshpass";

export type MediaVideo = {
  id: number;
  business_id: number;
  source_type: MediaSourceType;
  status: MediaVideoStatus;
  failure_reason: string | null;
  url: string;
  playback_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  /** Reel that uses this video, or null */
  reel_id?: number | null;
  /** `auto_reel_source` for raw AI Auto Reel uploads (hidden from the library) */
  purpose?: MediaUploadPurpose | null;
};

export type MediaListMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more: boolean;
};

export type MediaListResponse = {
  success: boolean;
  message?: string;
  data: {
    data: MediaVideo[];
    meta: MediaListMeta;
  };
};

export type MediaItemResponse = {
  success: boolean;
  message?: string;
  data: MediaVideo;
};

export type MediaDeleteResponse = {
  success: boolean;
  message?: string;
  data: {
    deleted: number[];
    not_found: number[];
  };
};

export type MediaUploadSourceType = "camera" | "device";

export type MediaUploadPurpose = "auto_reel_source";

/** GET /api/media/limits — reel length + AI caps */
export type MediaLimits = {
  max_seconds: number;
  followers_count: number;
  ai_seconds_per_image: number;
  ai_max_seconds_per_clip: number;
  ai_transition_seconds: number;
  ai_max_images: number;
  /** How many reels this user can still make (capped by what the business has left) */
  reels_remaining_this_month?: number | null;
  /** 12 a month for the whole business (owner + staff) */
  max_reels_per_month?: number | null;
  business_reels_used_this_month?: number | null;
  business_reels_remaining_this_month?: number | null;
  monthly_reel_role?: "owner" | "staff" | null;
  /** Staff: number the owner gave them (0 = none). Owner: 12 minus what's given to staff. */
  your_monthly_reel_limit?: number | null;
  your_reels_used_this_month?: number | null;
  /** e.g. "2026-11-01" */
  monthly_reels_reset_on?: string | null;
  /** Owner only */
  assigned_to_staff?: number | null;
  unassigned?: number | null;
  staff_reel_limits?: StaffReelLimit[] | null;
};

/** Owner-only row in GET /api/media/limits → staff_reel_limits */
export type StaffReelLimit = {
  staff_id: number;
  user_id: number;
  name: string;
  /** null = none given (cannot post reels) */
  monthly_reel_limit: number | null;
  reels_used_this_month: number;
};

export type MediaLimitsResponse = {
  success: boolean;
  message?: string;
  data: MediaLimits;
};
