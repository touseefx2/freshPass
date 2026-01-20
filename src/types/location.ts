/**
 * Location and Address related types
 */

// Coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Google Places API types
export interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

// Google Geocode API types
export type GoogleGeocodeComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

export type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: GoogleGeocodeComponent[];
};

export type GoogleGeocodeResponse = {
  status?: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

// Parsed Address types
export interface ParsedAddress {
  street: string;
  areaName: string;
  state: string;
  postal: string;
}

// Resolved Location types
export interface ResolvedLocationDetails {
  coordinates: Coordinates;
  street?: string;
  area?: string;
  state?: string;
  postal?: string;
  formattedAddress?: string;
  notice?: string | null;
  countryCode?: string;
}

export interface ResolveCurrentLocationArgs {
  apiKey: string;
}

export interface ResolveCurrentLocationSuccess {
  status: "success";
  details: ResolvedLocationDetails;
}

export interface ResolveCurrentLocationError {
  status: "error";
  message: string;
}

export type ResolveCurrentLocationResult =
  | ResolveCurrentLocationSuccess
  | ResolveCurrentLocationError;

