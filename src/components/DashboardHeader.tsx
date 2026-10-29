import React, { useMemo, useCallback, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { useRouter } from "expo-router";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import {
  setToggleLoading,
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
  dismissSetupReminder,
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
import StaffCustomerStatusControl from "@/src/components/staffCustomerStatusControl";
import { updateBusinessActiveStatus } from "@/src/state/thunks/businessThunks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { IMAGES } from "../constant/images";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { resolveApiImageUrl } from "@/src/utils/media";
import ModeSwitchLogo from "@/src/components/ModeSwitchLogo";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import dayjs from "dayjs";
import { useBusinessTrialDaysLeft } from "@/src/hooks/useBusinessTrialDaysLeft";
import PulseGlow from "@/src/components/PulseGlow";
import { useSetupReminder } from "@/src/hooks/useSetupReminder";
import { useUpcomingAppointmentsCount } from "@/src/hooks/useUpcomingAppointmentsCount";

const AVATAR_SIZE = 36;

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
      gap: moderateWidthScale(10),
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(7),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white15,
      borderWidth: 1,
      borderColor: theme.white15,
    },
    statusDot: {
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(7) / 2,
    },
    statusDotActive: {
      backgroundColor: theme.toggleActive,
    },
    statusDotInactive: {
      backgroundColor: theme.red,
    },
    statusText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.3,
    },
    avatarButton: {
      width: widthScale(AVATAR_SIZE),
      height: heightScale(AVATAR_SIZE),
      borderRadius: moderateWidthScale(AVATAR_SIZE / 2),
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: theme.white50,
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarPlaceholderIcon: {
      marginTop: moderateHeightScale(2),
    },
    line: {
      width: "100%",
      height: 0.5,
      backgroundColor: theme.white85,
    },
    actionBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.orangeBrown015,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      gap: moderateWidthScale(10),
    },
    actionBannerDivider: {
      borderTopWidth: 1,
      borderTopColor: theme.orangeBrown30,
    },
    actionIconWrap: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actionCta: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(8),
      gap: moderateWidthScale(2),
    },
    actionCtaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
    setupTag: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 0.3,
      marginRight: moderateWidthScale(4),
    },
    dismissHit: {
      paddingLeft: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
    },
    quickCardsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
    },
    ordersCardSlot: {
      flex: 1,
    },
    // Sample: white pill, solid honey border + soft honey glow
    quickCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
    },
    stripeCard: {
      flex: 1.55,
      justifyContent: "flex-start",
      paddingHorizontal: moderateWidthScale(18),
      gap: moderateWidthScale(14),
      borderRadius: moderateHeightScale(26),
      borderWidth: 2,
      borderColor: theme.orangeBrown,
      shadowColor: theme.orangeBrown,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 10,
      elevation: 6,
    },
    // Done state: calm green outline instead of the "do this" honey glow
    stripeCardConnected: {
      borderColor: theme.buttonBack,
      shadowOpacity: 0,
      elevation: 2,
    },
    ordersCard: {
      paddingHorizontal: moderateWidthScale(10),
      gap: moderateWidthScale(10),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    quickCardText: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    stripeCardText: {
      flex: 1,
    },
    ordersBadge: {
      position: "absolute",
      top: -moderateWidthScale(8),
      right: -moderateWidthScale(6),
      minWidth: moderateWidthScale(22),
      height: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(5),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.red,
      borderWidth: 2,
      borderColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    ordersBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
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
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const profileImageUrl = useAppSelector(
    (state) => state.user.profile_image_url,
  );
  const isCustomer = isGuest || userRole === "customer";
  const isOnline = businessStatus?.active ?? false;
  const insets = useSafeAreaInsets();
  const avatarUri = resolveApiImageUrl(profileImageUrl);

  const toggleLoading = useAppSelector((state) => state.general.toggleLoading);

  const handleProfilePress = useCallback(() => {
    router.push("/(main)/dashboard/(account)" as any);
  }, [router]);

  const handleStripeOnboardingPress = () => {
    dispatch(setStripeConnectModalVisible(true));
  };

  const handleBusinessSubscriptionPress = () => {
    dispatch(setBusinessPlansModalVisible(true));
  };

  const handleTrialPress = () => {
    router.push("/(main)/dashboard/(account)/subscription" as any);
  };

  // Only apply restrictions for business users
  // Staff and client can activate anytime
  const isOnboardedOwner =
    userRole === "business" && businessStatus?.onboarding_completed === true;

  // A plan (trial or paid) is all an owner needs to go online
  const showBusinessSubscriptipn =
    isOnboardedOwner && businessStatus?.has_subscription === false;

  // Stripe Connect is optional — it only turns on customer payments
  const stripeStatus = businessStatus?.stripe_onboarding_status;
  const stripeDeadline = businessStatus?.requirements_deadline
    ? dayjs(businessStatus.requirements_deadline)
    : null;
  const isStripeConnected = isStripeOnboardingCompleted(businessStatus);
  const stripeCardLabel = isStripeConnected
    ? t("stripeCardConnected")
    : stripeStatus === "action_required"
      ? t("stripeCardFinishSetup")
      : stripeStatus === "under_review"
        ? t("stripeCardInReview")
        : t("stripeCardConnect");
  // Full sentence for screen readers (the card only fits a short label)
  const stripeCardA11y = isStripeConnected
    ? t("stripeCardConnectedA11y")
    : stripeStatus === "action_required"
      ? stripeDeadline?.isValid()
        ? t("stripeNeedsDetailsByDate", { date: stripeDeadline.format("MMM D") })
        : t("stripeNeedsDetails")
      : stripeStatus === "under_review"
        ? t("stripeReviewingDetails")
        : t("getPaidFromCustomers");
  // Guide banners clear once tapped (client 10-30); "Choose a plan" and the
  // Stripe / Orders cards stay. Persisted in dismissedSetupReminders, reset on logout.
  const dismissedReminders = useAppSelector(
    (state) => state.general.dismissedSetupReminders,
  );
  const clearOnPress = (key: string, action: () => void) => () => {
    dispatch(dismissSetupReminder(key));
    action();
  };
  // Always shown; once connected it says so and opens earnings / payouts
  const handleStripeCardPress = isStripeConnected
    ? () => router.push("/(main)/businessEarnings" as any)
    : stripeStatus === "action_required" || stripeStatus === "under_review"
      ? () => router.push("/(main)/stripeConnectOnboarding" as any)
      : handleStripeOnboardingPress;

  // "Orders" = upcoming appointments; drops live when one is completed
  const upcomingCount = useUpcomingAppointmentsCount(isOnboardedOwner);
  const handleOrdersPress = useCallback(() => {
    router.push({
      pathname: "/(main)/dashboard/(account)/allAppointments",
      params: { status: "upcoming" },
    } as any);
  }, [router]);

  const { currentReminder, isSetupStep, dismiss: dismissReminder } =
    useSetupReminder();

  const handleMembershipSetup = useCallback(() => {
    router.push("/(main)/dashboard/(account)" as any);
    setTimeout(() => {
      router.push(
        "/(main)/dashboard/(account)/(businessProfileSettings)" as any,
      );
      setTimeout(() => {
        router.push(
          "/(main)/dashboard/(account)/(businessProfileSettings)/servicesAndMemberships" as any,
        );
      }, 5);
    }, 5);
  }, [router]);

  const handleCancellationPolicySetup = useCallback(() => {
    router.push("/(main)/dashboard/(account)" as any);
    setTimeout(() => {
      router.push(
        "/(main)/dashboard/(account)/(businessProfileSettings)" as any,
      );
      setTimeout(() => {
        router.push(
          "/(main)/dashboard/(account)/(businessProfileSettings)/cancellationPolicy" as any,
        );
      }, 5);
    }, 5);
  }, [router]);

  const trialDaysLeft = useBusinessTrialDaysLeft(
    isOnboardedOwner && businessStatus?.has_subscription === true,
    `${businessStatus?.business_id ?? ""}:${businessStatus?.subscription_status ?? ""}:${businessStatus?.subscription_plan_name ?? ""}`,
  );

  // For staff and client, always allow going online
  const actualCanGoOnline = userRole !== "business" || !showBusinessSubscriptipn;

  const handleBlockedActiveToggle = useCallback(() => {
    if (showBusinessSubscriptipn) {
      dispatch(setBusinessPlansModalVisible(true));
    }
  }, [dispatch, showBusinessSubscriptipn]);

  const actionBanners = [
    showBusinessSubscriptipn && {
      key: "plan",
      reminderKey: null as string | null,
      icon: "briefcase" as const,
      title: t("pleaseBuyBusinessPlan"),
      cta: t("viewBusinessPlans"),
      onPress: handleBusinessSubscriptionPress,
    },
    trialDaysLeft !== null &&
      !dismissedReminders.includes("banner:trial") && {
      key: "trial",
      reminderKey: null as string | null,
      icon: "clock" as const,
      title:
        trialDaysLeft === 0
          ? t("freeTrialEndsToday")
          : t("freeTrialEndsInDays", { count: trialDaysLeft }),
      cta: t("managePlanCta"),
      onPress: clearOnPress("banner:trial", handleTrialPress),
    },
    currentReminder === "createMembership" &&
      isOnboardedOwner && {
        key: "createMembership",
        reminderKey: "createMembership" as string | null,
        icon: "gift" as const,
        title: t("setupCreateMembership"),
        cta: t("setupCreateMembershipCta"),
        onPress: clearOnPress("createMembership", handleMembershipSetup),
      },
    currentReminder === "cancellationPolicy" &&
      isOnboardedOwner && {
        key: "cancellationPolicy",
        reminderKey: "cancellationPolicy" as string | null,
        icon: "shield" as const,
        title: t("setupCancellationPolicy"),
        cta: t("setupCancellationPolicyCta"),
        onPress: clearOnPress(
          "cancellationPolicy",
          handleCancellationPolicySetup,
        ),
      },
  ].filter(Boolean) as {
    key: string;
    reminderKey: string | null;
    icon: "briefcase" | "clock" | "gift" | "shield";
    title: string;
    cta: string;
    onPress: () => void;
  }[];

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
    [
      dispatch,
      isOnline,
      actualCanGoOnline,
      handleBlockedActiveToggle,
      showBanner,
      t,
    ],
  );

  // Plan / trial sit above the Stripe + Orders cards; setup steps below
  const topBanners = actionBanners.filter(
    (b) => b.key === "plan" || b.key === "trial",
  );
  const setupBanners = actionBanners.filter(
    (b) => b.key !== "plan" && b.key !== "trial",
  );

  const renderBanner = (
    banner: (typeof actionBanners)[number],
    index: number,
  ) => {
    const isGlowing =
      currentReminder != null &&
      banner.reminderKey === currentReminder;

    const bannerContent = (
      <TouchableOpacity
        onPress={banner.onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.cta}`}
      >
        <View
          style={[
            styles.actionBanner,
            index > 0 && !isGlowing && styles.actionBannerDivider,
          ]}
        >
          <View style={styles.actionIconWrap}>
            <Feather
              name={banner.icon}
              size={moderateWidthScale(15)}
              color={theme.white}
            />
          </View>
          {isGlowing && isSetupStep && (
            <Text style={styles.setupTag}>
              {t("setupFinishSetup")}
            </Text>
          )}
          <Text style={styles.actionTitle} numberOfLines={2}>
            {banner.title}
          </Text>
          <View style={styles.actionCta}>
            <Text style={styles.actionCtaText}>{banner.cta}</Text>
            <Feather
              name="chevron-right"
              size={moderateWidthScale(14)}
              color={theme.white}
            />
          </View>
          {isGlowing && (
            <TouchableOpacity
              onPress={dismissReminder}
              style={styles.dismissHit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Feather
                name="x"
                size={moderateWidthScale(14)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );

    return isGlowing ? (
      <PulseGlow key={banner.key} borderRadius={0}>
        {bannerContent}
      </PulseGlow>
    ) : (
      <React.Fragment key={banner.key}>
        {bannerContent}
      </React.Fragment>
    );
  };

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
            <ModeSwitchLogo>
              <Image source={IMAGES.logo3d} style={styles.logoImage} />
            </ModeSwitchLogo>
          </View>
          {isCustomer ? (
            <View style={{ width: 16, height: moderateHeightScale(38) }} />
          ) : userRole === "business" ? (
            <View style={styles.toggleContainer}>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    isOnline
                      ? styles.statusDotActive
                      : styles.statusDotInactive,
                  ]}
                />
                <Text style={styles.statusText}>
                  {isOnline ? t("active") : t("inactive")}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={handleProfilePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("tabProfile")}
              >
                {avatarUri ? (
                  <AppImage
                    uri={avatarUri}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Feather
                    name="user"
                    size={moderateWidthScale(18)}
                    color={theme.white80}
                    style={styles.avatarPlaceholderIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.toggleContainer}>
              <StaffCustomerStatusControl
                value={isOnline}
                onValueChange={handleToggleChange}
                loading={toggleLoading}
              />
            </View>
          )}
        </View>
      </View>
      <View style={styles.line} />

      {userRole === "business" && (
        <>
          {topBanners.map(renderBanner)}
          {isOnboardedOwner && (
            <View style={styles.quickCardsRow}>
              <TouchableOpacity
                style={[
                  styles.quickCard,
                  styles.stripeCard,
                  isStripeConnected && styles.stripeCardConnected,
                ]}
                onPress={handleStripeCardPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${stripeCardLabel}. ${stripeCardA11y}`}
              >
                <MaterialCommunityIcons
                  name={
                    isStripeConnected
                      ? "check-circle"
                      : stripeStatus === "action_required"
                        ? "alert-circle"
                        : stripeStatus === "under_review"
                          ? "clock"
                          : "credit-card"
                  }
                  size={moderateWidthScale(26)}
                  color={
                    !isStripeConnected && stripeStatus === "action_required"
                      ? theme.orangeBrownText
                      : theme.buttonBack
                  }
                />
                <Text
                  style={[styles.quickCardText, styles.stripeCardText]}
                  numberOfLines={1}
                >
                  {stripeCardLabel}
                </Text>
              </TouchableOpacity>
              <View style={styles.ordersCardSlot}>
                <TouchableOpacity
                  style={[styles.quickCard, styles.ordersCard]}
                  onPress={handleOrdersPress}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t("ordersUpcomingA11y", {
                    count: upcomingCount ?? 0,
                  })}
                >
                  <MaterialCommunityIcons
                    name="shopping"
                    size={moderateWidthScale(22)}
                    color={theme.red}
                  />
                  <Text style={styles.quickCardText} numberOfLines={1}>
                    {t("ordersTitle")}
                  </Text>
                </TouchableOpacity>
                {upcomingCount != null && upcomingCount > 0 && (
                  <View style={styles.ordersBadge} pointerEvents="none">
                    <Text style={styles.ordersBadgeText}>
                      {upcomingCount > 99 ? "99+" : upcomingCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          {setupBanners.map(renderBanner)}
        </>
      )}
    </View>
  );
}

export default memo(DashboardHeader);
