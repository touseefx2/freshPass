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
  setBusinessPlansModalVisible,
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
import { IMAGES } from "../constant/images";
import { Feather } from "@expo/vector-icons";
import { resolveApiImageUrl } from "@/src/utils/media";
import ModeSwitchLogo from "@/src/components/ModeSwitchLogo";
import { useBusinessTrialDaysLeft } from "@/src/hooks/useBusinessTrialDaysLeft";
import GoldFrame from "@/src/components/GoldFrame";
import { useGoldFrames, type GoldTarget } from "@/src/hooks/useGoldFrames";

const AVATAR_SIZE = 36;
/** Gold setup bars sit as rounded cards (client-approved sample 11-03) */
const GOLD_BAR_RADIUS = moderateWidthScale(12);

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
    goldBarFrame: {
      marginHorizontal: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    actionBannerGold: {
      borderRadius: GOLD_BAR_RADIUS,
    },
  });

function DashboardHeader() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const router = useRouter();
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

  const handleProfilePress = useCallback(() => {
    router.push("/(main)/dashboard/(account)" as any);
  }, [router]);

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

  // Trial banner clears once tapped (client 10-30); "Choose a plan" stays.
  // Membership / cancellation policy bars stay until done (gold frame, 11-03).
  // Stripe / Orders cards live in the home scroll (HomeQuickCards).
  // Persisted in dismissedSetupReminders, reset on logout.
  const dismissedReminders = useAppSelector(
    (state) => state.general.dismissedSetupReminders,
  );
  const clearOnPress = (key: string, action: () => void) => () => {
    dispatch(dismissSetupReminder(key));
    action();
  };
  const gold = useGoldFrames();

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

  const actionBanners = [
    showBusinessSubscriptipn && {
      key: "plan",
      gold: null as GoldTarget | null,
      icon: "briefcase" as const,
      title: t("pleaseBuyBusinessPlan"),
      cta: t("viewBusinessPlans"),
      onPress: handleBusinessSubscriptionPress,
    },
    trialDaysLeft !== null &&
      !dismissedReminders.includes("banner:trial") && {
      key: "trial",
      gold: null as GoldTarget | null,
      icon: "clock" as const,
      title:
        trialDaysLeft === 0
          ? t("freeTrialEndsToday")
          : t("freeTrialEndsInDays", { count: trialDaysLeft }),
      cta: t("managePlanCta"),
      onPress: clearOnPress("banner:trial", handleTrialPress),
    },
    isOnboardedOwner &&
      gold.isFramed("membership") && {
        key: "createMembership",
        gold: "membershipBar" as GoldTarget | null,
        icon: "gift" as const,
        title: t("setupCreateMembership"),
        cta: t("setupCreateMembershipCta"),
        onPress: handleMembershipSetup,
      },
    isOnboardedOwner &&
      gold.isFramed("cancellationPolicy") && {
        key: "cancellationPolicy",
        gold: "policyBar" as GoldTarget | null,
        icon: "shield" as const,
        title: t("setupCancellationPolicy"),
        cta: t("setupCancellationPolicyCta"),
        onPress: handleCancellationPolicySetup,
      },
  ].filter(Boolean) as {
    key: string;
    /** Set on bars that stay (gold frame) until the feature is done */
    gold: GoldTarget | null;
    icon: "briefcase" | "clock" | "gift" | "shield";
    title: string;
    cta: string;
    onPress: () => void;
  }[];

  const renderBanner = (
    banner: (typeof actionBanners)[number],
    index: number,
  ) => {
    const isGold = banner.gold != null;

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
            isGold && styles.actionBannerGold,
            index > 0 && !isGold && styles.actionBannerDivider,
          ]}
        >
          <View style={styles.actionIconWrap}>
            <Feather
              name={banner.icon}
              size={moderateWidthScale(15)}
              color={theme.white}
            />
          </View>
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
        </View>
      </TouchableOpacity>
    );

    return isGold ? (
      <GoldFrame
        key={banner.key}
        framed
        pulse={gold.pulseTarget === banner.gold}
        radius={GOLD_BAR_RADIUS}
        style={styles.goldBarFrame}
      >
        {bannerContent}
      </GoldFrame>
    ) : (
      <React.Fragment key={banner.key}>
        {bannerContent}
      </React.Fragment>
    );
  };

  const profileButton = (
    <TouchableOpacity
      style={styles.avatarButton}
      onPress={handleProfilePress}
      activeOpacity={0.85}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t("tabProfile")}
    >
      {avatarUri ? (
        <AppImage uri={avatarUri} style={styles.avatarImage} />
      ) : (
        <Feather
          name="user"
          size={moderateWidthScale(18)}
          color={theme.white80}
          style={styles.avatarPlaceholderIcon}
        />
      )}
    </TouchableOpacity>
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
            <ModeSwitchLogo>
              <Image source={IMAGES.logo3d} style={styles.logoImage} />
            </ModeSwitchLogo>
          </View>
          {isCustomer ? (
            <View style={{ width: 16, height: moderateHeightScale(38) }} />
          ) : userRole === "business" ? (
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={styles.statusBadge}
                onPress={handleTrialPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("freshpassSubscription")}
              >
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
              </TouchableOpacity>
              {profileButton}
            </View>
          ) : (
            // Staff have no Profile tab — the avatar opens it.
            // No online/offline toggle (client 10-30: it only drove a dot).
            <View style={styles.toggleContainer}>{profileButton}</View>
          )}
        </View>
      </View>
      <View style={styles.line} />

      {userRole === "business" && actionBanners.map(renderBanner)}
    </View>
  );
}

export default memo(DashboardHeader);
