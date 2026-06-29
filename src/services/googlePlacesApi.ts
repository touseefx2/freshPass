import { PlacePrediction, ParsedAddress } from "@/src/types/location";
import { parseAddressComponents } from "../constant/functions";
import Logger from "@/src/services/logger";

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TIMEOUT_MS = 12000; // 12 seconds
const PLACES_COUNTRY_RESTRICTION = "us";
const NON_US_ADDRESS_ERROR =
  "Only United States addresses are supported.";

const DEFAULT_SUGGESTION_ERROR =
  "Unable to load suggestions. Please try again.";
const DEFAULT_PLACE_DETAILS_ERROR =
  "Unable to fetch place details. Please try again.";

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
    return "Address search limit reached. Please try again later.";
  }

  if (status === "REQUEST_DENIED") {
    if (errorMessage?.toLowerCase().includes("billing")) {
      return "Address search is unavailable. Google Maps billing may need to be enabled.";
    }
    return "Address search access was denied. Please contact support.";
  }

  if (status === "INVALID_REQUEST") {
    return "Invalid search request. Please try again.";
  }

  if (errorMessage) {
    return errorMessage;
  }

  return DEFAULT_SUGGESTION_ERROR;
};

export const resolveSuggestionError = (
  error: unknown,
  fallback = DEFAULT_SUGGESTION_ERROR,
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
    return "Request timed out. Please try again.";
  }

  if (error.message.includes("HTTP error")) {
    return "Network error while loading suggestions. Please try again.";
  }

  return error.message || fallback;
};

export const resolvePlaceDetailsError = (
  error: unknown,
  fallback = DEFAULT_PLACE_DETAILS_ERROR,
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
    return "Request timed out. Please try again.";
  }

  if (error.message.includes("HTTP error")) {
    return "Network error while loading place details. Please try again.";
  }

  if (error.message === "REQUEST_DENIED") {
    return "Place details access was denied. Please contact support.";
  }

  if (error.message === "OVER_QUERY_LIMIT") {
    return "Place details limit reached. Please try again later.";
  }

  if (error.message === NON_US_ADDRESS_ERROR) {
    return NON_US_ADDRESS_ERROR;
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

