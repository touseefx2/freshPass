import { PlacePrediction, ParsedAddress } from "@/src/types/location";
import { parseAddressComponents } from "../constant/functions";
import Logger from "@/src/services/logger";
import i18n from "i18next";

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TIMEOUT_MS = 12000; // 12 seconds
const PLACES_COUNTRY_RESTRICTION = "us";
const NON_US_ADDRESS_ERROR =
  "Only United States addresses are supported.";

// i18n keys, translated when used
const DEFAULT_SUGGESTION_ERROR_KEY = "unableToLoadSuggestions";
const DEFAULT_PLACE_DETAILS_ERROR_KEY = "unableToFetchPlaceDetails";

export const logPlacesApiFailure = (
  context: string,
  status: string,
  errorMessage?: string,
): void => {
  Logger.error(`[Google Places] ${context}`, {
    status,
    errorMessage: errorMessage ?? "No details from Google",
  });
};

export const getSuggestionErrorMessage = (
  status: string,
  errorMessage?: string,
): string => {
  if (status === "OVER_QUERY_LIMIT") {
    return i18n.t("placesSvcSearchLimit");
  }

  if (status === "REQUEST_DENIED") {
    if (errorMessage?.toLowerCase().includes("billing")) {
      return i18n.t("placesSvcBillingUnavailable");
    }
    return i18n.t("placesSvcSearchDenied");
  }

  if (status === "INVALID_REQUEST") {
    return i18n.t("placesSvcInvalidRequest");
  }

  if (errorMessage) {
    return errorMessage;
  }

  return i18n.t(DEFAULT_SUGGESTION_ERROR_KEY);
};

export const resolveSuggestionError = (
  error: unknown,
  fallback: string = i18n.t(DEFAULT_SUGGESTION_ERROR_KEY),
): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Google Places API key is missing") {
    return "Google Maps API key is not configured.";
  }

  if (error.message === "Google Search URL is not configured") {
    return "Address search URL is not configured.";
  }

  if (error.message.includes("timeout") || error.message.includes("timed out")) {
    return i18n.t("placesSvcTimedOut");
  }

  if (error.message.includes("HTTP error")) {
    return i18n.t("placesSvcSuggestionsNetwork");
  }

  return error.message || fallback;
};

export const resolvePlaceDetailsError = (
  error: unknown,
  fallback: string = i18n.t(DEFAULT_PLACE_DETAILS_ERROR_KEY),
): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Google Places API key is missing") {
    return "Google Maps API key is not configured.";
  }

  if (error.message === "Google Fetch Place URL is not configured") {
    return "Place details URL is not configured.";
  }

  if (error.message.includes("timeout") || error.message.includes("timed out")) {
    return i18n.t("placesSvcTimedOut");
  }

  if (error.message.includes("HTTP error")) {
    return i18n.t("placesSvcDetailsNetwork");
  }

  if (error.message === "REQUEST_DENIED") {
    return i18n.t("placesSvcDetailsDenied");
  }

  if (error.message === "OVER_QUERY_LIMIT") {
    return i18n.t("placesSvcDetailsLimit");
  }

  if (error.message === NON_US_ADDRESS_ERROR) {
    return i18n.t("placesSvcUsOnly");
  }

  return error.message || fallback;
};

export interface PlaceDetails {
  formattedAddress: string;
  street: string;
  area: string;
  state: string;
  postal: string;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
}

export interface FetchSuggestionsResponse {
  predictions: PlacePrediction[];
  status: "OK" | "ZERO_RESULTS" | "REQUEST_DENIED" | "OVER_QUERY_LIMIT" | string;
  errorMessage?: string;
}

/**
 * Fetch place suggestions from Google Places Autocomplete API
 */
export const fetchSuggestions = async (
  query: string,
  sessionToken: string
): Promise<FetchSuggestionsResponse> => {
  if (!query.trim()) {
    return {
      predictions: [],
      status: "OK",
    };
  }

  if (!apiKey) {
    throw new Error("Google Places API key is missing");
  }

  const searchUrl = process.env.EXPO_PUBLIC_GOOGLE_SEARCH_URL;
  if (!searchUrl) {
    throw new Error("Google Search URL is not configured");
  }

  const encodedQuery = encodeURIComponent(query);
  const fullUrl = `${searchUrl}${encodedQuery}&components=country:${PLACES_COUNTRY_RESTRICTION}&key=${apiKey}&sessiontoken=${sessionToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

    try {
      const response = await fetch(fullUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const payload = await response.json();

    return {
      predictions: payload.predictions ?? [],
      status: payload.status,
      errorMessage: payload.error_message,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      throw new Error("Request timeout. Please try again.");
    }
    
    throw error;
  }
};

/**
 * Fetch place details from Google Places Details API
 */
export const fetchPlaceDetails = async (
  placeId: string,
  sessionToken: string
): Promise<PlaceDetails> => {
  if (!apiKey) {
    throw new Error("Google Places API key is missing");
  }

  const fetchUrl = process.env.EXPO_PUBLIC_GOOGLE_FETCH_PLACE_URL;
  if (!fetchUrl) {
    throw new Error("Google Fetch Place URL is not configured");
  }

  const fullUrl = `${fetchUrl}${placeId}&key=${apiKey}&sessiontoken=${sessionToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(fullUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const payload = await response.json();
    
    if (payload.status !== "OK") {
      throw new Error(payload.error_message ?? payload.status);
    }

    const result = payload.result;
    const formattedAddress: string = result.formatted_address ?? "";
    const components: Array<Record<string, any>> = result.address_components ?? [];
    const geometry = result.geometry?.location;

    const parsed: ParsedAddress = parseAddressComponents(components);

    // Extract country code from address components
    let countryCode: string | undefined;
    for (const component of components) {
      if (component.types?.includes("country")) {
        countryCode = component.short_name ?? component.long_name;
        break;
      }
    }

    if (countryCode && countryCode.toUpperCase() !== "US") {
      throw new Error(NON_US_ADDRESS_ERROR);
    }

    return {
      formattedAddress,
      street: parsed.street || formattedAddress,
      area: parsed.areaName,
      state: parsed.state ?? "",
      postal: parsed.postal ?? "",
      latitude: geometry?.lat,
      longitude: geometry?.lng,
      countryCode,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      throw new Error("Request timeout. Please try again.");
    }
    
    throw error;
  }
};

