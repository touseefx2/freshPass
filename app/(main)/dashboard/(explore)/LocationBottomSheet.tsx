import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import { LocationPinIcon } from "@/assets/icons";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import LocationEnableModal from "@/src/components/locationEnableModal";
import * as Location from "expo-location";
import { handleLocationPermission } from "@/src/services/locationPermissionService";
import {
  addToRecentLocations,
  setCurrentLocation,
  setLocationLoading,
} from "@/src/state/slices/generalSlice";
import { tryGetPosition } from "@/src/constant/functions";
import Logger from "@/src/services/logger";
import { setLocation } from "@/src/state/slices/userSlice";

interface LocationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginVertical: moderateHeightScale(20),
    },
    searchInputContainer: {
      // flex: 1,
      width: "100%",
    },
    cancelText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    currentLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(20),
    },
    currentLocationLeft: {
      flex: 1,
    },
    currentLocationTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    currentLocationSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    enableButton: {
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      minWidth: widthScale(72),
      alignItems: "center",
      justifyContent: "center",
    },
    enableButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    recentSectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    recentItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    recentItemLast: {
      borderBottomWidth: 0,
    },
    recentItemIconWrap: {
      width: widthScale(40),
      height: heightScale(40),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.borderLight,
      alignItems: "center",
      justifyContent: "center",
    },
    recentItemText: {
      flex: 1,
    },
    recentItemName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    recentItemSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    recentEmpty: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      paddingVertical: moderateHeightScale(30),
    },
  });

export default function LocationBottomSheet({
  visible,
  onClose,
}: LocationBottomSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const currentLocation = useAppSelector(
    (state) => state.general.currentLocation,
  );
  const locationLoading = useAppSelector(
    (state) => state.general.locationLoading,
  );
  const recentLocations = useAppSelector(
    (state) => state.general.recentLocations,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [enablingLocation, setEnablingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    setEnablingLocation(servicesEnabled);
  };

  const handleEnableLocation = async () => {
    setShowLocationModal(true);
  };

  const handleCloseModal = async (shouldGetLocation?: boolean) => {
    setShowLocationModal(false);
    if (shouldGetLocation) {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    setEnablingLocation(servicesEnabled);

    if (!servicesEnabled) {
      return;
    }

    try {
      // Check location permission
      const permissionResult = await handleLocationPermission();

      if (!permissionResult.granted) {
        return;
      }

      // Get current location
      dispatch(setLocationLoading(true));
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
        dispatch(setLocationLoading(false));
        Logger.error("Error getting location position:", error);
      }

      if (!currentPosition) {
        dispatch(setLocationLoading(false));
        Logger.error("Unable to get current position");
        showBanner(
          "Location Error",
          "Unable to get your current position. Please try again.",
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
        dispatch(setLocationLoading(false));
        Logger.error("Reverse geocode failed:", error);
      }

      if (!locationName) {
        dispatch(setLocationLoading(false));
        Logger.error("Unable to get current position");
        showBanner(
          "Location Error",
          "Unable to get your current position. Please try again.",
          "error",
        );
        return;
      }

      const locationPayload = {
        lat: coordinates.latitude,
        long: coordinates.longitude,
        locationName: locationName,
        countryName,
        cityName,
        countryCode,
        zipCode,
      };
      dispatch(setCurrentLocation(locationPayload));
      dispatch(addToRecentLocations(locationPayload));

      dispatch(setLocationLoading(false));
    } catch (error) {
      dispatch(setLocationLoading(false));
      Logger.error("Error getting location:", error);
      showBanner(
        "Location Error",
        "Unable to get your current location. Please try again.",
        "error",
      );
    }
  };

  const currentStatusText = enablingLocation
    ? locationLoading
      ? "Getting location..."
      : currentLocation.lat && currentLocation.long
        ? currentLocation?.countryName
        : "Get location"
    : "Location access disabled";

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Location"
      modalHeightPercent={0.85}
    >
      {/* Search row */}
      <View style={styles.searchRow}>
        <FloatingInput
          label="Enter a new location"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Enter a new location"
          placeholderTextColor={theme.lightGreen}
          containerStyle={styles.searchInputContainer}
        />
      </View>

      {/* Current location */}
      <View style={styles.currentLocationRow}>
        <LocationPinIcon
          width={widthScale(18)}
          height={heightScale(18)}
          color={theme.lightGreen}
        />
        <View style={styles.currentLocationLeft}>
          <Text style={styles.currentLocationTitle}>Current location</Text>
          <Text style={styles.currentLocationSubtitle}>
            {currentStatusText}
          </Text>
        </View>

        {!enablingLocation ? (
          <Pressable onPress={handleEnableLocation} style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={locationLoading}
            onPress={getCurrentLocation}
            style={styles.enableButton}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={theme.darkGreen} />
            ) : (
              <Text style={styles.enableButtonText}>Get</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Recent locations */}
      <Text style={styles.recentSectionTitle}>Recent locations</Text>
      {recentLocations.length > 0 ? (
        recentLocations.map((item, i) => {
          const name = item.countryName;

          const subtitle =
            item.locationName ?? item.cityName ?? item.countryName ?? "";

          return (
            <Pressable
              key={`${item.lat}-${item.long}-${i}`}
              style={[
                styles.recentItem,
                i === recentLocations.length - 1 && styles.recentItemLast,
              ]}
              onPress={() => {
                dispatch(setLocation(item));
                dispatch(addToRecentLocations(item));
                onClose();
              }}
            >
              <View style={styles.recentItemIconWrap}>
                <LocationPinIcon
                  width={widthScale(18)}
                  height={heightScale(18)}
                  color={theme.lightGreen}
                />
              </View>
              <View style={styles.recentItemText}>
                <Text style={styles.recentItemName}>{name}</Text>
                {subtitle ? (
                  <Text style={styles.recentItemSubtitle}>{subtitle}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.recentEmpty}>No recent location found</Text>
      )}

      <LocationEnableModal
        visible={showLocationModal}
        onClose={handleCloseModal}
      />
    </ModalizeBottomSheet>
  );
}
