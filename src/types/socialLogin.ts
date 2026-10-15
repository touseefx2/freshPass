export type SocialProvider = "google" | "apple" | "facebook";

export type SocialLoginApiResponse = {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      name: string;
      email?: string;
      phone?: string;
      country_code?: string;
      profile_image_url?: string;
      role: string;
      rolesCount?: number;
      createdAt?: string;
      business_hours?: Array<{
        day: string;
        opening_time: string;
        closing_time: string;
        break_hours: Array<{
          start: string;
          end: string;
        }>;
      }>;
      is_onboarded?: boolean;
      business_name?: string;
      description?: string;
      /** Business/Staff: "customer" when last left in customer mode; null = business */
      active_mode?: string | null;
      can_switch_mode?: boolean;
    };
    token: string;
    isNewCreated?: boolean;
  };
};
