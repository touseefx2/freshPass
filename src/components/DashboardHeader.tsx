import React, {
  useMemo,
  useCallback,
  memo,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
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
import Animated, { LinearTransition } from "react-native-reanimated";
import { IMAGES } from "../constant/images";
import { Feather } from "@expo/vector-icons";
import { resolveApiImageUrl } from "@/src/utils/media";
import ModeSwitchLogo from "@/src/components/ModeSwitchLogo";
import { usesSoloProfileLayout } from "@/src/state/slices/userSlice";
import { openBusinessSettingsScreen } from "@/src/utils/navigation";
import { useBusinessTrialDaysLeft } from "@/src/hooks/useBusinessTrialDaysLeft";
import GoldFrame from "@/src/components/GoldFrame";
import { useGoldFrames } from "@/src/hooks/useGoldFrames";
import { markGoldTapped, type GoldTapKey } from "@/src/utils/goldFrames";

const AVATAR_SIZE = 36;
/** Gold setup bars sit as rounded cards (client-approved sample 11-03) */
const GOLD_BAR_RADIUS = moderateWidthScale(12);

/**
 * Which setup banner is on show. Every tab mounts its own header, so this
 * lives outside the component to keep Home / Profile / Calendar in step.
 */
let selectedSetupBanner: string | null = null;
const setupBannerListeners = new Set<() => void>();
const setupBannerStore = {
  get: () => selectedSetupBanner,
  set: (key: string) => {
    if (key === selectedSetupBanner) return;
    selectedSetupBanner = key;
    setupBannerListeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    setupBannerListeners.add(listener);
    return () => {
      setupBannerListeners.delete(listener);
    };
  },
};
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
    // Setup banners: one card at a time, swipe + honey dots (user 11-05).
    // The pager clips, so the padding leaves room for the card's gold glow.
    slide: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
    },
    slideFill: {
      flexGrow: 1,
    },
    slideBanner: {
      flexGrow: 1,
      borderRadius: GOLD_BAR_RADIUS,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(4),
    },
    // Matches the banner's honey border: rings, the current one a filled pill
    dot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
    },
    dotActive: {
      width: moderateWidthScale(22),
      borderColor: theme.selectCard,
      backgroundColor: theme.selectCard,
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
  // Membership / cancellation policy bars stay until done; their glow stops
  // after the first tap (client 11-06).
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
    openBusinessSettingsScreen("servicesAndMemberships", usesSoloProfileLayout(businessStatus));
  }, [businessStatus]);

  const handleCancellationPolicySetup = useCallback(() => {
    openBusinessSettingsScreen("cancellationPolicy", usesSoloProfileLayout(businessStatus));
  }, [businessStatus]);

  const trialDaysLeft = useBusinessTrialDaysLeft(
    isOnboardedOwner && businessStatus?.has_subscription === true,
    `${businessStatus?.business_id ?? ""}:${businessStatus?.subscription_status ?? ""}:${businessStatus?.subscription_plan_name ?? ""}`,
  );

  const actionBanners = [
    showBusinessSubscriptipn && {
      key: "plan",
      task: null as GoldTapKey | null,
      glowing: false,
      icon: "briefcase" as const,
      title: t("pleaseBuyBusinessPlan"),
      cta: t("viewBusinessPlans"),
      onPress: handleBusinessSubscriptionPress,
    },
    trialDaysLeft !== null &&
      !dismissedReminders.includes("banner:trial") && {
      key: "trial",
      task: null as GoldTapKey | null,
      glowing: false,
      icon: "clock" as const,
      title:
        trialDaysLeft === 0
          ? t("freeTrialEndsToday")
          : t("freeTrialEndsInDays", { count: trialDaysLeft }),
      cta: t("managePlanCta"),
      onPress: clearOnPress("banner:trial", handleTrialPress),
    },
    isOnboardedOwner &&
      gold.isPending("membership") && {
        key: "createMembership",
        task: "membership" as GoldTapKey | null,
        glowing: gold.isFramed("membership"),
        icon: "gift" as const,
        title: t("setupCreateMembership"),
        cta: t("setupCreateMembershipCta"),
        onPress: handleMembershipSetup,
      },
    isOnboardedOwner &&
      gold.isPending("cancellationPolicy") && {
        key: "cancellationPolicy",
        task: "cancellationPolicy" as GoldTapKey | null,
        glowing: gold.isFramed("cancellationPolicy"),
        icon: "shield" as const,
        title: t("setupCancellationPolicy"),
        cta: t("setupCancellationPolicyCta"),
        onPress: handleCancellationPolicySetup,
      },
  ].filter(Boolean) as {
    key: string;
    /** Gold task the bar stands for: shown until the task is done */
    task: GoldTapKey | null;
    /** Setup bars glow until tapped once; plan / trial cards never glow */
    glowing: boolean;
    icon: "briefcase" | "clock" | "gift" | "shield";
    title: string;
    cta: string;
    onPress: () => void;
  }[];

  // All setup banners share one slot (user 11-05): one card at a time, the
  // owner swipes (no auto-slide), honey dots below when there are 2+.
  // Every card has the same gold ring; only untapped setup bars glow.
  // The card on show is shared by every tab's header, so coming back from a
  // banner's screen keeps that banner.
  const { width: screenWidth } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const selectedKey = useSyncExternalStore(
    setupBannerStore.subscribe,
    setupBannerStore.get,
  );
  const slideCount = actionBanners.length;
  // A banner that went away (feature done) falls back to the first one
  const activeSlide = Math.max(
    0,
    actionBanners.findIndex((b) => b.key === selectedKey),
  );
  const activeOffset = activeSlide * screenWidth;

  const syncCarousel = useCallback(() => {
    if (Math.abs(offsetRef.current - activeOffset) < 1) return;
    carouselRef.current?.scrollTo({ x: activeOffset, animated: false });
    offsetRef.current = activeOffset;
  }, [activeOffset]);

  // Another tab's header changed the banner, or one was removed
  useEffect(() => {
    syncCarousel();
  }, [syncCarousel, slideCount]);

  const renderSlide = (banner: (typeof actionBanners)[number]) => (
    <View key={banner.key} style={[styles.slide, { width: screenWidth }]}>
      <GoldFrame
        framed
        glowing={banner.glowing}
        radius={GOLD_BAR_RADIUS}
        borderWidth={1.5}
        glow="sm"
        style={styles.slideFill}
      >
        <TouchableOpacity
          onPress={() => {
            setupBannerStore.set(banner.key);
            // Membership / policy bars stop glowing once tapped (client 11-06)
            markGoldTapped(banner.task ?? undefined);
            banner.onPress();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${banner.title}. ${banner.cta}`}
          style={styles.slideFill}
        >
          <View style={[styles.actionBanner, styles.slideBanner]}>
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
      </GoldFrame>
    </View>
  );

  const bannerCarousel = (
    <View>
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        scrollEnabled={slideCount > 1}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: activeOffset, y: 0 }}
        onContentSizeChange={() => {
          // First layout: a fresh header (other tab) opens on the shared one
          offsetRef.current = -1;
          syncCarousel();
        }}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          offsetRef.current = x;
          const key = actionBanners[Math.round(x / screenWidth)]?.key;
          if (key) setupBannerStore.set(key);
        }}
      >
        {actionBanners.map(renderSlide)}
      </ScrollView>
      {slideCount > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {actionBanners.map((banner, i) => (
            <Animated.View
              key={banner.key}
              layout={LinearTransition.duration(250)}
              style={[styles.dot, i === activeSlide && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );

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

      {userRole === "business" && slideCount > 0 && bannerCarousel}
    </View>
  );
}

export default memo(DashboardHeader);
