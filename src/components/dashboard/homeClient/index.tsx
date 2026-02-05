import React, { useCallback, useEffect, useMemo, useState } from "react";
import Logger from "@/src/services/logger";
import { StyleSheet, View, StatusBar } from "react-native";
import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import DashboardHeaderClient from "../../DashboardHeaderClient";
import SearchBar from "./components/SearchBar";
import DashboardContent from "./components/DashboardContent";
import * as Location from "expo-location";
import LocationEnableModal from "@/src/components/locationEnableModal";
import {
  setLocation,
  setUnreadCount,
  setUserDetails,
} from "@/src/state/slices/userSlice";
import { tryGetPosition } from "@/src/constant/functions";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setLocationLoading } from "@/src/state/slices/generalSlice";
import { handleLocationPermission } from "@/src/services/locationPermissionService";
import { ApiService } from "@/src/services/api";
import {
  notificationsEndpoints,
  userEndpoints,
} from "@/src/services/endpoints";
import { useFocusEffect } from "expo-router";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
  });

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { showBanner } = useNotificationContext();

  useEffect(() => {
    // if (
    //   (userRole === "customer" || isGuest) &&
    //   user?.location.lat === null &&
    //   user?.location.long === null
    // ) {
    //   isLocationEnable();
    // }
  }, []);

  const isLocationEnable = async () => {
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
        dispatch(setLocationLoading(false));
        Logger.error("Reverse geocode failed:", error);
      }

      if (!locationName) {
        dispatch(setLocationLoading(false));
        Logger.error("Unable to get current position");
        showBanner(
          t("locationError"),
          t("unableToGetCurrentPosition"),
          "error",
        );
        return;
      }

      // Store location in user slice
      dispatch(
        setLocation({
          lat: coordinates.latitude,
          long: coordinates.longitude,
          locationName: locationName,
          countryName,
          cityName,
          countryCode,
          zipCode,
        }),
      );

      dispatch(setLocationLoading(false));
    } catch (error) {
      dispatch(setLocationLoading(false));
      Logger.error("Error getting location:", error);
      showBanner(t("locationError"), t("unableToGetCurrentLocation"), "error");
    }
  };

  const handleFetchUnreadCount = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          unread_count: number;
        };
      }>(notificationsEndpoints.unreadCount);

      if (response.success && response.data) {
        dispatch(setUnreadCount(response.data.unread_count));
      }
    } catch (error: any) {
      // Silent fail - no banner or console
    }
  };

  const handleFetchUserDetails = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          name: string;
          email: string;
          phone: string | null;
          country_code: string | null;
          email_notifications: boolean | null;
          profile_image_url: string | null;
          business: {
            id: number;
            title: string;
          };
          ai_quota?: number;
        };
      }>(userEndpoints.details);

      if (response.success && response.data) {
        dispatch(
          setUserDetails({
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone,
            country_code: response.data.country_code,
            email_notifications: response.data.email_notifications,
            profile_image_url: response.data.profile_image_url,
            business_id: response.data.business.id ?? "",
            business_name: response.data.business.title ?? "",
            ...(response.data.ai_quota !== undefined && {
              ai_quota: response.data.ai_quota,
            }),
          }),
        );
      }
    } catch (error: any) {}
  };

  useFocusEffect(
    useCallback(() => {
      handleFetchUnreadCount();
      handleFetchUserDetails();
    }, []),
  );

  return (
    <>
      <View style={styles.container}>
        <StatusBar
          backgroundColor={theme.darkGreen}
          barStyle="light-content"
          translucent
        />
        <DashboardHeaderClient />
        <DashboardContent />
      </View>

      <LocationEnableModal
        visible={showLocationModal}
        onClose={handleCloseModal}
      />
    </>
  );
}
