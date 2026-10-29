import React, { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import Logger from "@/src/services/logger";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { tryGetPosition } from "@/src/constant/functions";
import { handleLocationPermission } from "@/src/services/locationPermissionService";
import { setLocation } from "@/src/state/slices/userSlice";
import { setCurrentLocation } from "@/src/state/slices/generalSlice";
import LocationEnableModal from "@/src/components/locationEnableModal";

// Features that already showed the enable popup this app session (no nagging)
const promptedThisSession = new Set<string>();

type AppDispatch = ReturnType<typeof useAppDispatch>;

/** Reads the phone position and saves it as the user's location. Silent on failure. */
export const fetchAndSaveCurrentLocation = async (dispatch: AppDispatch) => {
  try {
    let currentPosition: Location.LocationObject | null = null;
    try {
      const cachedPosition = await Location.getLastKnownPositionAsync({
        maxAge: 60000,
      });
      currentPosition = cachedPosition ?? (await tryGetPosition());
    } catch {}
    if (!currentPosition) return;

    const coordinates = {
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
    };
    let locationName: string | null = null;
    let countryName: string | null = null;
    let cityName: string | null = null;
    let countryCode: string | null = null;
    let zipCode: string | null = null;
    try {
      const reverseResults = await Location.reverseGeocodeAsync(coordinates, {
        useGoogleMaps: true,
        timeout: 10000,
      });
      if (reverseResults && reverseResults.length > 0) {
        const address = reverseResults[0];
        countryName = (address as { country?: string }).country ?? null;
        cityName = address.city ?? null;
        countryCode =
          (address as { isoCountryCode?: string }).isoCountryCode ?? null;
        zipCode = address.postalCode ?? null;
        const addressParts = [
          address.street,
          address.city,
          address.region,
        ].filter(Boolean);
        locationName =
          addressParts.length > 0 ? addressParts.join(", ") : null;
      }
    } catch {}
    if (!locationName) return;

    const locationPayload = {
      lat: coordinates.latitude,
      long: coordinates.longitude,
      locationName,
      countryName,
      cityName,
      countryCode,
      zipCode,
    };
    dispatch(setLocation(locationPayload));
    dispatch(setCurrentLocation(locationPayload));
  } catch (error) {
    Logger.error("Error getting current location:", error);
  }
};

interface AskLocationOnceProps {
  /** Key for the once-per-session rule, e.g. "explore", "availableNow" */
  feature: string;
  /** Refresh the position even when a location is already saved */
  refreshWhenSet?: boolean;
}

/**
 * Location is optional. On mount: if permission is (or can be) granted, read the
 * position silently. If services are off or permission was denied and no location
 * is saved, show the enable popup once per app session for this feature.
 */
export default function AskLocationOnce({
  feature,
  refreshWhenSet = false,
}: AskLocationOnceProps) {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const user = useAppSelector((state) => state.user);
  const hasLocation = user.location?.lat != null && user.location?.long != null;
  const isCustomerOrGuest = user.isGuest || user.userRole === "customer";
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isCustomerOrGuest) return;
    if (hasLocation && !refreshWhenSet) return;

    let cancelled = false;
    const promptOnce = () => {
      if (cancelled || hasLocation || promptedThisSession.has(feature)) return;
      promptedThisSession.add(feature);
      setShowModal(true);
    };

    const run = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          promptOnce();
          return;
        }
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === Location.PermissionStatus.UNDETERMINED) {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (cancelled) return;
        if (status === Location.PermissionStatus.GRANTED) {
          await fetchAndSaveCurrentLocation(dispatch);
        } else {
          promptOnce();
        }
      } catch (error) {
        Logger.error("Location check failed:", error);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
    // Run once per mount; later location changes come from the popup or picker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = (shouldGetLocation?: boolean) => {
    setShowModal(false);
    if (!shouldGetLocation) return;
    // Let the popup finish closing first — iOS drops an Alert shown mid-dismiss
    setTimeout(async () => {
      try {
        const result = await handleLocationPermission();
        if (result.granted) {
          await fetchAndSaveCurrentLocation(dispatch);
        }
      } catch (error) {
        Logger.error("Enable location from popup failed:", error);
      }
    }, 400);
  };

  return (
    <LocationEnableModal
      visible={showModal && isFocused}
      onClose={handleClose}
    />
  );
}
