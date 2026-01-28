import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Location } from "./userSlice";

export type UserRole = "business" | "customer" | "staff" | null;

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
  searchText: string; // Search text for location/services search
  guestModeModalVisible: boolean; // Guest mode modal visibility state
  isFirstShowTryOn: boolean; // Track if first show try-on has been displayed
  currentLocation: Location; // Current location (lat, long, locationName)
  recentLocations: Location[]; // Recent locations (persisted)
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
  searchText: "",
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
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
    clearSearchText(state) {
      state.searchText = "";
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
      const idx = state.recentLocations.findIndex((r) => isSameLocation(r, loc));
      if (idx >= 0) {
        state.recentLocations.splice(idx, 1);
      }
      state.recentLocations.unshift(loc);
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
      state.searchText = initialState.searchText;
      state.guestModeModalVisible = initialState.guestModeModalVisible;
      // state.isFirstShowTryOn = initialState.isFirstShowTryOn;
      state.currentLocation = initialState.currentLocation;
      state.recentLocations = initialState.recentLocations;
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
  setSearchText,
  clearSearchText,
  setGuestModeModalVisible,
  setIsFirstShowTryOn,
  setCurrentLocation,
  addToRecentLocations,
  clearCurrentLocation,
  resetGeneral,
  clearGeneral,
} = generalSlice.actions;
export default generalSlice.reducer;
