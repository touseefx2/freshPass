/** One review from GET /api/reviews (business, staff or customer list). */
export interface ReviewListItem {
  id: number;
  business_id: number;
  business?: { id: number; title: string } | null;
  user_id: number;
  user?: {
    id: number;
    name: string | null;
    email?: string | null;
    profile_image_url?: string | null;
    avatar?: string | null;
  } | null;
  overall_rating: string | number;
  comment: string | null;
  review_suggestion_id: number | null;
  review_suggestion?: { id: number; title: string } | null;
  created_at: string;
  /** Who did the visit; null = business only */
  staff_id?: number | null;
  staff?: {
    id: number;
    name: string;
    profile_image_url: string | null;
  } | null;
  image_url?: string | null;
  video_url?: string | null;
}

export interface ReviewListResponse {
  success: boolean;
  message: string;
  data: ReviewListItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  averages: {
    overall_average_rating: number;
  };
}

/** Same names as the business rating, on every staff payload. */
export interface StaffRating {
  average_rating?: number | string | null;
  ratings_count?: number | null;
}
