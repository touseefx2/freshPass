import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import NetInfo from "@react-native-community/netinfo";
import { store } from "@/src/state/store";
import { setTokens, resetUser } from "@/src/state/slices/userSlice";
import { clearGeneral } from "../state/slices/generalSlice";
import { resetCompleteProfile } from "../state/slices/completeProfileSlice";
import { Platform } from "react-native";
import { router } from "expo-router";
import { MAIN_ROUTES } from "../constant/routes";
import Logger from "./logger";
import { resetCategories } from "../state/slices/categoriesSlice";
import { resetBusiness } from "../state/slices/bsnsSlice";
import { resetChat } from "../state/slices/chatSlice";
// Get base URL from environment
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

// Get guest token from environment
const getGuestToken = (): string | null => {
  return process.env.EXPO_PUBLIC_AUTH_TOKEN || null;
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 1 minute (60 seconds)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Flag to prevent multiple simultaneous refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

// Track all pending API requests for cancellation
const pendingRequests = new Set<AbortController>();

// Callback for handling session expiration (401 errors)
let onSessionExpired: (() => void) | null = null;

/**
 * Set callback to handle session expiration
 * This will be called when a 401 error occurs
 */
export const setSessionExpiredHandler = (callback: () => void) => {
  onSessionExpired = callback;
};

// Callback for showing toast notifications
let onShowToast:
  | ((
      title: string,
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => void)
  | null = null;

/**
 * Set callback to handle toast notifications
 * This will be called when we need to show toast messages
 */
export const setToastHandler = (
  callback: (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => void,
) => {
  onShowToast = callback;
};

/**
 * Check internet connectivity using NetInfo
 * Returns true if internet is available, false otherwise
 * Note: This is a best-effort check. For local network requests, we're more lenient.
 */
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "web") {
      // For web, check navigator.onLine
      return navigator.onLine;
    }

    // Fetch network state
    const state = await NetInfo.fetch();

    // If connected to any network (WiFi, cellular, etc.), allow the request
    // NetInfo's isInternetReachable can be unreliable, especially for local networks
    // Let axios handle actual network errors instead of blocking upfront
    if (state.isConnected === true) {
      // If connected, allow the request to proceed
      // The actual network error will be caught by axios if the request fails
      return true;
    }

    // Only block if explicitly not connected to any network
    return false;
  } catch (error) {
    Logger.error("Error checking internet connection:", error);
    // On error, allow the request to proceed - let axios handle network errors
    return true;
  }
};

// Process queued requests after token refresh
const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Get access token from Redux userSlice
 */
const getAccessToken = (): string | null => {
  try {
    const state = store.getState();
    return state.user?.accessToken || null;
  } catch (error) {
    Logger.error("❌ Failed to get access token:", error);
    return null;
  }
};

/**
 * Get refresh token from Redux userSlice
 */
const getRefreshToken = (): string | null => {
  try {
    const state = store.getState();
    return state.user?.refreshToken || null;
  } catch (error) {
    Logger.error("❌ Failed to get refresh token:", error);
    return null;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Determine which refresh endpoint to use based on current context
    // You may need to adjust this based on your API structure
    const refreshEndpoint = `${BASE_URL}/auth/refresh`;

    const response = await axios.post(refreshEndpoint, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (accessToken) {
      // Update tokens in Redux
      store.dispatch(
        setTokens({
          accessToken: accessToken,
          refreshToken: newRefreshToken || undefined,
        }),
      );
      return accessToken;
    }

    throw new Error("Invalid refresh token response");
  } catch (error) {
    Logger.error("❌ Failed to refresh token:", error);
    handleLogout();
    throw error;
  }
};

/**
 * Cancel all pending API requests
 */
const cancelAllPendingRequests = () => {
  pendingRequests.forEach((controller) => {
    try {
      controller.abort();
    } catch (error) {
      Logger.error("Error aborting request:", error);
    }
  });
  pendingRequests.clear();
};

/**
 * Create and track an AbortController for a request
 */
const createAbortController = (): AbortController => {
  const controller = new AbortController();
  pendingRequests.add(controller);
  return controller;
};

/**
 * Remove AbortController from tracking when request completes
 */
const removeAbortController = (controller: AbortController) => {
  pendingRequests.delete(controller);
};

/**
 * Handle logout - clear tokens and persisted storage
 * Note: Navigation and Redux reset should be handled in the component calling logout
 * This function clears tokens from Redux state and all persisted data from SecureStore
 */
const handleLogout = async () => {
  // Cancel all pending API requests
  // cancelAllPendingRequests();
  // Clear Redux state
  store.dispatch(resetCompleteProfile());
  store.dispatch(clearGeneral());
  store.dispatch(resetCategories());
  store.dispatch(resetBusiness());
  store.dispatch(resetChat());
  store.dispatch(resetUser());
  router.replace(`/(main)/${MAIN_ROUTES.ROLE}`);
};

/**
 * Get readable error message from API response
 */
const getErrorMessage = (error: AxiosError): string => {
  // Handle network errors
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please check your connection and try again.";
    }
    if (error.message === "Network Error") {
      return "Network error. Please check your internet connection.";
    }
    return "Unable to connect to server. Please try again later.";
  }

  const { status, data } = error.response;

  // Handle specific status codes
  switch (status) {
    case 400:
      return (
        (data as any)?.message ||
        (data as any)?.error ||
        "Invalid request. Please check your input."
      );
    case 401:
      return "Unauthorized. Please login again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "Resource not found.";
    case 422:
      return (
        (data as any)?.message ||
        (data as any)?.error ||
        "Validation error. Please check your input."
      );
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
      return "Bad gateway. Please try again later.";
    case 503:
      return "Service unavailable. Please try again later.";
    default:
      return (
        (data as any)?.message ||
        (data as any)?.error ||
        `An error occurred (${status}). Please try again.`
      );
  }
};

