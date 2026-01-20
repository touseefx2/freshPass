import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Region } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FloatingInput from "@/src/components/floatingInput";
import { Skeleton } from "@/src/components/skeletons";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useRouter } from "expo-router";
import StepFourSearchSection from "../../../completeProfile/components/StepFour/StepFourSearchSection";
import StepFourMapSection from "../../../completeProfile/components/StepFour/StepFourMapSection";
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
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";
import NotificationBanner from "@/src/components/notificationBanner";

interface LocationData {
  street_address: string;
  city: string;
  state: string;
  zip_code: string | null;
  latitude: string;
  longitude: string;
  complete_address: string;
}

const generateSessionToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    main: {
      flex: 1,
      gap: moderateHeightScale(20),
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    changeButton: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.darkGreen,
    },
    viewMapButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(16),
    },
    viewMapButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
    },
    viewMapButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    updateButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      //   paddingTop: moderateHeightScale(16),
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      backgroundColor: theme.background,
      gap: moderateHeightScale(5),
    },
    modalHeaderTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalHeaderTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    modalHeaderFirstName: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
    modalHeaderSubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    modalCloseButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    modalContent: {
      flex: 1,
    },
    modalTitleSec: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    modalTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    modalSubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    modalFooter: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
  });

export default function LocationScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const placeholderColor = theme.lightGreen2;
  const { showBanner } = useNotificationContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);

  const firstName = useMemo(() => {
    if (!user.name?.trim()) {
      return "";
    }
    const [primary] = user.name.trim().split(" ");
    return primary ?? user.name.trim();
  }, [user.name]);

  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Local banner for modal
  const [modalBanner, setModalBanner] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  // Search modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  // Map modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Local state for editing
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
  }, []);

  const fetchLocation = async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: LocationData;
      }>(businessEndpoints.moduleData("business-location"));

      if (response.success && response.data) {
        setLocationData(response.data);
        setStreetAddress(response.data.street_address || "");
        setCity(response.data.city || "");
        setState(response.data.state || "");
        setZipCode(response.data.zip_code || "");
        setLatitude(response.data.latitude || "");
        setLongitude(response.data.longitude || "");

        if (response.data.latitude && response.data.longitude) {
          const lat = parseFloat(response.data.latitude);
          const lng = parseFloat(response.data.longitude);
          setSelectedLocation({
            latitude: lat,
            longitude: lng,
          });
          // Set initial map region with closer zoom for location screen
          setMapRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01, // Very close zoom to see pin and circle clearly
            longitudeDelta: 0.01,
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch location:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

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
        console.error("Error fetching suggestions:", error);
        setSuggestionError("Unable to load suggestions. Please try again.");
        setPredictions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [apiKey, ensureSessionToken]
  );

  useEffect(() => {
    if (!searchModalVisible) {
      return;
    }

    const handler = setTimeout(() => {
      fetchSuggestions(addressSearch);
    }, 300);

    return () => clearTimeout(handler);
  }, [addressSearch, fetchSuggestions, searchModalVisible]);

  const handleFetchPlaceDetails = useCallback(
    async (placeId: string, description: string) => {
      if (!apiKey) {
        setStreetAddress(description);
        setSearchModalVisible(false);
        return;
      }

      try {
        setIsFetchingDetails(true);
        ensureSessionToken();

        const details = await fetchPlaceDetailsApi(
          placeId,
          sessionTokenRef.current
        );

        const isUS = details.countryCode?.toUpperCase() === "US";

        if (!isUS) {
          setModalBanner({
            visible: true,
            title: "Location Not Supported",
            message: "Just US related country city acceptable",
            type: "error",
          });
          setIsFetchingDetails(false);
          sessionTokenRef.current = generateSessionToken();
          return;
        }

        setStreetAddress(details.street || "");
        setCity(details.area || "");
        setState(details.state || "");
        setZipCode(details.postal || "");
        setLocationMessage(null);

        if (details.latitude && details.longitude) {
          setLatitude(details.latitude.toString());
          setLongitude(details.longitude.toString());
          setSelectedLocation({
            latitude: details.latitude,
            longitude: details.longitude,
          });
          setMapRegion({
            latitude: details.latitude,
            longitude: details.longitude,
            latitudeDelta: 0.01, // Very close zoom to see pin and circle clearly
            longitudeDelta: 0.01,
          });
        }

        setSearchModalVisible(false);
        setAddressSearch("");
        setPredictions([]);
        setModalBanner({
          visible: false,
          title: "",
          message: "",
          type: "info",
        });
      } catch (error) {
        setSuggestionError("Unable to fetch place details. Try again.");
      } finally {
        setIsFetchingDetails(false);
        sessionTokenRef.current = generateSessionToken();
      }
    },
    [apiKey, ensureSessionToken, showBanner]
  );

  const handleSuggestionPress = useCallback(
    (prediction: PlacePrediction) => {
      setAddressSearch(prediction.description);
      handleFetchPlaceDetails(prediction.place_id, prediction.description);
    },
    [handleFetchPlaceDetails]
  );

  const handleUseCurrentLocation = async () => {
    setLocationMessage(null);

    const permissionResult = await handleLocationPermission();

    if (!permissionResult.granted) {
      if (permissionResult.errorMessage) {
        setLocationMessage(permissionResult.errorMessage);
        if (permissionResult.shouldOpenSettings) {
          await openLocationSettings();
        }
      }
      return;
    }

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

    const isUS = details.countryCode?.toUpperCase() === "US";

    if (!isUS) {
      setModalBanner({
        visible: true,
        title: "Location Not Supported",
        message: "Just US related country city acceptable",
        type: "error",
      });
      return;
    }

    setStreetAddress(details.street ?? "");
    setCity(details.area ?? "");
    setState(details.state ?? "");
    setZipCode(details.postal ?? "");

    if (details.coordinates) {
      setLatitude(details.coordinates.latitude.toString());
      setLongitude(details.coordinates.longitude.toString());
      setSelectedLocation(details.coordinates);
      setMapRegion({
        latitude: details.coordinates.latitude,
        longitude: details.coordinates.longitude,
        latitudeDelta: 0.01, // Very close zoom to see pin and circle clearly
        longitudeDelta: 0.01,
      });
    }

    setSearchModalVisible(false);
    setAddressSearch("");
    setModalBanner({ visible: false, title: "", message: "", type: "info" });
  };

  const handleSearchChange = useCallback((value: string) => {
    setAddressSearch(value);
    setLocationMessage(null);
    if (!value.trim()) {
      setPredictions([]);
    }
  }, []);

  const handleMapRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
    setSelectedLocation({
      latitude: region.latitude,
      longitude: region.longitude,
    });
    setLatitude(region.latitude.toString());
    setLongitude(region.longitude.toString());
  }, []);

  const handleMapZoom = useCallback(
    (direction: "in" | "out") => {
      if (!mapRegion) return;

      const factor = direction === "in" ? 0.7 : 1.3;
      const latitudeDelta = Math.max(mapRegion.latitudeDelta * factor, 0.0005);
      const longitudeDelta = Math.max(
        mapRegion.longitudeDelta * factor,
        0.0005
      );

      setMapRegion({
        ...mapRegion,
        latitudeDelta,
        longitudeDelta,
      });
    },
    [mapRegion]
  );

  const handleSaveMapLocation = useCallback(() => {
    if (selectedLocation) {
      setLatitude(selectedLocation.latitude.toString());
      setLongitude(selectedLocation.longitude.toString());
    }
    setMapModalVisible(false);
  }, [selectedLocation]);

  const handleUpdateLocation = useCallback(async () => {
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("street_address", streetAddress);
      formData.append("city", city);
      formData.append("state", state);
      if (zipCode) {
        formData.append("zip_code", zipCode);
      }
      if (latitude) {
        formData.append("latitude", latitude);
      }
      if (longitude) {
        formData.append("longitude", longitude);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, formData, config);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Location updated successfully",
          "success",
          3000
        );
        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update location",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to update location:", error);
      showBanner(
        "Error",
        error?.message || "Failed to update location. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  }, [
    streetAddress,
    city,
    state,
    zipCode,
    latitude,
    longitude,
    showBanner,
    fetchLocation,
  ]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Your business location" />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bottomOffset={0}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <>
            <View style={styles.titleSec}>
              <Text style={styles.title}>Your business address</Text>
              <Text style={styles.subtitle}>
                Let us know the location you'll be operating from so the
                customers can find and book you easily.
              </Text>
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}></Text>
              <Pressable onPress={() => setSearchModalVisible(true)}>
                <Text style={styles.changeButton}>Search Location</Text>
              </Pressable>
            </View>

            <View style={styles.main}>
              <FloatingInput
                label="Street address"
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Street address"
                placeholderTextColor={placeholderColor}
                showClearButton={false}
              />

              <FloatingInput
                label="Area / City"
                value={city}
                onChangeText={setCity}
                placeholder="Area / City"
                placeholderTextColor={placeholderColor}
                showClearButton={false}
              />

              <FloatingInput
                label="State"
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={placeholderColor}
                showClearButton={false}
              />

              <FloatingInput
                label="Zip code"
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="Zip code (Optional)"
                placeholderTextColor={placeholderColor}
                keyboardType="number-pad"
                showClearButton={false}
              />
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {!loading && (
        <>
          {selectedLocation && (
            <View style={styles.viewMapButtonContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (selectedLocation) {
                    // Set map region with close zoom before opening modal
                    setMapRegion({
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                      latitudeDelta: 0.001, // Very close zoom to see pin and circle clearly
                      longitudeDelta: 0.001,
                    });
                  }
                  setMapModalVisible(true);
                }}
                style={styles.viewMapButton}
                activeOpacity={0.7}
              >
                <Feather
                  name="map"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
                <Text style={styles.viewMapButtonText}>View map</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.updateButtonContainer}>
            <Button
              title="Update location"
              onPress={handleUpdateLocation}
              disabled={isUpdating}
            />
          </View>
        </>
      )}

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setSearchModalVisible(false);
          setAddressSearch("");
          setPredictions([]);
          setLocationMessage(null);
          setModalBanner({
            visible: false,
            title: "",
            message: "",
            type: "info",
          });
        }}
        statusBarTranslucent
      >
        <SafeAreaView
          style={[styles.modalContainer, { paddingBottom: 20 }]}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => {
                setSearchModalVisible(false);
                setAddressSearch("");
                setPredictions([]);
                setLocationMessage(null);
                setModalBanner({
                  visible: false,
                  title: "",
                  message: "",
                  type: "info",
                });
              }}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Feather
                name="x"
                size={moderateWidthScale(24)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleSec}>
              <Text style={styles.modalTitle}>Enter your business address</Text>
              <Text style={styles.modalSubtitle}>
                This helps clients find and visit you.
              </Text>
            </View>
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
          </View>
          <NotificationBanner
            visible={modalBanner.visible}
            title={modalBanner.title}
            message={modalBanner.message}
            type={modalBanner.type}
            duration={3000}
            onDismiss={() =>
              setModalBanner((prev) => ({ ...prev, visible: false }))
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Map Modal */}
      {mapModalVisible && (
        <Modal
          visible={mapModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMapModalVisible(false)}
          statusBarTranslucent
        >
          <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTop}>
                <TouchableOpacity
                  onPress={() => setMapModalVisible(false)}
                  style={styles.modalCloseButton}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="x"
                    size={moderateWidthScale(24)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>
              <Text style={styles.modalHeaderTitle}>
                Is the pin placed correctly
                {firstName ? (
                  <>
                    , <Text style={styles.modalHeaderFirstName}>{firstName}?</Text>
                  </>
                ) : (
                  "?"
                )}
              </Text>
              <Text style={styles.modalHeaderSubtitle}>
                Let us know the location you'll be operating from so the
                customers can find and book you easily.
              </Text>
            </View>
            <View style={styles.modalContent}>
              <StepFourMapSection
                mapRegion={mapRegion}
                streetAddress={streetAddress}
                selectedAddress={streetAddress}
                area={city}
                zipCode={zipCode}
                selectedLocation={selectedLocation}
                onZoom={handleMapZoom}
                onRegionChangeComplete={handleMapRegionChange}
              />
            </View>
            <View style={styles.modalFooter}>
              <Button title="Save" onPress={handleSaveMapLocation} />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}
