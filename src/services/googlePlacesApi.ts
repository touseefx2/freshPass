import { PlacePrediction, ParsedAddress } from "@/src/types/location";
import { parseAddressComponents } from "../constant/functions";
 
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TIMEOUT_MS = 12000; // 12 seconds

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
  const fullUrl = `${searchUrl}${encodedQuery}&key=${apiKey}&sessiontoken=${sessionToken}`;

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
      throw new Error(payload.status);
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

