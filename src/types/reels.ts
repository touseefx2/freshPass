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

export type ReelWatchStats = {
  plays: number;
  avg_watch_seconds: number;
  avg_completion_pct: number;
  full_watches: number;
};

export type ReelPerformanceStats = {
  funnel: {
    view: FunnelWindow;
    look_tap: FunnelWindow;
    tryon_tap: FunnelWindow;
    tryon_completed: FunnelWindow;
    follow: FunnelWindow;
    profile_tap: FunnelWindow;
    service_view: FunnelWindow;
    booking_started: FunnelWindow;
    booking_completed: FunnelWindow;
    membership_view: FunnelWindow;
    subscription_started: FunnelWindow;
    subscription_completed: FunnelWindow;
  };
  /** Watch time from `/watch` reports (not windowed). All zeros until apps send it. */
  watch?: ReelWatchStats;
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

export type ReelEventType =
  | "profile_tap"
  | "service_view"
  | "booking_started"
  | "membership_view";

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

/** Shotstack reel templates (GET /api/reel-templates) */
export type ReelTemplateMediaAcceptedType = "image" | "video";

/** One media slot on a Shotstack template (phase2 accepted_types shape) */
export type ReelTemplateMediaField = {
  key: string;
  label: string;
  accepted_types: ReelTemplateMediaAcceptedType[];
};

export type ReelTemplate = {
  id: number;
  name: string;
  slug: string;
  preview_video_url: string | null;
  thumbnail_url: string | null;
  category: string;
  merge_fields: string[];
  text_fields: string[];
  /** New API: objects with accepted_types. Legacy: string keys. */
  media_fields: ReelTemplateMediaField[] | string[];
  media_count: number;
  has_music: boolean;
  music_name: string | null;
  is_active: boolean;
  created_at: string;
};

/** Normalize legacy string[] or new object[] media_fields */
export function normalizeReelTemplateMediaFields(
  fields: ReelTemplate["media_fields"] | null | undefined,
): ReelTemplateMediaField[] {
  if (!fields?.length) return [];
  return fields.map((field, index) => {
    if (typeof field === "string") {
      return {
        key: field,
        label: `Slot ${index + 1}`,
        // Legacy templates had no type info; media upload is video-first
        accepted_types: ["video", "image"],
      };
    }
    const types = (field.accepted_types ?? []).filter(
      (t): t is ReelTemplateMediaAcceptedType =>
        t === "image" || t === "video",
    );
    return {
      key: field.key,
      label: field.label?.trim() || `Slot ${index + 1}`,
      accepted_types: types.length > 0 ? types : ["image", "video"],
    };
  });
}

export type GenerateReelPayload = {
  template_id: number;
  media_asset_ids: number[];
  texts: Record<string, string>;
  category_id: number;
  caption: string;
  music_asset_id?: number | null;
};

export type GenerateReelResponse = {
  reel_id: number;
  generation_status: "pending";
};

/** Shotstack template reel generation state */
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

/** One named place in a design template (photo / video / text). */
export type AutoReelSlot = {
  key: string;
  kind: "image" | "video" | "text";
  label: string;
  hint: string | null;
  /** What the AI looks for in the video (or what to film) */
  find: string | null;
  accepts: ("image" | "video")[];
  /** Video slots: shortest clip the slot takes */
  min_seconds: number | null;
  /** Text slots */
  max_length: number | null;
  prefill: "business_name" | null;
  /** When it is on screen in the finished reel (seconds) */
  appears: { start: number; end: number }[];
};

/** What a design template asks for: one video (AI picks moments) or one photo per slot. */
export type AutoReelTemplateNeeds = "video" | "photos";

export type AutoReelTemplate = {
  id: number;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  /** Sample of the finished reel, when the server has one */
  preview_video_url?: string | null;
  kind: AutoReelTemplateKind;
  /** false → today's "one video in, finished reel out" template */
  has_design?: boolean;
  needs?: AutoReelTemplateNeeds | null;
  min_video_seconds?: number | null;
  slots?: AutoReelSlot[] | null;
  /** false → silent design: the user must pick music or "No music" */
  has_sound?: boolean | null;
  /** Length of the finished reel (designs) */
  length_seconds?: number | null;
};

/** Design template with slots (has_design + needs). */
export function isDesignTemplate(
  tpl: Pick<AutoReelTemplate, "has_design" | "needs"> | null | undefined,
): boolean {
  return !!tpl?.has_design && (tpl.needs === "video" || tpl.needs === "photos");
}

/** Slots the user fills with a photo / video (not text). */
export function mediaSlots(slots: AutoReelSlot[] | null | undefined): AutoReelSlot[] {
  return (slots ?? []).filter((s) => s.kind !== "text");
}

export function textSlots(slots: AutoReelSlot[] | null | undefined): AutoReelSlot[] {
  return (slots ?? []).filter((s) => s.kind === "text");
}

export type AutoReelStatus =
  | "pending"
  | "analyzing"
  /** Video design: AI picked the moments — the user reviews them, then builds */
  | "review"
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
  | "store_failed"
  /** Shorter than the template's min_video_seconds */
  | "source_too_short"
  /** Building the design failed — retry rebuilds with the same choices */
  | "build_failed";

/** The AI's moment for one photo / video slot of a video design. */
export type AutoReelPick = {
  /** Photo slots: second the still is taken from; video slots: where the clip starts */
  at: number | null;
  /** false → the AI couldn't find it; the user must choose a moment or attach a file */
  found: boolean;
  /** Set when the user's own file was used */
  media_asset_id?: number | null;
};

/** `autoReel.design` on a video design (filled once it reaches `review`). */
export type AutoReelDesign = {
  /** In reel order */
  slots: AutoReelSlot[];
  /** The uploaded source video */
  video_url: string | null;
  video_seconds?: number | null;
  picks: Record<string, AutoReelPick>;
  /** Starting values for the text slots */
  texts: Record<string, string> | null;
  has_sound?: boolean | null;
  length_seconds?: number | null;
};

/** Library track for a silent design (`null` = "No music"). */
export type AutoReelMusic = {
  url: string;
  title: string;
  artist: string;
  license: string;
  license_version: string | null;
  source_url: string | null;
};

/** POST /api/auto-reels/{id}/build — one choice per photo/video slot + every text. */
export type BuildAutoReelPayload = {
  slots: Record<string, { at: number } | { media_asset_id: number }>;
  texts: Record<string, string>;
  music?: AutoReelMusic | null;
};

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
  /** Design templates: slots, the AI's picks and texts (video designs, from `review`) */
  design?: AutoReelDesign | null;
  /**
   * The finished video (set once `ready`). Play this — the reel is only made
   * when the user publishes. Older results fall back to their draft's video.
   */
  video?: AutoReelVideo | null;
  /** Reel made from it: null until published, null again if that reel is deleted */
  reel_id: number | null;
  reel: AutoReelDraft | null;
  /** User id of whoever started it */
  created_by?: number | null;
  /** True when the logged-in user started it — staff may only retry their own */
  is_mine?: boolean;
  created_at: string;
  updated_at: string;
};

