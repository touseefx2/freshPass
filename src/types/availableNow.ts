/** Live Available Now status of one business (customer list row). */
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

export type AvailableNowBusiness = {
  id: number;
  title: string;
  slug?: string | null;
  image_url?: string | null;
  city?: string | null;
  state?: string | null;
  category_id?: number | null;
  /** true: Solo, or no staff yet — booked against the business's own hours */
  is_single_provider?: boolean;
  /** Has an open job post — gold frame + HIRING corner badge, like other business cards */
  is_hiring?: boolean;
};

export type AvailableNowStaff = {
  /** Staff id used in booking */
  id: number;
  name: string | null;
  is_owner: boolean;
};

/** One row of GET /api/available-now — one business */
export type AvailableNowListItem = AvailableNowStatus & {
  distance_km?: number | null;
  business: AvailableNowBusiness;
  /** Staff free at next_opening_at; [] for a single-provider business */
  available_staff?: AvailableNowStaff[];
  /** Last free start today */
  last_opening_at?: string | null;
};

export type AvailableNowListParams = {
  category_id?: number | null;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  /** left out = rest of today, 0 = now, 60 = next hour, 1440 = today */
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
