import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "business" | "customer" | "staff" | null;

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
};

const generalSlice = createSlice({
  name: "general",
  initialState,
  reducers: {
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
    resetGeneral(state) {
      state.language = "en";
      state.selectedDate = null;
      state.searchText = "";
      state.actionLoaderTitle = "";
      state.actionLoader = false;
      state.locationLoading = false;
      state.guestModeModalVisible = false;
      state.toggleLoading=false
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
  resetGeneral,
} = generalSlice.actions;
export default generalSlice.reducer;