/** Finished auto reel video (MediaAssetResource subset) */
export type AutoReelVideo = {
  id: number;
  playback_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width?: number | null;
  height?: number | null;
};

/** POST /api/auto-reels/{id}/publish — every field optional (start values are reused) */
export type PublishAutoReelPayload = {
  caption?: string;
  category_id?: number;
  service_id?: number | null;
  look_tag?: string | null;
  promotion_text?: string | null;
  product_tag?: string | null;
  product_id?: number | null;
  available_now?: boolean;
};

/** Video to play/download: the auto reel's own video, else an older result's draft video */
export function autoReelVideo(
  autoReel: Pick<AutoReel, "video" | "reel"> | null | undefined,
): AutoReelVideo | null {
  if (autoReel?.video?.playback_url) return autoReel.video;
  const draftVideo = autoReel?.reel?.video;
  return draftVideo?.playback_url
    ? {
        id: draftVideo.id,
        playback_url: draftVideo.playback_url,
        thumbnail_url: draftVideo.thumbnail_url,
        duration_seconds: draftVideo.duration_seconds,
      }
    : null;
}

export type CreateAutoReelPayload = {
  /** One video (non-design and video designs); not sent for photo designs */
  media_asset_id?: number;
  template_id: number;
  category_id: number;
  service_id?: number;
  caption?: string;
  /** Photo designs: uploaded media id per slot key */
  slot_media?: Record<string, number>;
  texts?: Record<string, string>;
  /** Photo designs that are silent */
  music?: AutoReelMusic | null;
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
  "build_failed",
];

/** First 422 message per key under `prefix`, e.g. { BEFORE_MEDIA: "…" } from errors["slots.BEFORE_MEDIA"]. */
export function keyedFieldErrors(
  error: any,
  prefix: string,
): Record<string, string> {
  const errors = error?.data?.errors ?? error?.response?.errors ?? {};
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(errors)) {
    if (!field.startsWith(`${prefix}.`)) continue;
    // "slots.KEY" or "slots.KEY.media_asset_id" → KEY
    const key = field.slice(prefix.length + 1).split(".")[0];
    const message = Array.isArray(value) ? value[0] : value;
    if (key && typeof message === "string" && !out[key]) out[key] = message;
  }
  return out;
}

/** 422 on `music`, `music.url`, `music.license`… */
export function musicFieldError(error: any): string | null {
  const errors = error?.data?.errors ?? {};
  for (const [field, value] of Object.entries(errors)) {
    if (field !== "music" && !field.startsWith("music.")) continue;
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") return message;
  }
  return null;
}
