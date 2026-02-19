import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Location } from "./userSlice";

export type UserRole = "business" | "customer" | "staff" | null;

export interface SearchState {
  search: string;
  serviceId: number | null;
  businessId: string;
  businessName: string;
  businessLocationName: string;
  serviceName?: string;
  businessLogoUrl?: string;
}

export interface SearchReturnFromSearch2 {
  search: string;
  serviceId: number | null;
  serviceName: string;
}

export interface AdditionalServiceItem {
  id: number;
  name: string;
  price: string;
  ai_requests: number | null;
  type: string;
  active: boolean;
  createdAt: string;
}

const initialSearchState: SearchState = {
  search: "",
  serviceId: null,
  businessId: "",
  businessName: "",
  businessLocationName: "",
  businessLogoUrl: "",
};

function isSameLocation(a: Location, b: Location): boolean {
  return (
    a.lat === b.lat &&
    a.long === b.long &&
    (a.locationName ?? null) === (b.locationName ?? null) &&
    (a.countryName ?? null) === (b.countryName ?? null) &&
    (a.cityName ?? null) === (b.cityName ?? null) &&
    (a.countryCode ?? null) === (b.countryCode ?? null) &&
    (a.zipCode ?? null) === (b.zipCode ?? null)
  );
}

export interface GeneralState {
  theme: "light" | "dark" | "blue";
  themeType: "default" | "system";
  language: string;
  registerEmail: string | null; // Saved email after registration
  savedPassword: string | null; // Saved password if user checked "save password"
  actionLoader: boolean; // Global action loader state
  actionLoaderTitle: string; // Title to display with action loader
  locationLoading: boolean; // Location loading state
  toggleLoading: boolean; // Toggle loading state (not persisted)
  role: UserRole; // Selected user role
  isVisitFirst: boolean; // Track if it's the first visit
  selectedDate: string | null; // Selected date for viewing appointments (ISO string format)
  searchState: SearchState; // Search filters (search, serviceId, business, etc.)
  guestModeModalVisible: boolean; // Guest mode modal visibility state
  isFirstShowTryOn: boolean; // Track if first show try-on has been displayed
  currentLocation: Location; // Current location (lat, long, locationName)
  recentLocations: Location[]; // Recent locations (persisted)
  recentSearches: SearchState[]; // Recent searches as objects (persisted, max 4)
  searchReturnFromSearch2: SearchReturnFromSearch2 | null; // When search2 returns to search screen (not persisted)
  aiService: AdditionalServiceItem[] | null; // Additional services by type (not persisted)
  tryOnBannerDismissed: boolean; // User closed try-on banner this session (not persisted, reset on app open)
  // Full image modal (not persisted)
  fullImageModalVisible: boolean;
  fullImageModalImages: string[];
  fullImageModalInitialIndex: number;
}

const initialState: GeneralState = {
  theme: "light",
  themeType: "default",
  language: "en",
  registerEmail: null,
  savedPassword: null,
  actionLoader: false,
  actionLoaderTitle: "",
  locationLoading: false,
  toggleLoading: false,
  role: null,
  isVisitFirst: true,
  selectedDate: null,
  searchState: initialSearchState,
  guestModeModalVisible: false,
  isFirstShowTryOn: false,
  currentLocation: {
    lat: null,
    long: null,
    locationName: null,
    countryName: null,
    cityName: null,
    countryCode: null,
    zipCode: null,
  },
  recentLocations: [],
  recentSearches: [],
  searchReturnFromSearch2: null,
  aiService: null,
  tryOnBannerDismissed: false,
  fullImageModalVisible: false,
  fullImageModalImages: [],
  fullImageModalInitialIndex: 0,
};

