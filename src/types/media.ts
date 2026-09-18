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
