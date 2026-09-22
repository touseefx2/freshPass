import type { PageMeta } from "@/src/types/reels";

export type BusinessFollower = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  profile_image_url: string | null;
  followed_at: string | null;
  is_customer: boolean;
};

export type BusinessFollowersPage = {
  data: BusinessFollower[];
  meta: PageMeta;
};