const generalSlice = createSlice({
  name: "general",
  initialState,
  reducers: {
    resetGeneral: () => initialState,
    setTheme(state, action: PayloadAction<"light" | "dark" | "blue">) {
      state.theme = action.payload;
    },
    setThemeType(state, action: PayloadAction<"default" | "system">) {
      state.themeType = action.payload;
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },

    setRegisterEmail(state, action: PayloadAction<string>) {
      state.registerEmail = action.payload;
    },
    setSavedPassword(state, action: PayloadAction<string | null>) {
      state.savedPassword = action.payload;
    },
    setActionLoader(state, action: PayloadAction<boolean>) {
      state.actionLoader = action.payload;
    },
    setActionLoaderTitle(state, action: PayloadAction<string>) {
      state.actionLoaderTitle = action.payload;
    },
    setLocationLoading(state, action: PayloadAction<boolean>) {
      state.locationLoading = action.payload;
    },
    setToggleLoading(state, action: PayloadAction<boolean>) {
      state.toggleLoading = action.payload;
    },
    setRole(state, action: PayloadAction<UserRole>) {
      state.role = action.payload;
    },
    setIsVisitFirst(state, action: PayloadAction<boolean>) {
      state.isVisitFirst = action.payload;
    },
    setSelectedDate(state, action: PayloadAction<string | null>) {
      state.selectedDate = action.payload;
    },
    clearSelectedDate(state) {
      state.selectedDate = null;
    },
    setSearchState(state, action: PayloadAction<SearchState>) {
      state.searchState = action.payload;
    },
    clearSearchState(state) {
      state.searchState = { ...initialSearchState };
    },
    setSearchReturnFromSearch2(
      state,
      action: PayloadAction<SearchReturnFromSearch2>,
    ) {
      state.searchReturnFromSearch2 = action.payload;
    },
    clearSearchReturnFromSearch2(state) {
      state.searchReturnFromSearch2 = null;
    },
    setAiService(state, action: PayloadAction<AdditionalServiceItem[] | null>) {
      state.aiService = action.payload;
    },
    setTryOnBannerDismissed(state, action: PayloadAction<boolean>) {
      state.tryOnBannerDismissed = action.payload;
    },
    openFullImageModal(
      state,
      action: PayloadAction<{ images: string[]; initialIndex?: number }>,
    ) {
      const { images, initialIndex = 0 } = action.payload;
      if (!images?.length) return;
      state.fullImageModalVisible = true;
      state.fullImageModalImages = images;
      state.fullImageModalInitialIndex = Math.min(
        Math.max(0, initialIndex),
        Math.max(0, images.length - 1),
      );
    },
    closeFullImageModal(state) {
      state.fullImageModalVisible = false;
      state.fullImageModalImages = [];
      state.fullImageModalInitialIndex = 0;
    },
    setGuestModeModalVisible(state, action: PayloadAction<boolean>) {
      state.guestModeModalVisible = action.payload;
    },
    setIsFirstShowTryOn(state, action: PayloadAction<boolean>) {
      state.isFirstShowTryOn = action.payload;
    },
    setCurrentLocation(state, action: PayloadAction<Location>) {
      state.currentLocation = action.payload;
    },
    addToRecentLocations(state, action: PayloadAction<Location>) {
      const loc = action.payload;
      const idx = state.recentLocations.findIndex((r) =>
        isSameLocation(r, loc),
      );
      if (idx >= 0) {
        state.recentLocations.splice(idx, 1);
      }
      state.recentLocations.unshift(loc);
      // Keep only the latest 5 recent locations
      if (state.recentLocations.length > 5) {
        state.recentLocations = state.recentLocations.slice(0, 5);
      }
    },
    addToRecentSearches(state, action: PayloadAction<SearchState>) {
      const item = action.payload;
      if (!item.search.trim()) return;
      const itemSearch = (item.search ?? "").toLowerCase();
      const idx = state.recentSearches.findIndex((s) => {
        const searchStr =
          typeof s === "string" ? s : (s as SearchState).search ?? "";
        const sid =
          typeof s === "string" ? null : (s as SearchState).serviceId ?? null;
        return (
          searchStr.toLowerCase() === itemSearch &&
          sid === (item.serviceId ?? null)
        );
      });
      if (idx >= 0) {
        state.recentSearches.splice(idx, 1);
      }
      state.recentSearches.unshift({ ...item });
      if (state.recentSearches.length > 4) {
        state.recentSearches = state.recentSearches.slice(0, 4);
      }
    },
    clearCurrentLocation(state) {
      state.currentLocation = {
        lat: null,
        long: null,
        locationName: null,
        countryName: null,
        cityName: null,
        countryCode: null,
        zipCode: null,
      };
    },
    clearGeneral(state) {
      state.theme = initialState.theme;
      state.themeType = initialState.themeType;
      state.language = initialState.language;
      // state.registerEmail = initialState.registerEmail;
      // state.savedPassword = initialState.savedPassword;
      state.actionLoader = initialState.actionLoader;
      state.actionLoaderTitle = initialState.actionLoaderTitle;
      state.locationLoading = initialState.locationLoading;
      state.toggleLoading = initialState.toggleLoading;
      state.role = initialState.role;
      // state.isVisitFirst = initialState.isVisitFirst;
      state.selectedDate = initialState.selectedDate;
      state.searchState = initialState.searchState;
      state.guestModeModalVisible = initialState.guestModeModalVisible;
      // state.isFirstShowTryOn = initialState.isFirstShowTryOn;
      state.currentLocation = initialState.currentLocation;
      state.recentLocations = initialState.recentLocations;
      state.recentSearches = initialState.recentSearches;
      state.searchReturnFromSearch2 = null;
      state.aiService = null;
      state.tryOnBannerDismissed = false;
      state.fullImageModalVisible = false;
      state.fullImageModalImages = [];
      state.fullImageModalInitialIndex = 0;
    },
  },
});

export const {
  setTheme,
  setThemeType,
  setLanguage,
  setRegisterEmail,
  setSavedPassword,
  setActionLoader,
  setActionLoaderTitle,
  setLocationLoading,
  setToggleLoading,
  setRole,
  setIsVisitFirst,
  setSelectedDate,
  clearSelectedDate,
  setSearchState,
  clearSearchState,
  setSearchReturnFromSearch2,
  clearSearchReturnFromSearch2,
  setAiService,
  setTryOnBannerDismissed,
  openFullImageModal,
  closeFullImageModal,
  setGuestModeModalVisible,
  setIsFirstShowTryOn,
  setCurrentLocation,
  addToRecentLocations,
  addToRecentSearches,
  clearCurrentLocation,
  resetGeneral,
  clearGeneral,
} = generalSlice.actions;
export default generalSlice.reducer;
