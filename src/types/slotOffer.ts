export interface SlotOfferBusiness {
  id: number;
  title: string;
  image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: { id: number; name: string } | null;
}

export interface SlotOfferStaff {
  id: number;
  name: string;
}

export interface SlotOfferService {
  id: number;
  name: string;
}

export type SlotOfferStatus =
  | "live"
  | "paused"
  | "withdrawn"
  | "booked"
  | "expired"
  | "unavailable";

export interface SlotOffer {
  id: number;
  status: SlotOfferStatus;
  bookable: boolean;
  business: SlotOfferBusiness;
  staff: SlotOfferStaff | null;
  service: SlotOfferService;
  date: string;
  start_time: string;
  starts_at: string;
  duration_minutes: number;
  normal_price: number;
  offer_price: number;
  savings: number;
  closes_at: string;
  timezone: string;
  cancellation_policy: any | null;
  views_count: number | null;
  appointment: { id: number; status: string } | null;
}

export interface SlotOfferListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface SlotOfferMineSummary {
  live: number;
  views: number;
  booked: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface SlotOfferListResponse {
  data: SlotOffer[];
  meta: SlotOfferListMeta;
}

export interface SlotOfferMineResponse {
  data: SlotOffer[];
  meta: SlotOfferListMeta;
  summary: SlotOfferMineSummary;
}

export interface SlotOfferCreatePayload {
  staff_id?: number;
  service_id: number;
  date: string;
  start_time: string;
  offer_price?: number;
  closes_at: string;
}

export interface AppointmentSlotOffer {
  id: number;
  normalPrice: number;
  offerPrice: number;
  savings: number;
}
