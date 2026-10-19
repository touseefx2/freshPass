/** Live Available Now status — same object on reels, `/available-now/me` and the customer list. */
export type AvailableNowState = "available" | "unavailable" | "off";

export type AvailableNowMode = "calendar" | "manual";

export type AvailableNowProfessional = {
  user_id: number;
  /** Preselect when booking; null for a single-provider business */
  staff_id: number | null;
  name: string;
  is_owner: boolean;
};

export type AvailableNowService = {
  id: number;
  name: string;
  price: string | number | null;
  duration_minutes: number;
};

/** All times are salon local time with offset — show as-is, never convert. */
export type AvailableNowStatus = {
  status: AvailableNowState;
  mode: AvailableNowMode;
  business_id: number;
  professional: AvailableNowProfessional | null;
  /** null = 30-minute check */
  service: AvailableNowService | null;
  duration_minutes: number;
  timezone: string;
  /** available: the free start now; unavailable: next free start; null when nothing in 7 days / off */
  next_opening_at: string | null;
  minutes_until_next_opening: number | null;
  /** Manual windows only */
  window_ends_at: string | null;
};

export type AvailableNowSettings = {
  enabled: boolean;
  mode: AvailableNowMode;
  service_id: number | null;
  manual_starts_at: string | null;
  manual_ends_at: string | null;
};

/** GET / PUT /api/available-now/me */
export type AvailableNowMe = {
  settings: AvailableNowSettings;
  status: AvailableNowStatus | null;
};

export type SaveAvailableNowPayload = {
  enabled: boolean;
  mode: AvailableNowMode;
  service_id?: number | null;
  /** Manual only. Salon clock "15:00" or "2026-10-19 15:00"; left out = now */
  start_at?: string;
  /** Manual only, 15–720 */
  duration_minutes?: number;
};

export type AvailableNowBusiness = {
  id: number;
  title: string;
  slug?: string | null;
  image_url?: string | null;
  city?: string | null;
  state?: string | null;
  category_id?: number | null;
};

/** One row of GET /api/available-now */
export type AvailableNowListItem = AvailableNowStatus & {
  distance_km?: number | null;
  business: AvailableNowBusiness;
};

export type AvailableNowListParams = {
  category_id?: number | null;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  min_price?: number;
  max_price?: number;
  /** 0 = free right now only, 60 = next hour, 1440 = today */
  within_minutes?: number;
  page?: number;
  per_page?: number;
};

export type AvailableNowListMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};
