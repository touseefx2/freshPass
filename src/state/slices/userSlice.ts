import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "business" | "customer" | "staff" | null;

export interface BusinessStatus {
  onboarding_completed: boolean;
  current_step: number | null;
  next_step: number | null;
  business_category: {
    id: number;
    name: string;
  } | null;
  stripe_onboarding_status: string;
  stripe_onboarding_link: string | null;
  has_subscription: boolean;
  subscription_status: string;
  active: boolean;
  business_id?: number;
  business_name?: string;
}

export interface Location {
  lat: number | null;
  long: number | null;
  locationName: string | null;
  countryName: string | null;
  cityName: string | null;
  countryCode: string | null;
  zipCode: string | null;
}

export type DiscoverType = "women" | "men" | "both" | "other" | null;

export interface UserState {
  id: number | null;
  name: string | null;
  description: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  email_notifications: boolean | null;
  profile_image_url: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userRole: UserRole;
  unreadCount: number;
  businessStatus: BusinessStatus | null;
  // Business status loading/error states (NOT persisted)
  businessStatusLoading: boolean;
  businessStatusError: boolean;
  isGuest: boolean;
  location: Location;
  discover: DiscoverType;
  selectBsnsCategory: {
    id: number;
    name: string;
  }[];
  dateOfBirth: {
    date: string;
    month: string;
    year: string;
  } | null;
  countryZipCode: string;
  countryName: string;
  business_id?: number;
  business_name?: string;
}

const initialState: UserState = {
  id: null,
  name: null,
  description: "",
  email: null,
  phone: null,
  country_code: null,
  email_notifications: null,
  profile_image_url: null,
  accessToken: null,
  refreshToken: null,
  userRole: null,
  businessStatus: null,
  unreadCount: 0,
  businessStatusLoading: false,
  businessStatusError: false,
  isGuest: false,
  location: {
    lat: null,
    long: null,
    locationName: null,
    countryName: null,
    cityName: null,
    countryCode: null,
    zipCode: null,
  },
  discover: null,
  selectBsnsCategory: [],
  dateOfBirth: null,
  countryZipCode: "",
  countryName: "",
  business_id: undefined,
  business_name: undefined,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetUser: () => initialState,
    setUser(
      state,
      action: PayloadAction<{
        id: number;
        name: string;
        description?: string;
        email?: string;
        phone?: string;
        country_code?: string;
        profile_image_url?: string;
        accessToken: string;
        refreshToken?: string;
        userRole?: UserRole;
      }>,
    ) {
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.description = action.payload.description || "";
      state.email = action.payload.email || null;
      // Optional contact/profile fields from login response
      state.phone = action.payload.phone || null;
      state.country_code = action.payload.country_code || null;
      state.profile_image_url = action.payload.profile_image_url || null;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
      state.userRole = action.payload.userRole || null;
    },
    setUserRole(state, action: PayloadAction<UserRole>) {
      state.userRole = action.payload;
    },
    setTokens(
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken?: string;
      }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
    },
    setBusinessStatus(state, action: PayloadAction<BusinessStatus>) {
      state.businessStatus = action.payload;
      state.businessStatusError = false;
    },
    setBusinessStatusLoading(state, action: PayloadAction<boolean>) {
      state.businessStatusLoading = action.payload;
    },
    setBusinessStatusError(state, action: PayloadAction<boolean>) {
      state.businessStatusError = action.payload;
    },
    setUserDetails(
      state,
      action: PayloadAction<{
        name?: string | null;
        description?: string;
        email?: string | null;
        phone?: string | null;
        country_code?: string | null;
        email_notifications?: boolean | null;
        profile_image_url?: string | null;
        dateOfBirth?: {
          date: string;
          month: string;
          year: string;
        } | null;
        countryZipCode?: string;
        countryName?: string;
        business_id?: number;
        business_name?: string;
      }>,
    ) {
      if (action.payload.name !== undefined) {
        state.name = action.payload.name;
      }
      if (action.payload.description !== undefined) {
        state.description = action.payload.description;
      }
      if (action.payload.email !== undefined) {
        state.email = action.payload.email;
      }
      if (action.payload.phone !== undefined) {
        state.phone = action.payload.phone;
      }
      if (action.payload.country_code !== undefined) {
        state.country_code = action.payload.country_code;
      }
      if (action.payload.email_notifications !== undefined) {
        state.email_notifications = action.payload.email_notifications;
      }
      if (action.payload.profile_image_url !== undefined) {
        state.profile_image_url = action.payload.profile_image_url;
      }
      if (action.payload.dateOfBirth !== undefined) {
        state.dateOfBirth = action.payload.dateOfBirth;
      }
      if (action.payload.countryZipCode !== undefined) {
        state.countryZipCode = action.payload.countryZipCode;
      }
      if (action.payload.countryName !== undefined) {
        state.countryName = action.payload.countryName;
      }
      if (action.payload.business_id !== undefined) {
        state.business_id = action.payload.business_id;
      }
      if (action.payload.business_name !== undefined) {
        state.business_name = action.payload.business_name;
      }
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    setIsGuest(state, action: PayloadAction<boolean>) {
      state.isGuest = action.payload;
    },
    setLocation(state, action: PayloadAction<Location>) {
      state.location = action.payload;
    },
    clearLocation(state) {
      state.location = {
        lat: null,
        long: null,
        locationName: null,
        countryName: null,
        cityName: null,
        countryCode: null,
        zipCode: null,
      };
    },
    setDiscover(state, action: PayloadAction<DiscoverType>) {
      state.discover = action.payload;
    },
    setSelectBsnsCategory(
      state,
      action: PayloadAction<
        {
          id: number;
          name: string;
        }[]
      >,
    ) {
      state.selectBsnsCategory = action.payload;
    },
    setBusinessId(state, action: PayloadAction<number | undefined>) {
      state.business_id = action.payload;
    },
  },
});

export const {
  setUser,
  setTokens,
  setUserRole,
  setBusinessStatus,
  setBusinessStatusLoading,
  setBusinessStatusError,
  setUserDetails,
  setUnreadCount,
  setIsGuest,
  setLocation,
  setDiscover,
  setSelectBsnsCategory,
  setBusinessId,
  resetUser,
  clearLocation
} = userSlice.actions;
export default userSlice.reducer;
