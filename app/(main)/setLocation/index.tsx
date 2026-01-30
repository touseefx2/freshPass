import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Circle, Region } from "react-native-maps";
import Logger from "@/src/services/logger";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import * as Location from "expo-location";
import {
  handleLocationPermission,
  openLocationSettings,
} from "@/src/services/locationPermissionService";
import {
  resolveCurrentLocation,
  resolveAddressViaGoogle,
  tryGetPosition,
} from "@/src/constant/functions";
import { setLocation } from "@/src/state/slices/userSlice";
import { IMAGES } from "@/src/constant/images";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { PlacePrediction } from "@/src/types/location";
import {
  fetchSuggestions as fetchSuggestionsApi,
  fetchPlaceDetails as fetchPlaceDetailsApi,
} from "@/src/services/googlePlacesApi";
import { useRouter } from "expo-router";
import { StatusBar } from "react-native";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import LocationEnableModal from "@/src/components/locationEnableModal";

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const generateSessionToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    headerTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
      textAlign: "center",
    },
    headerSubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    closeButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    content: {
      flex: 1,
    },
    mapContainer: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: theme.white,
      position: "relative",
    },
    mapView: {
      width: "100%",
      height: "100%",
    },
    centerPinContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
      pointerEvents: "none",
    },
    centerPin: {
      width: moderateWidthScale(22),
      height: moderateHeightScale(32),
    },
    currentLocControls: {
      position: "absolute",
      right: moderateWidthScale(16),
      top: moderateHeightScale(16),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(5),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.7,
    },
    mapControls: {
      position: "absolute",
      right: moderateWidthScale(16),
      bottom: moderateHeightScale(16),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(5),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      width: moderateWidthScale(42),
      opacity: 0.7,
    },
    mapControlButton: {
      width: "100%",
      height: moderateWidthScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    mapControlDivider: {
      width: "100%",
      height: 1,
      backgroundColor: theme.darkGreen,
    },
    locationInfoContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(14),
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.lightGreen2,
      height: moderateHeightScale(80),
      justifyContent: "center",
    },
    locationInfoTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(3),
      lineHeight: moderateHeightScale(20),
    },
    locationInfoSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(16),
    },
    confirmButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen2,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(8),
    },
    searchContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      position: "relative",
    },
    suggestionsContainer: {
      position: "absolute",
      top: moderateHeightScale(60),
      left: moderateWidthScale(20),
      right: moderateWidthScale(20),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      overflow: "hidden",
      zIndex: 1000,
      maxHeight: moderateHeightScale(300),
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    suggestionItem: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
      flexDirection: "row",
      gap: moderateWidthScale(12),
      alignItems: "center",
    },
    suggestionText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    infoText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function SetLocationScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const { showBanner } = useNotificationContext();

  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [tempLocation, setTempLocation] = useState<{
    lat: number;
    long: number;
    locationName: string | null;
    countryName: string | null;
    cityName: string | null;
    countryCode: string | null;
    zipCode: string | null;
  } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isFetchingPlaceDetails, setIsFetchingPlaceDetails] = useState(false);
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Initialize map with user's current location from Redux
  useEffect(() => {
    if (user.location?.lat && user.location?.long) {
      const lat = user.location.lat;
      const lng = user.location.long;
      const initialRegion: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(initialRegion);
      currentRegionRef.current = initialRegion;
      setTempLocation({
        lat,
        long: lng,
        locationName: user.location.locationName,
        countryName: user.location.countryName ?? null,
        cityName: user.location.cityName ?? null,
        countryCode: user.location.countryCode ?? null,
        zipCode: user.location.zipCode ?? null,
      });
    } else {
      // Default to a US location if no location set
      const defaultRegion: Region = {
        latitude: 25.7617,
        longitude: -80.1918,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
      setMapRegion(defaultRegion);
      currentRegionRef.current = defaultRegion;
    }
    // Reset search when screen mounts
    setAddressSearch("");
    setPredictions([]);
    sessionTokenRef.current = generateSessionToken();
  }, [user.location]);

  const fetchAddressFromCoordinates = useCallback(
    async (latitude: number, longitude: number) => {
      setIsFetchingAddress(true);
      try {
        const addressData = await resolveAddressViaGoogle(
          { latitude, longitude },
          apiKey,
        );

        if (addressData && addressData.formatted) {
          const locationName =
            addressData.formatted ||
            `${addressData.street || ""}, ${addressData.area || ""}, ${
              addressData.state || ""
            }`.trim() ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setTempLocation({
            lat: latitude,
            long: longitude,
            locationName,
            countryName: null,
            cityName: null,
            countryCode: addressData.countryCode ?? null,
            zipCode: addressData.postal ?? null,
          });
        } else {
          setTempLocation({
            lat: latitude,
            long: longitude,
            locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            countryName: null,
            cityName: null,
            countryCode: null,
            zipCode: null,
          });
        }
      } catch (error) {
        Logger.error("Error fetching address:", error);
        setTempLocation({
          lat: latitude,
          long: longitude,
          locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          countryName: null,
          cityName: null,
          countryCode: null,
          zipCode: null,
        });
      } finally {
        setIsFetchingAddress(false);
      }
    },
    [],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      currentRegionRef.current = region;
      fetchAddressFromCoordinates(region.latitude, region.longitude);
    },
    [fetchAddressFromCoordinates],
  );

  const handleZoom = useCallback((direction: "in" | "out") => {
    if (!currentRegionRef.current || !mapRef.current) return;

    const factor = direction === "in" ? 0.7 : 1.3;
    const latitudeDelta = Math.max(
      currentRegionRef.current.latitudeDelta * factor,
      0.0005,
    );
    const longitudeDelta = Math.max(
      currentRegionRef.current.longitudeDelta * factor,
      0.0005,
    );

    const newRegion: Region = {
      ...currentRegionRef.current,
      latitudeDelta,
      longitudeDelta,
    };

    currentRegionRef.current = newRegion;
    setMapRegion(newRegion);
    if (mapRef.current && "animateToRegion" in mapRef.current) {
      (mapRef.current as any).animateToRegion(newRegion, 300);
    }
  }, []);

  const handleUseCurrentLocation = async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      setShowLocationModal(true);
    } else {
      getCurrentLocation();
    }
  };

  const handleCloseModal = async (shouldGetLocation?: boolean) => {
    setShowLocationModal(false);
    if (shouldGetLocation) {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Check location permission
      const permissionResult = await handleLocationPermission();

      if (!permissionResult.granted) {
        return;
      }

      // Get current location
      setLocationLoading(true);
      let currentPosition: Location.LocationObject | null = null;
      try {
        // Try to get cached position first (faster)
        const cachedPosition = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // Use cached position if less than 1 minute old
        });

        if (cachedPosition) {
          currentPosition = cachedPosition;
        } else {
          // If no cached position, try to get current position with retries
          currentPosition = await tryGetPosition();
        }
      } catch (error) {
        setLocationLoading(false);
        Logger.error("Error getting location position:", error);
      }

      if (!currentPosition) {
        setLocationLoading(false);
        Logger.error("Unable to get current position");
        showBanner(
          t("locationError"),
          t("unableToGetCurrentPosition"),
          "error",
        );
        return;
      }

      const coordinates = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      // Get address via reverse geocoding
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
      } catch (error) {
        setLocationLoading(false);
        Logger.error("Reverse geocode failed:", error);
      }

      if (!locationName) {
        setLocationLoading(false);
        Logger.error("Unable to get current position");
        showBanner(
          t("locationError"),
          t("unableToGetCurrentPosition"),
          "error",
        );
        return;
      }

      setLocationLoading(false);
      const newRegion: Region = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      // Batch updates to prevent screen blink
      currentRegionRef.current = newRegion;
      setMapRegion(newRegion);
      setTempLocation({
        lat: coordinates.latitude,
        long: coordinates.longitude,
        locationName,
        countryName,
        cityName,
        countryCode,
        zipCode,
      });

      // Animate map after state updates
      requestAnimationFrame(() => {
        if (mapRef.current && "animateToRegion" in mapRef.current) {
          (mapRef.current as any).animateToRegion(newRegion, 300);
        }
      });
    } catch (error) {
      setLocationLoading(false);
      Logger.error("Error getting location:", error);
      showBanner(t("locationError"), t("unableToGetCurrentLocation"), "error");
    }
  };

  const handleConfirm = useCallback(() => {
    if (tempLocation) {
      dispatch(
        setLocation({
          lat: tempLocation.lat,
          long: tempLocation.long,
          locationName: tempLocation.locationName,
          countryName: tempLocation.countryName ?? null,
          cityName: tempLocation.cityName ?? null,
          countryCode: tempLocation.countryCode ?? null,
          zipCode: tempLocation.zipCode ?? null,
        }),
      );

      showBanner(t("success"), t("locationUpdatedSuccess"), "success");
      router.back();
    }
  }, [tempLocation, dispatch, router, showBanner]);

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
  }, []);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPredictions([]);
        return;
      }

      if (!apiKey) {
        setPredictions([]);
        showBanner(t("searchError"), t("unableToLoadSuggestions"), "error");
        return;
      }

      try {
        setIsLoadingSuggestions(true);
        ensureSessionToken();

        const response = await fetchSuggestionsApi(
          query,
          sessionTokenRef.current,
        );

        if (response.status === "OK" || response.status === "ZERO_RESULTS") {
          setPredictions(response.predictions);
        } else {
          showBanner(t("searchError"), t("unableToLoadSuggestions"), "error");
          setPredictions([]);
        }
      } catch (error: any) {
        Logger.error("Error fetching suggestions:", error);
        showBanner(t("searchError"), t("unableToLoadSuggestions"), "error");
        setPredictions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [apiKey, ensureSessionToken, showBanner],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(addressSearch);
    }, 300);

    return () => clearTimeout(handler);
  }, [addressSearch, fetchSuggestions]);

  const handleFetchPlaceDetails = useCallback(
    async (placeId: string, description: string) => {
      if (!apiKey) {
        return;
      }

      try {
        setIsFetchingPlaceDetails(true);
        ensureSessionToken();

        const details = await fetchPlaceDetailsApi(
          placeId,
          sessionTokenRef.current,
        );

        if (details.latitude && details.longitude) {
          const newRegion: Region = {
            latitude: details.latitude,
            longitude: details.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          currentRegionRef.current = newRegion;
          setMapRegion(newRegion);
          setTempLocation({
            lat: details.latitude,
            long: details.longitude,
            locationName: details.formattedAddress || description,
            countryName: null,
            cityName: null,
            countryCode: details.countryCode ?? null,
            zipCode: details.postal ?? null,
          });

          // Animate map to the new location
          requestAnimationFrame(() => {
            if (mapRef.current && "animateToRegion" in mapRef.current) {
              (mapRef.current as any).animateToRegion(newRegion, 300);
            }
          });

          // Clear search
          setAddressSearch("");
          setPredictions([]);
        }
      } catch (error) {
        Logger.error("Error fetching place details:", error);
        showBanner(
          t("locationError"),
          t("unableToFetchPlaceDetailsTryAgain"),
          "error",
        );
      } finally {
        setIsFetchingPlaceDetails(false);
        sessionTokenRef.current = generateSessionToken();
      }
    },
    [apiKey, ensureSessionToken, showBanner],
  );

  const handleSuggestionPress = useCallback(
    (prediction: PlacePrediction) => {
      Keyboard.dismiss();
      handleFetchPlaceDetails(prediction.place_id, prediction.description);
    },
    [handleFetchPlaceDetails],
  );

  const handleSearchChange = useCallback((value: string) => {
    setAddressSearch(value);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const circleRadius = useMemo(() => {
    if (!currentRegionRef.current) return 250;
    const baseRadius = 250;
    const zoomFactor = currentRegionRef.current.latitudeDelta / 0.01;
    return baseRadius * zoomFactor;
  }, [currentRegionRef.current?.latitudeDelta]);

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={["bottom"]}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Feather
                name="x"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("selectYourLocation")}</Text>
          </View>
        </TouchableWithoutFeedback>
        <View style={styles.searchContainer}>
          <FloatingInput
            label={t("search")}
            value={addressSearch}
            onChangeText={handleSearchChange}
            placeholder={t("searchYourAddress")}
            placeholderTextColor={theme.lightGreen2}
            returnKeyType="search"
            onClear={() => handleSearchChange("")}
            renderLeftAccessory={() => (
              <Feather
                name="search"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            )}
          />
          {addressSearch.trim().length > 0 && (
            <View style={styles.suggestionsContainer}>
              {isLoadingSuggestions && (
                <View style={{ paddingVertical: moderateHeightScale(12) }}>
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                </View>
              )}
              {!isLoadingSuggestions &&
                predictions.map((prediction, index) => {
                  const isLast = index === predictions.length - 1;
                  return (
                    <Pressable
                      key={prediction.place_id ?? index.toString()}
                      style={[
                        styles.suggestionItem,
                        isLast && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => handleSuggestionPress(prediction)}
                    >
                      <Feather
                        name="map-pin"
                        size={moderateWidthScale(16)}
                        color={theme.lightGreen}
                      />
                      <Text style={styles.suggestionText}>
                        {prediction.structured_formatting?.main_text ??
                          prediction.description}
                        {prediction.structured_formatting?.secondary_text
                          ? `, ${prediction.structured_formatting.secondary_text}`
                          : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              {!isLoadingSuggestions && predictions.length === 0 && (
                <View style={{ paddingVertical: moderateHeightScale(12) }}>
                  <Text style={styles.infoText}>
                    {t("noResultsRefineSearch")}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {tempLocation && (
            <View style={styles.locationInfoContainer}>
              {isFetchingAddress ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                  <Text style={styles.loadingText}>{t("fetchingAddress")}</Text>
                </View>
              ) : (
                <>
                  <Text
                    style={styles.locationInfoTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {tempLocation.locationName || t("location")}
                  </Text>
                  <Text style={styles.locationInfoSubtitle}>
                    {tempLocation.lat.toFixed(6)},{" "}
                    {tempLocation.long.toFixed(6)}
                  </Text>
                </>
              )}
            </View>
          )}

          {mapRegion ? (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.mapView}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
              >
                {tempLocation && (
                  <Circle
                    center={{
                      latitude: tempLocation.lat,
                      longitude: tempLocation.long,
                    }}
                    radius={circleRadius}
                    fillColor={theme.mapCircleFill}
                    strokeColor={theme.darkGreen}
                    strokeWidth={1}
                  />
                )}
              </MapView>
              <View style={styles.centerPinContainer}>
                <Image
                  source={IMAGES.mapPins}
                  style={styles.centerPin}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.mapControls}>
                <Pressable
                  style={styles.mapControlButton}
                  onPress={() => handleZoom("in")}
                >
                  <FontAwesome
                    name="search-plus"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </Pressable>
                <View style={styles.mapControlDivider} />
                <Pressable
                  style={styles.mapControlButton}
                  onPress={() => handleZoom("out")}
                >
                  <FontAwesome
                    name="search-minus"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </Pressable>
              </View>
              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                disabled={isResolvingLocation}
                activeOpacity={0.6}
                style={styles.currentLocControls}
              >
                <Feather
                  name="navigation"
                  size={moderateWidthScale(18)}
                  color={theme.selectCard}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
              <Text style={styles.loadingText}>{t("loadingMap")}</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.confirmButtonContainer}>
        <Button
          title={
            locationLoading ? t("getCurrentLocation") : t("confirmLocation")
          }
          onPress={handleConfirm}
          disabled={
            !tempLocation ||
            isFetchingAddress ||
            isFetchingPlaceDetails ||
            locationLoading
          }
        />
      </View>

      <LocationEnableModal
        visible={showLocationModal}
        onClose={handleCloseModal}
        screenName="setLocation"
      />
    </SafeAreaView>
  );
}
