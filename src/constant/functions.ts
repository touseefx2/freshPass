import { Platform, I18nManager } from "react-native";
import * as Location from "expo-location";
import {
  Coordinates,
  GoogleGeocodeResponse,
  ResolveCurrentLocationArgs,
  ResolveCurrentLocationResult,
  GoogleGeocodeComponent,
  ParsedAddress,
} from "@/src/types/location";

export const getLangLabel = (code: string) => {
  switch (code) {
    case "ur":
      return "اردو";
    case "fr":
      return "Français";
    default:
      return "English";
  }
};

/**
 * Checks if the current layout direction is RTL
 * @param language - Current language code (optional, will check system if not provided)
 * @returns boolean - true if RTL, false if LTR
 */
export const isRTL = (language?: string): boolean => {
  // Check language first if provided
  if (language) {
    return language === "ur";
  }

  // For native platforms, check I18nManager
  if (Platform.OS !== "web") {
    return I18nManager.isRTL;
  }

  // For web, check document.dir attribute
  if (typeof document !== "undefined") {
    return document.documentElement.dir === "rtl";
  }

  return false;
};

/**
 * Sets up RTL (Right-to-Left) direction based on language
 * @param language - Language code (e.g., "ur" for Urdu)
 * @returns boolean - true if app reload is needed (for native platforms), false otherwise
 */
export const setupRTL = (language: string): boolean => {
  const needsRTL = language === "ur";

  // Handle RTL for native platforms
  if (Platform.OS !== "web") {
    const currentIsRTL = I18nManager.isRTL;

    // Only reload if RTL direction needs to change
    if (needsRTL !== currentIsRTL) {
      if (needsRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } else {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }
      return true; // Reload needed
    }
    return false; // No reload needed
  } else {
    // Handle RTL for web
    if (typeof document !== "undefined") {
      if (needsRTL) {
        document.documentElement.dir = "rtl";
        document.documentElement.setAttribute("lang", "ur");
      } else {
        document.documentElement.dir = "ltr";
        document.documentElement.setAttribute("lang", language);
      }
    }
    return false; // No reload needed for web
  }
};

export const buildAddressSummary = (
  street?: string,
  area?: string,
  postal?: string
) => {
  const parts = [street, area, postal].filter((value) => !!value?.trim());
  return parts.join(", ");
};

export const parseAddressComponents = (
  components: GoogleGeocodeComponent[] = []
): ParsedAddress => {
  let streetNumber = "";
  let route = "";
  let locality = "";
  let administrativeArea = "";
  let state = "";
  let postalCode = "";

  components.forEach((component) => {
    const types = component.types ?? [];
    if (types.includes("street_number")) {
      streetNumber = component.long_name ?? "";
    }
    if (types.includes("route")) {
      route = component.long_name ?? "";
    }
    if (
      types.includes("locality") ||
      types.includes("sublocality") ||
      types.includes("postal_town")
    ) {
      locality = component.long_name ?? locality;
    }
    // administrative_area_level_1 is typically the state/province
    if (types.includes("administrative_area_level_1")) {
      state = component.long_name ?? state;
    }
    if (
      types.includes("administrative_area_level_2") ||
      types.includes("administrative_area_level_1")
    ) {
      administrativeArea = component.long_name ?? administrativeArea;
    }
    // Check for postal_code - some countries use different types
    if (
      types.includes("postal_code") ||
      types.includes("postal_code_prefix") ||
      types.includes("postal_code_suffix")
    ) {
      // Try short_name first (often used for postal codes), fallback to long_name
      postalCode = component.short_name ?? component.long_name ?? postalCode;
    }
  });

  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    areaName: locality || administrativeArea,
    state: state,
    postal: postalCode,
  };
};


export const tryGetPosition = async (): Promise<Location.LocationObject> => {
  const attempts: Array<{ accuracy: Location.Accuracy; timeout: number }> = [
    { accuracy: Location.Accuracy.High, timeout: 10000 },
    { accuracy: Location.Accuracy.Balanced, timeout: 10000 },
    { accuracy: Location.Accuracy.Low, timeout: 8000 },
  ];

  for (const attempt of attempts) {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: attempt.accuracy,
        timeout: attempt.timeout,
        maximumAge: 0,
        mayAllowReducedAccuracy: true,
      });
      return position;
    } catch (error) {
      console.warn("getCurrentPosition retry failed", error);
    }
  }

  throw new Error("LOCATION_UNAVAILABLE");
};

