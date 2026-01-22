import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import Logger from "@/src/services/logger";
import { Region } from "react-native-maps";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setAddressSearch,
  setAddressStage,
  setArea,
  setSelectedAddress,
  setSelectedLocation,
  setState,
  setStreetAddress,
  setUseCurrentLocation,
  setZipCode,
} from "@/src/state/slices/completeProfileSlice";
import StepFourSearchSection from "./StepFourSearchSection";
import StepFourConfirmSection from "./StepFourConfirmSection";
import StepFourMapSection from "./StepFourMapSection";
import { PlacePrediction } from "@/src/types/location";
import {
  fetchSuggestions as fetchSuggestionsApi,
  fetchPlaceDetails as fetchPlaceDetailsApi,
} from "@/src/services/googlePlacesApi";
import {
  handleLocationPermission,
  openLocationSettings,
} from "@/src/services/locationPermissionService";
import { resolveCurrentLocation } from "@/src/constant/functions";

const generateSessionToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // paddingHorizontal: moderateWidthScale(20),
      // paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(8),
      gap: moderateHeightScale(20),
    },
    titleSec: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    firstName: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function StepFour() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const {
    addressSearch,
    selectedAddress,
    streetAddress,
    area,
    state,
    zipCode,
    fullName,
    addressStage,
    selectedLocation,
  } = useAppSelector((state) => state.completeProfile);

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  const sessionTokenRef = useRef<string>(generateSessionToken());
  const isZoomingRef = useRef<boolean>(false);
  const originalLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const isSearchStage = addressStage === "search";
  const isConfirmStage = addressStage === "confirm";
  const isMapStage = addressStage === "map";

  const firstName = useMemo(() => {
    if (!fullName.trim()) {
      return "";
    }
    const [primary] = fullName.trim().split(" ");
    return primary ?? fullName.trim();
  }, [fullName]);

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
  }, []);

  const resetToSearch = useCallback(() => {
    // Clear original location ref when going back to search stage
    originalLocationRef.current = null;
    dispatch(setAddressStage("search"));
    dispatch(
      setAddressSearch(streetAddress || selectedAddress || addressSearch)
    );
    dispatch(setUseCurrentLocation(false));
    dispatch(setSelectedLocation(null));
    setMapRegion(null);
    setLocationMessage(null);
    setLocationNotice(null);
  }, [addressSearch, dispatch, selectedAddress, streetAddress]);

  const handleFetchPlaceDetails = useCallback(
    async (placeId: string, description: string) => {
      if (!apiKey) {
        dispatch(setSelectedAddress(description));
        dispatch(setStreetAddress(description));
        dispatch(setAddressStage("confirm"));
        return;
      }

      try {
        setIsFetchingDetails(true);
        ensureSessionToken();

        const details = await fetchPlaceDetailsApi(
          placeId,
          sessionTokenRef.current
        );

        dispatch(setSelectedAddress(details.formattedAddress));
        dispatch(setStreetAddress(details.street));
        dispatch(setArea(details.area));
        dispatch(setState(details.state ?? ""));
        dispatch(setZipCode(details.postal));
        dispatch(setAddressStage("confirm"));
        dispatch(setUseCurrentLocation(false));
        setLocationMessage(null);
        setLocationNotice(null);

        if (details.latitude && details.longitude) {
          // Reset original location ref when new address is selected
          originalLocationRef.current = null;
          dispatch(
            setSelectedLocation({
              latitude: details.latitude,
              longitude: details.longitude,
            })
          );
          setMapRegion({
            latitude: details.latitude,
            longitude: details.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } else {
          dispatch(setSelectedLocation(null));
          setMapRegion(null);
        }
      } catch (error) {
        setSuggestionError("Unable to fetch place details. Try again.");
      } finally {
        setIsFetchingDetails(false);
        sessionTokenRef.current = generateSessionToken();
      }
    },
    [apiKey, dispatch, ensureSessionToken]
  );

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPredictions([]);
        setSuggestionError(null);
        return;
      }

      if (!apiKey) {
        setPredictions([]);
        setSuggestionError("Unable to load suggestions. Please try again.");
        return;
      }

      try {
        setIsLoadingSuggestions(true);
        setSuggestionError(null);
        ensureSessionToken();

        const response = await fetchSuggestionsApi(
          query,
          sessionTokenRef.current
        );

        if (response.status === "OK" || response.status === "ZERO_RESULTS") {
          setPredictions(response.predictions);
          if (response.status === "ZERO_RESULTS") {
            setSuggestionError(null);
          }
        } else {
          setSuggestionError("Unable to load suggestions. Please try again.");
          setPredictions([]);
        }
      } catch (error: any) {
        Logger.error("Error fetching suggestions:", error);
        setSuggestionError("Unable to load suggestions. Please try again.");
        setPredictions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [apiKey, ensureSessionToken]
  );

  useEffect(() => {
    if (!isSearchStage) {
      return;
    }

    const handler = setTimeout(() => {
      fetchSuggestions(addressSearch);
    }, 300);

    return () => clearTimeout(handler);
  }, [addressSearch, fetchSuggestions, isSearchStage]);

  // Clear original location ref when going from confirm to search stage
  useEffect(() => {
    if (isSearchStage) {
      originalLocationRef.current = null;
    }
  }, [isSearchStage]);

  // Store original location when entering map stage from confirm stage
  useEffect(() => {
    if (isMapStage && selectedLocation && !originalLocationRef.current) {
      // Store the original location when first entering map stage
      originalLocationRef.current = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };
    }
    // Restore original location when re-entering map stage after going back
    if (isMapStage && !selectedLocation && originalLocationRef.current) {
      dispatch(
        setSelectedLocation({
          latitude: originalLocationRef.current.latitude,
          longitude: originalLocationRef.current.longitude,
        })
      );
    }
  }, [isMapStage, selectedLocation, dispatch]);

  useEffect(() => {
    if (isMapStage && selectedLocation) {
      setMapRegion((current: Region | null) => {
        if (current) {
          return {
            ...current,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          };
        }
        return {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
      });
    }
    if (isMapStage && !selectedLocation) {
      setMapRegion(null);
    }
    // Clear mapRegion when leaving map stage
    if (!isMapStage) {
      setMapRegion(null);
    }
  }, [isMapStage, selectedLocation]);

  const handleSearchChange = useCallback(
    (value: string) => {
      dispatch(setAddressSearch(value));
      setLocationMessage(null);
      if (!value.trim()) {
        dispatch(setSelectedAddress(null));
        dispatch(setUseCurrentLocation(false));
        dispatch(setSelectedLocation(null));
      }
    },
    [dispatch]
  );

  const handleSuggestionPress = useCallback(
    (prediction: PlacePrediction) => {
      dispatch(setAddressSearch(prediction.description));
      handleFetchPlaceDetails(prediction.place_id, prediction.description);
    },
    [dispatch, handleFetchPlaceDetails]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationMessage(null);
    setLocationNotice(null);

    // Step 1: Check and request location permission first
    const permissionResult = await handleLocationPermission();

    if (!permissionResult.granted) {
      // Permission denied or location services OFF
      // Display error message as red text (no alert)
      if (permissionResult.errorMessage) {
        setLocationMessage(permissionResult.errorMessage);
        // If settings should be opened, open them automatically
        if (permissionResult.shouldOpenSettings) {
          await openLocationSettings();
        }
      }
      return;
    }

    // Step 2: Permission granted, now resolve location
    setIsResolvingLocation(true);

    const result = await resolveCurrentLocation({
      apiKey,
    });

    setIsResolvingLocation(false);

    if (result.status === "error") {
      setLocationMessage(result.message);
      return;
    }

    const { details } = result;

    const selectedLabel =
      details.formattedAddress ??
      details.street ??
      selectedAddress ??
      "Using current location";

    // Reset original location ref when new address is selected via current location
    originalLocationRef.current = null;
    dispatch(setUseCurrentLocation(true));
    dispatch(setSelectedLocation(details.coordinates));
    dispatch(setAddressSearch(""));
    dispatch(setSelectedAddress(selectedLabel));
    dispatch(setStreetAddress(details.street ?? ""));
    dispatch(setArea(details.area ?? ""));
    dispatch(setState(details.state ?? ""));
    dispatch(setZipCode(details.postal ?? ""));
    dispatch(setAddressStage("confirm"));
    setMapRegion({
      latitude: details.coordinates.latitude,
      longitude: details.coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    setLocationNotice(details.notice ?? null);
  }, [apiKey, area, dispatch, selectedAddress, streetAddress, zipCode]);

  const handleStreetAddressChange = useCallback(
    (value: string) => {
      dispatch(setStreetAddress(value));
      dispatch(setUseCurrentLocation(false));
    },
    [dispatch]
  );

  const handleAreaChange = useCallback(
    (value: string) => {
      dispatch(setArea(value));
    },
    [dispatch]
  );

  const handleStateChange = useCallback(
    (value: string) => {
      dispatch(setState(value));
    },
    [dispatch]
  );

  const handleZipChange = useCallback(
    (value: string) => {
      dispatch(setZipCode(value));
    },
    [dispatch]
  );

  const handleZoom = useCallback((direction: "in" | "out") => {
    // Mark that we're programmatically zooming (not user drag)
    isZoomingRef.current = true;
    setMapRegion((current: Region | null) => {
      if (!current) {
        return current;
      }
      const factor = direction === "in" ? 0.7 : 1.3;
      const latitudeDelta = Math.max(current.latitudeDelta * factor, 0.0005);
      const longitudeDelta = Math.max(current.longitudeDelta * factor, 0.0005);
      const newRegion = {
        ...current,
        latitudeDelta,
        longitudeDelta,
      };
      // Reset zoom flag after a short delay to allow region change to complete
      setTimeout(() => {
        isZoomingRef.current = false;
      }, 400);
      return newRegion;
    });
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      // Only update location if user dragged the map, not if it was a programmatic zoom
      // Don't update mapRegion here to avoid continuous movement
      // Just update the selected location to match the center of the dragged map
      if (!isZoomingRef.current) {
        dispatch(
          setSelectedLocation({
            latitude: region.latitude,
            longitude: region.longitude,
          })
        );
      }
    },
    [dispatch]
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        {isMapStage ? (
          <Text style={styles.title}>
            Is the pin placed correctly,{" "}
            <Text style={styles.firstName}>{firstName}?</Text>
          </Text>
        ) : (
          <Text style={styles.title}>
            {isConfirmStage
              ? "Confirm your business address"
              : "Enter your business address"}
          </Text>
        )}
        <Text style={styles.subtitle}>
          {isConfirmStage || isMapStage
            ? "Let us know the location you'll be operating from so the customers can find and book you easily."
            : "This helps clients find and visit you."}
        </Text>
      </View>

      {isSearchStage && (
        <StepFourSearchSection
          addressSearch={addressSearch}
          onChangeSearch={handleSearchChange}
          predictions={predictions}
          isLoadingSuggestions={isLoadingSuggestions}
          suggestionError={suggestionError}
          onSelectSuggestion={handleSuggestionPress}
          onUseCurrentLocation={handleUseCurrentLocation}
          isResolvingLocation={isResolvingLocation}
          locationMessage={locationMessage}
        />
      )}

      {isConfirmStage && (
        <StepFourConfirmSection
          streetAddress={streetAddress}
          area={area}
          state={state}
          zipCode={zipCode}
          onChangeStreet={handleStreetAddressChange}
          onChangeArea={handleAreaChange}
          onChangeState={handleStateChange}
          onChangeZip={handleZipChange}
          onEditAddress={resetToSearch}
          isFetchingDetails={isFetchingDetails}
          notice={locationNotice}
        />
      )}

      {isMapStage && (
        <StepFourMapSection
          mapRegion={mapRegion}
          streetAddress={streetAddress}
          selectedAddress={selectedAddress}
          area={area}
          zipCode={zipCode}
          selectedLocation={selectedLocation}
          onZoom={handleZoom}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
      )}
    </View>
  );
}