// Request interceptor - Add access token or guest token to headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      // Only add token if Authorization header is not already set (for guest calls)
      if (!config.headers?.Authorization) {
        const accessToken = getAccessToken();
        if (accessToken && config.headers) {
          // Use access token if available
          config.headers.Authorization = `Bearer ${accessToken}`;
        } else {
          // Fallback to guest token if no access token
          const guestToken = getGuestToken();
          if (guestToken && config.headers) {
            config.headers.Authorization = `Bearer ${guestToken}`;
          }
        }
      }
    } catch (error) {
      Logger.error("❌ Failed to add token to request:", error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Session expired
    if (error.response?.status === 401) {
      // Clear user data and tokens
      await handleLogout();

      // Call session expired handler (for toast and navigation)
      if (onSessionExpired) {
        onSessionExpired();
      }

      // Return error with session expired message
      const sessionError = new Error("Session expired. Please login again.");
      (sessionError as any).status = 401;
      (sessionError as any).isSessionExpired = true;
      return Promise.reject(sessionError);
    }

    // Handle 401 Unauthorized - Try to refresh token (COMMENTED OUT)
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   if (isRefreshing) {
    //     // If already refreshing, queue this request
    //     return new Promise((resolve, reject) => {
    //       failedQueue.push({ resolve, reject });
    //     })
    //       .then((token) => {
    //         if (originalRequest.headers && token) {
    //           originalRequest.headers.Authorization = `Bearer ${token}`;
    //         }
    //         return apiClient(originalRequest);
    //       })
    //       .catch((err) => {
    //         return Promise.reject(err);
    //       });
    //   }

    //   originalRequest._retry = true;
    //   isRefreshing = true;

    //   try {
    //     const newToken = await refreshAccessToken();
    //     processQueue(null, newToken);

    //     if (originalRequest.headers && newToken) {
    //       originalRequest.headers.Authorization = `Bearer ${newToken}`;
    //     }

    //     return apiClient(originalRequest);
    //   } catch (refreshError) {
    //     processQueue(refreshError as AxiosError, null);
    //     await handleLogout();
    //     return Promise.reject(refreshError);
    //   } finally {
    //     isRefreshing = false;
    //   }
    // }

    // Handle timeout errors
    if (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout") ||
      (error.config && error.config.timeout && !error.response)
    ) {
      // Show timeout toast
      if (onShowToast) {
        onShowToast(
          "Request Timeout",
          "The request took too long to complete. Please try again.",
          "error",
        );
      }
    }

    // For other errors, return readable error message
    const errorMessage = getErrorMessage(error);
    const customError = new Error(errorMessage);
    (customError as any).status = error.response?.status;
    (customError as any).data = error.response?.data;

    return Promise.reject(customError);
  },
);

/**
 * Helper functions for API logging
 */
const getFullUrl = (route: string): string => {
  // Remove trailing slash from BASE_URL and leading slash from route if needed
  const baseUrl = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanRoute = route.startsWith("/") ? route : `/${route}`;
  return `${baseUrl}${cleanRoute}`;
};

const logApiRequest = (
  method: string,
  route: string,
  body?: any,
  config?: AxiosRequestConfig,
) => {
  if (__DEV__) {
    const fullUrl = getFullUrl(route);
    const logData: any = {
      url: fullUrl,
      route: route,
      baseURL: BASE_URL,
    };

    if (body !== undefined) {
      logData.body = body;
    }
    if (config) {
      logData.config = config;
    }

    Logger.log(`🚀 API ${method} Request:`, JSON.stringify(logData));
  }
};

const logApiResponse = (
  method: string,
  url: string,
  route: string,
  status: number,
  data: any,
) => {
  if (__DEV__) {
    const fullUrl = getFullUrl(route);
    Logger.log(`✅ API ${method} Response:`, {
      url: fullUrl,
      status: status,
      data: JSON.stringify(data),
    });
  }
};

const logApiError = (
  method: string,
  url: string,
  route: string,
  error: any,
) => {
  if (__DEV__) {
    const fullUrl = getFullUrl(route);
    Logger.error(`❌ API ${method} Error:`, {
      url: fullUrl,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
};

/**
 * API Service Class
 * Provides unified methods for all API calls
 */
export class ApiService {
  /**
   * GET request
   */
  static async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logApiRequest("GET", url, undefined, config);

    const abortController = createAbortController();
    const requestConfig = {
      ...config,
      signal: abortController.signal,
    };

    try {
      const response = await apiClient.get<T>(url, requestConfig);
      logApiResponse("GET", url, url, response.status, response.data);
      removeAbortController(abortController);
      return response.data;
    } catch (error: any) {
      removeAbortController(abortController);
      // Don't log error if request was aborted
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        logApiError("GET", url, url, error);
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logApiRequest("POST", url, data, config);

    const abortController = createAbortController();
    const requestConfig = {
      ...config,
      signal: abortController.signal,
    };

    // Check internet connection before making POST request
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      removeAbortController(abortController);
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;

      // Show toast for no internet connection
      if (onShowToast) {
        onShowToast(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          "error",
        );
      }

      logApiError("POST", url, url, error);
      throw error;
    }

    try {
      const response = await apiClient.post<T>(url, data, requestConfig);
      logApiResponse("POST", url, url, response.status, response.data);
      removeAbortController(abortController);
      return response.data;
    } catch (error: any) {
      removeAbortController(abortController);
      // Don't log error if request was aborted
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        logApiError("POST", url, url, error);
      }
      throw error;
    }
  }

  /**
   * PUT request
   */
  static async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logApiRequest("PUT", url, data, config);

    const abortController = createAbortController();
    const requestConfig = {
      ...config,
      signal: abortController.signal,
    };

    try {
      const response = await apiClient.put<T>(url, data, requestConfig);
      logApiResponse("PUT", url, url, response.status, response.data);
      removeAbortController(abortController);
      return response.data;
    } catch (error: any) {
      removeAbortController(abortController);
      // Don't log error if request was aborted
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        logApiError("PUT", url, url, error);
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  static async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logApiRequest("PATCH", url, data, config);

    const abortController = createAbortController();
    const requestConfig = {
      ...config,
      signal: abortController.signal,
    };

    try {
      const response = await apiClient.patch<T>(url, data, requestConfig);
      logApiResponse("PATCH", url, url, response.status, response.data);
      removeAbortController(abortController);
      return response.data;
    } catch (error: any) {
      removeAbortController(abortController);
      // Don't log error if request was aborted
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        logApiError("PATCH", url, url, error);
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logApiRequest("DELETE", url, undefined, config);

    const abortController = createAbortController();
    const requestConfig = {
      ...config,
      signal: abortController.signal,
    };

    try {
      const response = await apiClient.delete<T>(url, requestConfig);
      logApiResponse("DELETE", url, url, response.status, response.data);
      removeAbortController(abortController);
      return response.data;
    } catch (error: any) {
      removeAbortController(abortController);
      // Don't log error if request was aborted
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        logApiError("DELETE", url, url, error);
      }
      throw error;
    }
  }

  /**
   * Logout user (only clears tokens)
   * For complete logout with Redux reset, use performLogout from logoutService
   */
  static async logout(): Promise<void> {
    await handleLogout();
  }
}

// Export the axios instance for advanced usage if needed
export default apiClient;
