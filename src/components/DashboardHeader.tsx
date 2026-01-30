import React, { useMemo, useCallback, useState, useRef, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
  Image,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { setToggleLoading } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomToggleInside from "@/src/components/customToggleInside";
import {
  fetchUserStatus,
  updateBusinessActiveStatus,
} from "@/src/state/thunks/businessThunks";
import { checkInternetConnection } from "@/src/services/api";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import BusinessPlansModal from "@/src/components/businessPlansModal";
import { IMAGES } from "../constant/images";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      backgroundColor: theme.darkGreen,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(5),
    },
    toggleContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    line: {
      width: "100%",
      height: 0.5,
      backgroundColor: theme.white85,
    },
    stripeBanner: {
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(10),
    },
    stripeBannerText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      textAlign: "center",
      textDecorationLine: "underline",
      textDecorationColor: theme.white,
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
  });

interface DashboardHeaderProps {
  canGoOnline?: boolean;
  onToggleAttempt?: () => void;
}

function DashboardHeader({
  canGoOnline = true,
  onToggleAttempt,
}: DashboardHeaderProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const isCustomer = isGuest || userRole === "customer";
  const isOnline = businessStatus?.active ?? false;
  const insets = useSafeAreaInsets();

  const [businessPlansModalVisible, setBusinessPlansModalVisible] =
    useState(false);
  const [isFetchingStripeLink, setIsFetchingStripeLink] = useState(false);
  const toggleLoading = useAppSelector((state) => state.general.toggleLoading);
  const bannerAnimation = useRef(new Animated.Value(0)).current;

  const handleStripeOnboardingPress = async () => {
    // First check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      showBanner(
        "No Internet Connection",
        "Please check your internet connection and try again",
        "error",
        2500,
      );
      return;
    }

    // Fetch latest Stripe onboarding link
    setIsFetchingStripeLink(true);
    try {
      const businessData = await dispatch(
        fetchUserStatus({ showError: false }),
      ).unwrap();

      // Open the link in browser after successful fetch
      if (businessData?.stripe_onboarding_link) {
        try {
          const canOpen = await Linking.canOpenURL(
            businessData.stripe_onboarding_link,
          );
          if (canOpen) {
            await Linking.openURL(businessData.stripe_onboarding_link);
          } else {
            showBanner("Error", "Cannot open the link", "error", 2500);
          }
        } catch (error: any) {
          showBanner(
            "Error",
            error.message || "Failed to open link",
            "error",
            2500,
          );
        }
      } else {
        showBanner(
          "Stripe Connect",
          "Stripe onboarding link is not available",
          "error",
          2500,
        );
      }
    } catch (error: any) {
      showBanner(
        "Error",
        error.message || "Failed to fetch Stripe onboarding link",
        "error",
        2500,
      );
    } finally {
      setIsFetchingStripeLink(false);
    }
  };

  const handleBusinessSubscriptionPress = () => {
    setBusinessPlansModalVisible(true);
  };

  // Only apply restrictions for business users
  // Staff and client can activate anytime
  const showStripeBanner =
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";
  const showBusinessSubscriptipn =
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "completed" &&
    businessStatus?.has_subscription === false;
  // For staff and client, always allow going online
  const actualCanGoOnline =
    userRole !== "business" || (!showStripeBanner && !showBusinessSubscriptipn);

  const animateBanner = useCallback(() => {
    Animated.sequence([
      Animated.timing(bannerAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(bannerAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(bannerAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(bannerAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bannerAnimation]);

  const handleToggleAttempt = useCallback(() => {
    if (!actualCanGoOnline && (showStripeBanner || showBusinessSubscriptipn)) {
      animateBanner();
    }
  }, [
    actualCanGoOnline,
    showStripeBanner,
    showBusinessSubscriptipn,
    animateBanner,
  ]);

  const handleToggleChange = useCallback(
    async (value: boolean) => {
      // Only dispatch if the value is actually different from current state
      // This prevents accidental toggles when component re-renders
      if (value !== isOnline) {
        // If trying to go online and canGoOnline is false, trigger animation
        if (value === true && !actualCanGoOnline) {
          handleToggleAttempt();
          return; // Don't allow toggle
        }

        // Show loader in toggle
        dispatch(setToggleLoading(true));

        // Call API to update active status
        try {
          await dispatch(
            updateBusinessActiveStatus({ active: value }),
          ).unwrap();
          // Success - status already updated in Redux via thunk
        } catch (error: any) {
          // Check if it's a no internet error - don't show banner (toast already shown)
          if (error?.isNoInternet) {
            // Toast already shown by API service, no need to show banner
            return;
          }
          // API failed - show error banner
          const errorMessage =
            error?.message || error || "Failed to update online status";
          showBanner("Error", errorMessage, "error", 2500);
          // Revert toggle to previous state on error
          // The toggle will automatically revert since businessStatus wasn't updated
        } finally {
          dispatch(setToggleLoading(false));
        }
      }
    },
    [dispatch, isOnline, actualCanGoOnline, handleToggleAttempt, showBanner],
  );

  return (
    <View>
      <View
        style={[
          styles.headerContainer,
          { paddingTop: insets.top + moderateHeightScale(12) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={IMAGES.logo3d} style={styles.logoImage} />
          </View>
          {isCustomer ? (
            <View style={{ width: 16, height: moderateHeightScale(38) }} />
          ) : (
            <View style={styles.toggleContainer}>
              <CustomToggleInside
                value={isOnline}
                onValueChange={handleToggleChange}
                loading={toggleLoading}
              />
            </View>
          )}
        </View>
      </View>
      <View style={styles.line} />

      {userRole === "business" &&
        (showStripeBanner || showBusinessSubscriptipn) && (
          <TouchableOpacity
            onPress={
              showStripeBanner
                ? handleStripeOnboardingPress
                : handleBusinessSubscriptionPress
            }
            activeOpacity={0.8}
            disabled={isFetchingStripeLink}
          >
            <Animated.View
              style={[
                styles.stripeBanner,
                {
                  transform: [{ translateX: bannerAnimation }],
                },
              ]}
            >
              {isFetchingStripeLink ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: moderateWidthScale(8),
                  }}
                >
                  <ActivityIndicator size="small" color={theme.white} />
                  <Text style={styles.stripeBannerText}>Loading...</Text>
                </View>
              ) : (
                <Text style={styles.stripeBannerText}>
                  {showStripeBanner
                    ? "Please complete your business stripe connect onboarding"
                    : "Please buy business plan"}
                </Text>
              )}
            </Animated.View>
          </TouchableOpacity>
        )}

      <BusinessPlansModal
        visible={businessPlansModalVisible}
        onClose={() => setBusinessPlansModalVisible(false)}
      />
    </View>
  );
}

export default memo(DashboardHeader);
