import { ApiService } from "@/src/services/api";
import { notificationsEndpoints } from "@/src/services/endpoints";

export type NotificationPreferences = {
  new_reels: boolean;
  promotions: boolean;
  last_minute_openings: boolean;
  new_services: boolean;
  new_memberships: boolean;
  daily_cap_per_business: number;
  biz_new_follower: boolean;
  biz_reel_likes: boolean;
  biz_reel_comments: boolean;
  biz_reel_bookings: boolean;
};

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const DEFAULTS: NotificationPreferences = {
  new_reels: true,
  promotions: true,
  last_minute_openings: true,
  new_services: true,
  new_memberships: true,
  daily_cap_per_business: 3,
  biz_new_follower: true,
  biz_reel_likes: true,
  biz_reel_comments: true,
  biz_reel_bookings: true,
};

function normalize(
  raw: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  const cap = Number(raw?.daily_cap_per_business);
  return {
    new_reels: raw?.new_reels ?? DEFAULTS.new_reels,
    promotions: raw?.promotions ?? DEFAULTS.promotions,
    last_minute_openings:
      raw?.last_minute_openings ?? DEFAULTS.last_minute_openings,
    new_services: raw?.new_services ?? DEFAULTS.new_services,
    new_memberships: raw?.new_memberships ?? DEFAULTS.new_memberships,
    daily_cap_per_business:
      Number.isFinite(cap) && cap >= 1 && cap <= 20
        ? Math.floor(cap)
        : DEFAULTS.daily_cap_per_business,
    biz_new_follower: raw?.biz_new_follower ?? DEFAULTS.biz_new_follower,
    biz_reel_likes: raw?.biz_reel_likes ?? DEFAULTS.biz_reel_likes,
    biz_reel_comments: raw?.biz_reel_comments ?? DEFAULTS.biz_reel_comments,
    biz_reel_bookings: raw?.biz_reel_bookings ?? DEFAULTS.biz_reel_bookings,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await ApiService.get<
    Envelope<NotificationPreferences> | NotificationPreferences
  >(notificationsEndpoints.preferences);
  const data =
    response && typeof response === "object" && "data" in response
      ? (response as Envelope<NotificationPreferences>).data
      : (response as NotificationPreferences);
  return normalize(data);
}

export async function updateNotificationPreferences(
  patch: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  const response = await ApiService.put<
    Envelope<NotificationPreferences> | NotificationPreferences
  >(notificationsEndpoints.preferences, patch);
  const data =
    response && typeof response === "object" && "data" in response
      ? (response as Envelope<NotificationPreferences>).data
      : (response as NotificationPreferences);
  return normalize(data);
}