export const resolveAddressViaGoogle = async (
  coordinates: Coordinates,
  apiKey: string
) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${apiKey}`
    );
    const payload = (await response.json()) as GoogleGeocodeResponse;
    if (payload.status !== "OK" || !payload.results?.length) {
      console.warn(
        "Google geocode did not return results",
        payload.status,
        payload.error_message
      );
      return null;
    }

    const primaryResult = payload.results[0];
    const parsedComponents = parseAddressComponents(
      primaryResult.address_components ?? []
    );

    // Extract country code from address components
    let countryCode: string | undefined;
    const components = primaryResult.address_components ?? [];
    for (const component of components) {
      if (component.types?.includes("country")) {
        countryCode = component.short_name ?? component.long_name;
        break;
      }
    }

    return {
      street: parsedComponents.street,
      area: parsedComponents.areaName,
      state: parsedComponents.state,
      postal: parsedComponents.postal,
      formatted: primaryResult.formatted_address,
      countryCode,
    };
  } catch (error) {
    console.warn("Google geocode request failed", error);
    return null;
  }
};

export const resolveCurrentLocation = async ({
  apiKey,
}: ResolveCurrentLocationArgs): Promise<ResolveCurrentLocationResult> => {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return {
      status: "error",
      message:
        "Location services are turned off. Please enable them and try again.",
    };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    return {
      status: "error",
      message: "Location permission is required to continue.",
    };
  }

  try {
    const cachedPosition = await Location.getLastKnownPositionAsync();
    const currentPosition = cachedPosition ?? (await tryGetPosition());

    const coordinates: Coordinates = {
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
    };

    let reverseAddress: Location.ReverseGeocodeAddress | undefined;
    let googleParsed: {
      street?: string;
      area?: string;
      state?: string;
      postal?: string;
      formatted?: string;
      countryCode?: string;
    } | null = null;
    let notice: string | null = null;

    try {
      const reverseResults = await Location.reverseGeocodeAsync(coordinates, {
        useGoogleMaps: true,
        timeout: 15000,
      });
      [reverseAddress] = reverseResults;
    } catch (reverseError) {
      console.warn("Reverse geocode failed", reverseError);
      const providerStatus = await Location.getProviderStatusAsync();
      console.warn("Provider status", providerStatus);
      notice =
        "We found your coordinates but couldn’t fetch the address. Please confirm the details below.";
    }

    if (!reverseAddress && apiKey) {
      googleParsed = await resolveAddressViaGoogle(coordinates, apiKey);
      if (!googleParsed) {
        notice =
          "We found your coordinates but couldn’t fetch the address. Please confirm the details below.";
      }
    }

    const derivedStreetFromReverse = [
      reverseAddress?.name,
      reverseAddress?.street,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const derivedAreaFromReverse =
      reverseAddress?.city ??
      reverseAddress?.subregion ??
      reverseAddress?.region ??
      "";
    const derivedPostalFromReverse = reverseAddress?.postalCode ?? "";

    const street = derivedStreetFromReverse || googleParsed?.street || "";
    const area = derivedAreaFromReverse || googleParsed?.area || "";
    const state = googleParsed?.state || reverseAddress?.region || "";
    const postal = derivedPostalFromReverse || googleParsed?.postal || "";
    const formattedAddress =
      googleParsed?.formatted ||
      (reverseAddress
        ? [derivedStreetFromReverse, derivedAreaFromReverse]
            .filter(Boolean)
            .join(", ")
        : undefined);
    
    // Get country code from Google geocode (reverse geocode doesn't provide country code in type)
    const countryCode = googleParsed?.countryCode;

    return {
      status: "success",
      details: {
        coordinates,
        street,
        area,
        state,
        postal,
        formattedAddress,
        notice,
        countryCode,
      },
    };
  } catch (error) {
    console.error("resolveCurrentLocation failure", error);
    const message =
      error instanceof Error ? error.message : "Location lookup failed";
    return {
      status: "error",
      message:
        message === "LOCATION_UNAVAILABLE" ||
        message.toLowerCase().includes("unavailable")
          ? "Current location is unavailable. Check that precise location is enabled or adjust your device settings."
          : "Unable to fetch your current location. Try again.",
    };
  }
};
