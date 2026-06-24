import React, { useMemo, useCallback, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import {
  setToggleLoading,
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomToggleInside from "@/src/components/customToggleInside";
import { updateBusinessActiveStatus } from "@/src/state/thunks/businessThunks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
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
  const { t } = useTranslation();
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

  const toggleLoading = useAppSelector((state) => state.general.toggleLoading);

  const handleStripeOnboardingPress = () => {
    dispatch(setStripeConnectModalVisible(true));
  };

  const handleBusinessSubscriptionPress = () => {
    dispatch(setBusinessPlansModalVisible(true));
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

  const handleBlockedActiveToggle = useCallback(() => {
    if (showStripeBanner) {
      dispatch(setStripeConnectModalVisible(true));
      return;
    }

    if (showBusinessSubscriptipn) {
      dispatch(setBusinessPlansModalVisible(true));
    }
  }, [dispatch, showStripeBanner, showBusinessSubscriptipn]);

  const handleToggleChange = useCallback(
    async (value: boolean) => {
      // Only dispatch if the value is actually different from current state
      // This prevents accidental toggles when component re-renders
      if (value !== isOnline) {
        if (value === true && !actualCanGoOnline) {
          handleBlockedActiveToggle();
          return;
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
          showBanner(t("error"), errorMessage, "error", 2500);
          // Revert toggle to previous state on error
          // The toggle will automatically revert since businessStatus wasn't updated
        } finally {
          dispatch(setToggleLoading(false));
        }
      }
    },
    [dispatch, isOnline, actualCanGoOnline, handleBlockedActiveToggle, showBanner, t],
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
          >
            <View style={styles.stripeBanner}>
              <Text style={styles.stripeBannerText}>
                {showStripeBanner
                  ? t("pleaseCompleteStripe")
                  : t("pleaseBuyBusinessPlan")}
              </Text>
            </View>
          </TouchableOpacity>
        )}

    </View>
  );
}

export default memo(DashboardHeader);
