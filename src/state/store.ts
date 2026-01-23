import { LocalStorageService } from "@/src/services/storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import Logger from "@/src/services/logger";
import generalReducer from "./slices/generalSlice";
import completeProfileReducer from "./slices/completeProfileSlice";
import userReducer from "./slices/userSlice";
import bsnsReducer from "./slices/bsnsSlice";
import chatReducer from "./slices/chatSlice";
import categoriesReducer from "./slices/categoriesSlice";

// ✅ Custom AsyncStorage adapter for redux-persist
// Note: redux-persist supports async storage, but we need to ensure promises are properly handled
const LocalStorageAdapter = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await LocalStorageService.setItem(key, value);
    } catch (error) {
      Logger.error(`❌ Failed to persist ${key}:`, error);
      // Don't throw - let redux-persist handle it gracefully
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await LocalStorageService.getItem(key);
      return value;
    } catch (error) {
      Logger.error(`❌ Failed to retrieve ${key}:`, error);
      // Return null on error so redux-persist can use initial state
      return null;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await LocalStorageService.removeItem(key);
    } catch (error) {
      Logger.error(`❌ Failed to remove ${key}:`, error);
      // Don't throw - let redux-persist handle it gracefully
    }
  },
};

// ✅ Nested persist config for general slice - only persist specific fields
// This approach is more reliable than using transforms at root level
const generalPersistConfig = {
  key: "general",
  storage: LocalStorageAdapter,
  whitelist: ["theme", "themeType", "language", "savedPassword","registerEmail", "isVisitFirst"], // Only persist these fields
};

// ✅ Nested persist config for user slice - only persist name, id, email, tokens, userRole (businessStatus is NOT persisted)
const userPersistConfig = {
  key: "user",
  storage: LocalStorageAdapter,
  whitelist: ["id", "name", "email",  "email_notifications", "profile_image_url", "accessToken", "userRole", "unreadCount","description","country_code","phone", "isGuest", "location", "discover", "selectBsnsCategory", "dateOfBirth", "countryZipCode", "countryName","business_id","business_name"], // Only persist these fields (businessStatus excluded)
};

 

// ✅ Persist the general reducer with field filtering
const persistedGeneralReducer = persistReducer(generalPersistConfig, generalReducer);

// ✅ Persist the user reducer with field filtering
const persistedUserReducer = persistReducer(userPersistConfig, userReducer);

 

// ✅ combine reducers
const rootReducer = combineReducers({
  general: persistedGeneralReducer, // Already persisted with field filtering
  completeProfile: completeProfileReducer, // Not persisted
  user: persistedUserReducer, // Persisted with field filtering (id, name, token)
  bsns: bsnsReducer, // Business/booking state
  chat: chatReducer, // AI Chat state (not persisted)
  categories: categoriesReducer, // Categories state (not persisted)
});

// ✅ No root-level persistence needed - general is already persisted with nested config
// Just use rootReducer directly since nested persist handles it

// ✅ store config
export const store = configureStore({
  reducer: rootReducer, // Use rootReducer directly - general is already persisted via nested persist
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

// ✅ types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
