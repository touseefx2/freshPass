import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import Logger from "@/src/services/logger";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { tryGetPosition } from "@/src/constant/functions";
import { handleLocationPermission } from "@/src/services/locationPermissionService";
import { setLocation } from "@/src/state/slices/userSlice";
import { setCurrentLocation } from "@/src/state/slices/generalSlice";
import LocationEnableModal from "@/src/components/locationEnableModal";

// The enable popup shows at most once per app session across ALL screens —
// after one Skip we never nag again until the next launch.
let promptedThisSession = false;

// User cleared the location chip on purpose — don't silently refill it on focus /
// foreground for the rest of this session (picking a location still works).
let autoRefillOff = false;
export const stopAutoLocationRefill = () => {
  autoRefillOff = true;
};

// Session flags belong to one account — a logout + different login starts fresh
let sessionUserKey: string | null = null;
const resetSessionFlagsFor = (userKey: string) => {
  if (sessionUserKey === userKey) return;
  sessionUserKey = userKey;
  promptedThisSession = false;
  autoRefillOff = false;
};

type AppDispatch = ReturnType<typeof useAppDispatch>;

// One read at a time — focus, foreground and the popup can all ask at once
let inFlightFetch: Promise<void> | null = null;

/** Reads the phone position and saves it as the user's location. Silent on failure. */
export const fetchAndSaveCurrentLocation = (dispatch: AppDispatch) => {
  if (!inFlightFetch) {
    inFlightFetch = readAndSaveLocation(dispatch).finally(() => {
      inFlightFetch = null;
    });
  }
  return inFlightFetch;
};

const readAndSaveLocation = async (dispatch: AppDispatch) => {
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
    // Cleared while this read was in flight — don't put it back
    if (autoRefillOff) return;

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
  /** Screen name, for logs only ("home", "explore", …) */
  feature: string;
  /** Refresh the position on first open even when a location is already saved */
  refreshWhenSet?: boolean;
}

/**
 * Location is optional.
 * - Permission granted + GPS on → read the position silently (no popup).
 * - Otherwise, with no saved location → our "Enable Location" popup explains why
 *   first; the system permission dialog only opens after the user taps Enable.
 *   Shown once per app session across all screens.
 * - Re-checks silently when the screen regains focus or the app returns to the
 *   foreground, so turning GPS / permission on outside the app is picked up.
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

  const isCustomerRef = useRef(isCustomerOrGuest);
  isCustomerRef.current = isCustomerOrGuest;
  // Mode switch menu stays open (with a spinner) while switching — Android
  // drops a Modal opened on top of another closing one, so wait for it.
  const modeSwitchOpen = useAppSelector(
    (state) => state.general.modeSwitchModalVisible,
  );
  const modeSwitchOpenRef = useRef(modeSwitchOpen);
  modeSwitchOpenRef.current = modeSwitchOpen;
  const userKeyRef = useRef("");
  userKeyRef.current = user.isGuest ? "guest" : String(user.id ?? "");
  const hasLocationRef = useRef(hasLocation);
  hasLocationRef.current = hasLocation;
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const checkingRef = useRef(false);
  const firstCheckRef = useRef(true);

  const check = async () => {
    if (!isCustomerRef.current || checkingRef.current) return;
    if (modeSwitchOpenRef.current) return; // re-runs when the menu closes
    resetSessionFlagsFor(userKeyRef.current);
    // User cleared the location on purpose — no auto read or popup on ANY
    // screen (incl. freshly mounted ones) for the rest of this session.
    if (autoRefillOff) return;
    const isFirst = firstCheckRef.current;
    firstCheckRef.current = false;
    if (hasLocationRef.current && !(isFirst && refreshWhenSet)) return;

    checkingRef.current = true;
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      const { status } = await Location.getForegroundPermissionsAsync();
      if (servicesEnabled && status === Location.PermissionStatus.GRANTED) {
        await fetchAndSaveCurrentLocation(dispatch);
        return;
      }
      // GPS off, never asked, or denied — explain first, once per session
      if (!hasLocationRef.current && !promptedThisSession && isFocusedRef.current) {
        promptedThisSession = true;
        setShowModal(true);
      }
    } catch (error) {
      Logger.error(`Location check failed (${feature}):`, error);
    } finally {
      checkingRef.current = false;
    }
  };

  // First open, every time this screen comes back into focus, and once the
  // mode switch menu has closed
  useEffect(() => {
    if (isFocused && !modeSwitchOpen) void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, modeSwitchOpen]);

  // Back from phone Settings / another app
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isFocusedRef.current) void check();
    });
    return () => sub.remove();
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
      visible={showModal && isFocused && !modeSwitchOpen}
      onClose={handleClose}
    />
  );
}
