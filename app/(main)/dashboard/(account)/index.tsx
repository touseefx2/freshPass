import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import DashboardHeader from "@/src/components/DashboardHeader";
import { MaterialIcons, MaterialCommunityIcons, Entypo } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import DashboardHeaderClient from "@/src/components/DashboardHeaderClient";
import { openNotificationSettings } from "@/src/services/notificationPermissionService";
import {
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import {
  isBusinessSubscriptionActive,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import { Image } from "expo-image";
import {
  fetchStaffBusinessSummary,
  type StaffBusinessSummary,
} from "@/src/services/staffBusinessService";

const CARD_WIDTH_PERCENT = "48%";

type IconVariant = "dark" | "accent" | "cream";
type IconFamily = "material" | "community";

function getIconVariant(index: number): IconVariant {
  const variants: IconVariant[] = ["dark", "accent", "cream"];
  return variants[index % 3];
}

/* ── Grid card used by non-business roles ── */
/** Staff: the business they work for (name from the store, logo + category from the API). */
function StaffBusinessCard({
  name,
  summary,
  loading,
  onPress,
  theme,
  styles,
}: {
  name: string;
  summary: StaffBusinessSummary | null;
  loading: boolean;
  onPress?: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);
  const category = summary?.category?.name;
  const label = [t("staffWorksAt"), name, category].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole={onPress ? "button" : "summary"}
      accessibilityLabel={label}
      accessibilityHint={onPress ? t("staffWorksAtHint") : undefined}
      style={[
        styles.cardShadowWrap,
        styles.worksAtShadow,
        pressed && styles.cardShadowWrapPressed,
      ]}
    >
      <View style={[styles.worksAtCard, pressed && styles.worksAtCardPressed]}>
        <View style={styles.worksAtLogo}>
          {summary?.logoUrl ? (
            <Image
              source={{ uri: summary.logoUrl }}
              style={styles.worksAtLogoImage}
              contentFit="cover"
              transition={150}
              accessible={false}
            />
          ) : (
            <MaterialIcons
              name="storefront"
              size={moderateWidthScale(24)}
              color={theme.white}
            />
          )}
        </View>

        <View style={styles.worksAtBody}>
          <Text style={styles.worksAtOverline}>{t("staffWorksAt")}</Text>
          <Text style={styles.worksAtName} numberOfLines={1}>
            {name}
          </Text>
          {category ? (
            <View style={styles.worksAtChip}>
              <MaterialIcons
                name="sell"
                size={moderateWidthScale(12)}
                color={theme.selectCard}
              />
              <Text style={styles.worksAtChipText} numberOfLines={1}>
                {category}
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.worksAtChipPlaceholder} />
          ) : null}
        </View>

        {onPress ? (
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(22)}
            color={theme.lightGreen}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function ProfileSettingCard({
  title,
  iconName,
  iconFamily = "community",
  onPress,
  disabled,
  isDelete,
  loading,
  theme,
  styles,
  iconVariant,
}: {
  title: string;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] | string;
  iconFamily?: IconFamily;
  onPress: () => void;
  disabled?: boolean;
  isDelete?: boolean;
  loading?: boolean;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  iconVariant: IconVariant;
}) {
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(27);
  const thickness = moderateHeightScale(2.5);
  const radius = moderateWidthScale(18);

  const iconBg =
    isDelete
      ? theme.lightRed
      : iconVariant === "dark"
        ? theme.darkGreen
        : iconVariant === "accent"
          ? theme.selectCard
          : theme.orangeBrown015;

  const iconColor =
    isDelete
      ? theme.red
      : iconVariant === "cream"
        ? theme.darkGreen
        : theme.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.gridItem}
    >
      <View
        style={[
          styles.cardShadowWrap,
          pressed && styles.cardShadowWrapPressed,
        ]}
      >
        <View
          style={[
            styles.cardBase,
            {
              borderRadius: radius,
              paddingBottom: pressed ? moderateHeightScale(1) : thickness,
              transform: [
                {
                  translateY: pressed
                    ? thickness - moderateHeightScale(1)
                    : 0,
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.cardFace,
              {
                borderRadius: radius,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: iconBg },
                iconVariant === "cream" && !isDelete && styles.iconWrapCream,
                isDelete && styles.iconWrapDelete,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.red} />
              ) : iconFamily === "community" ? (
                <MaterialCommunityIcons
                  name={
                    iconName as React.ComponentProps<
                      typeof MaterialCommunityIcons
                    >["name"]
                  }
                  size={iconSize}
                  color={iconColor}
                />
              ) : (
                <MaterialIcons
                  name={
                    iconName as React.ComponentProps<
                      typeof MaterialIcons
                    >["name"]
                  }
                  size={iconSize}
                  color={iconColor}
                />
              )}
            </View>

            <Text
              style={[styles.cardTitle, isDelete && styles.deleteCardTitle]}
              numberOfLines={3}
            >
              {title}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ── Big nav card for business Profile page ── */
function ProfileNavCard({
  title,
  subtitle,
  badgeText,
  iconName,
  iconFamily = "material",
  iconVariant,
  onPress,
  theme,
  styles,
}: {
  title: string;
  subtitle: string;
  badgeText?: string;
  iconName: string;
  iconFamily?: IconFamily;
  iconVariant: IconVariant;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(28);
  const thickness = moderateHeightScale(2.5);
  const radius = moderateWidthScale(18);

  const iconBg =
    iconVariant === "dark"
      ? theme.darkGreen
      : iconVariant === "accent"
        ? theme.selectCard
        : theme.orangeBrown015;
  const iconColor =
    iconVariant === "cream" ? theme.darkGreen : theme.white;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.navCardPressable}
    >
      <View
        style={[
          styles.cardShadowWrap,
          pressed && styles.cardShadowWrapPressed,
        ]}
      >
        <View
          style={[
            styles.cardBase,
            {
              borderRadius: radius,
              paddingBottom: pressed ? moderateHeightScale(1) : thickness,
              transform: [
                {
                  translateY: pressed
                    ? thickness - moderateHeightScale(1)
                    : 0,
                },
              ],
            },
          ]}
        >
          <View style={[styles.navCardFace, { borderRadius: radius }]}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: iconBg },
                iconVariant === "cream" && styles.iconWrapCream,
              ]}
            >
              {iconFamily === "community" ? (
                <MaterialCommunityIcons
                  name={
                    iconName as React.ComponentProps<
                      typeof MaterialCommunityIcons
                    >["name"]
                  }
                  size={iconSize}
                  color={iconColor}
                />
              ) : (
                <MaterialIcons
                  name={
                    iconName as React.ComponentProps<
                      typeof MaterialIcons
                    >["name"]
                  }
                  size={iconSize}
                  color={iconColor}
                />
              )}
            </View>

            <View style={styles.navCardTextBlock}>
              <Text style={styles.navCardTitle} numberOfLines={1}>
                {title}
              </Text>
              {badgeText ? (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>{badgeText}</Text>
                </View>
              ) : null}
              <Text style={styles.navCardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            <Entypo
              name="chevron-small-right"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ── Settings list row for business Profile page ── */
function SettingsRow({
  title,
  iconName,
  iconFamily = "material",
  iconVariant,
  onPress,
  disabled,
  isDelete,
  loading,
  theme,
  styles,
}: {
  title: string;
  iconName: string;
  iconFamily?: IconFamily;
  iconVariant: IconVariant;
  onPress: () => void;
  disabled?: boolean;
  isDelete?: boolean;
  loading?: boolean;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(22);

  const iconBg =
    isDelete
      ? theme.lightRed
      : iconVariant === "dark"
        ? theme.darkGreen
        : iconVariant === "accent"
          ? theme.selectCard
          : theme.orangeBrown015;
  const iconColor =
    isDelete
      ? theme.red
      : iconVariant === "cream"
        ? theme.darkGreen
        : theme.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.settingsRow,
        pressed && styles.settingsRowPressed,
        isDelete && styles.settingsRowDelete,
      ]}
    >
      <View
        style={[
          styles.settingsRowIcon,
          { backgroundColor: iconBg },
          isDelete && styles.iconWrapDelete,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.red} />
        ) : iconFamily === "community" ? (
          <MaterialCommunityIcons
            name={
              iconName as React.ComponentProps<
                typeof MaterialCommunityIcons
              >["name"]
            }
            size={iconSize}
            color={iconColor}
          />
        ) : (
          <MaterialIcons
            name={
              iconName as React.ComponentProps<typeof MaterialIcons>["name"]
            }
            size={iconSize}
            color={iconColor}
          />
        )}
      </View>

      <Text
        style={[styles.settingsRowTitle, isDelete && styles.deleteCardTitle]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Entypo
        name="chevron-small-right"
        size={moderateWidthScale(22)}
        color={isDelete ? theme.red : theme.darkGreen}
      />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
    },
    headerBlock: {
      marginBottom: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(2),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(8),
    },

    /* ── Staff: works-at card ── */
    worksAtShadow: {
      marginTop: moderateHeightScale(6),
    },
    worksAtCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.background,
    },
    worksAtCardPressed: {
      backgroundColor: theme.orangeBrown015,
    },
    worksAtLogo: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    worksAtLogoImage: {
      width: "100%",
      height: "100%",
    },
    worksAtBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(3),
    },
    worksAtOverline: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    worksAtName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    worksAtChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      maxWidth: "100%",
      marginTop: moderateHeightScale(2),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown015,
    },
    worksAtChipText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    worksAtChipPlaceholder: {
      width: moderateWidthScale(72),
      height: moderateHeightScale(20),
      marginTop: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen1,
    },

    /* ── Grid (non-business roles) ── */
    gridContainer: {
      marginTop: moderateHeightScale(14),
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: moderateHeightScale(10),
      columnGap: moderateWidthScale(8),
    },
    gridItem: {
      width: CARD_WIDTH_PERCENT as any,
    },

    /* ── Shared card primitives ── */
    cardShadowWrap: {
      borderRadius: moderateWidthScale(18),
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(8),
        },
        android: {
          elevation: 5,
          shadowColor: theme.darkGreen,
        },
        default: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(8),
        },
      }),
    },
    cardShadowWrapPressed: {
      ...Platform.select({
        ios: {
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(4),
        },
        android: { elevation: 2 },
        default: { shadowOpacity: 0.1 },
      }),
    },
    cardBase: {
      backgroundColor: theme.lightGreen16,
    },
    cardFace: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(18),
      minHeight: moderateHeightScale(90),
      gap: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    iconWrap: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(13),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: moderateWidthScale(4),
        },
        android: { elevation: 0 },
        default: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: moderateWidthScale(4),
        },
      }),
    },
    iconWrapCream: {
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      ...Platform.select({
        ios: { shadowOpacity: 0.12 },
        android: { elevation: 0 },
        default: { shadowOpacity: 0.12 },
      }),
    },
    iconWrapDelete: {
      borderWidth: 1,
      borderColor: theme.lightRed30,
    },
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size17,
    },
    deleteCardTitle: {
      color: theme.red,
    },

    /* ── Big nav cards (business layout) ── */
    navCardsBlock: {
      marginTop: moderateHeightScale(10),
      gap: moderateHeightScale(10),
    },
    navCardPressable: {
      width: "100%",
    },
    navCardFace: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(18),
      minHeight: moderateHeightScale(90),
      gap: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    navCardTextBlock: {
      flex: 1,
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    navCardTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    navCardSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    ownerBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(5),
    },
    ownerBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    /* ── Settings list rows (business layout) ── */
    sectionHeaderBlock: {
      marginTop: moderateHeightScale(18),
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(2),
    },
    sectionHeaderText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    settingsListBlock: {
      gap: moderateHeightScale(8),
    },
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      gap: moderateWidthScale(10),
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(4),
        },
        android: {
          elevation: 2,
          shadowColor: theme.darkGreen,
        },
        default: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(4),
        },
      }),
    },
    settingsRowPressed: {
      opacity: 0.7,
    },
    settingsRowDelete: {
      borderColor: theme.lightRed30,
    },
    settingsRowIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    settingsRowTitle: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function AccountScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);

  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const isCustomer = user.userRole === "customer";
  const isStaff = userRole === "staff" && !isGuest;
  const [staffBusiness, setStaffBusiness] =
    useState<StaffBusinessSummary | null>(null);
  const [staffBusinessLoading, setStaffBusinessLoading] = useState(isStaff);

  useEffect(() => {
    if (!isStaff) return;
    let active = true;
    setStaffBusinessLoading(true);
    fetchStaffBusinessSummary(user.business_id)
      .then((data) => {
        if (active) setStaffBusiness(data);
      })
      .catch((error) => {
        Logger.error("Failed to load staff business:", error);
      })
      .finally(() => {
        if (active) setStaffBusinessLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isStaff, user.business_id]);
  const isBusiness = userRole === "business" && !isGuest;
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const showStripeBanner =
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  const handleViewPlans = useCallback(() => {
    setBuyPlanModalVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const ensureCanUploadWork = useCallback((): boolean => {
    if (userRole !== "business") return true;
    if (!isStripeOnboardingCompleted(businessStatus)) {
      dispatch(setStripeConnectModalVisible(true));
      return false;
    }
    if (!isBusinessSubscriptionActive(businessStatus)) {
      setBuyPlanModalVisible(true);
      return false;
    }
    return true;
  }, [businessStatus, dispatch, userRole]);

  const handleLogout = async () => {
    if (isGuest) {
      await ApiService.logout();
      return;
    }

    Alert.alert(
      t("logout"),
      t("areYouSureLogout"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("yes"),
          onPress: async () => {
            await ApiService.logout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t("deleteAccountTitle"),
      t("areYouSureDelete"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              const response = await ApiService.delete<{
                success: boolean;
                message: string;
              }>(userEndpoints.deleteAccount);

              if (response.success) {
                showBanner(
                  t("success"),
                  t("accountDeletedSuccessfully"),
                  "success",
                  2500,
                );
                await ApiService.logoutWithoutApi();
              }
            } catch (error: any) {
              showBanner(
                t("error"),
                error?.message || t("failedToDeleteAccount"),
                "error",
                2500,
              );
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleRowPress = async (key: string) => {
    if (key === "personal") {
      router.push("./(profile)");
    } else if (key === "barberProfile") {
      router.push("./barberProfile");
    } else if (key === "rules") {
      router.push("./rulesAndTerms");
    } else if (key === "notifications") {
      await openNotificationSettings();
    } else if (key === "language") {
      router.push("./languageChange");
    } else if (key === "country") {
      router.push("./countryChange");
    } else if (key === "business") {
      router.push("./(businessProfileSettings)");
    } else if (key === "availability") {
      router.push("./staffAvailability");
    } else if (key === "uploadWork") {
      if (!ensureCanUploadWork()) return;
      router.push("./staffWorkImages");
    } else if (key === "leaveRequest") {
      router.push("/(main)/leaveList");
    } else if (key === "customers") {
      router.push("./customers");
    } else if (key === "followers") {
      router.push("./followers");
    } else if (key === "reviews") {
      if (user.id) {
        router.push({
          pathname: "/(main)/userReviews",
          params: { screenName: "customerReview" },
        } as any);
      }
    } else if (key === "myOrders") {
      router.push("/(main)/shop/myOrders" as any);
    } else if (key === "myLooks") {
      router.push("/(main)/myLooks");
    } else if (key === "following") {
      router.push("/(main)/dashboard/(home)/favourite" as any);
    } else if (key === "subscriptions") {
      router.push(isCustomer ? "./subscriptionCustomer" : "./subscription");
    } else if (key === "mediaLibrary") {
      router.push("/(main)/aiTools/toolList");
    } else if (key === "aiTools") {
      router.push({
        pathname: "/(main)/aiTools/toolList",
        params: { mode: "aiTools" },
      });
    } else if (key === "viewBusiness") {
      const businessId = user.business_id;
      if (!businessId) return;
      router.push({
        pathname: "/(main)/businessDetail",
        params: { business_id: businessId.toString() },
      } as any);
    } else if (key === "affiliationRequests") {
      router.push(
        "/(main)/dashboard/(account)/(businessProfileSettings)/affiliationRequests",
      );
    } else if (key === "logout") {
      handleLogout();
    } else if (key === "delete") {
      handleDeleteAccount();
    } else {
      Logger.log("Account row pressed:", key);
    }
  };

  /* ── Icon lookup ── */
  const getIconMeta = (
    key: string,
  ): { name: string; family: IconFamily } => {
    switch (key) {
      case "personal":
        return { name: "person", family: "material" };
      case "business":
        return { name: "storefront", family: "material" };
      case "availability":
        return { name: "event-available", family: "material" };
      case "uploadWork":
        return { name: "photo-library", family: "material" };
      case "leaveRequest":
        return { name: "event-busy", family: "material" };
      case "customers":
        return { name: "people", family: "material" };
      case "followers":
        return { name: "group", family: "material" };
      case "country":
        return { name: "public", family: "material" };
      case "language":
        return { name: "language", family: "material" };
      case "subscriptions":
        return { name: "crown", family: "community" };
      case "notifications":
        return { name: "notifications", family: "material" };
      case "reviews":
        return { name: "star", family: "material" };
      case "myOrders":
        return { name: "receipt-long", family: "material" };
      case "myLooks":
        return { name: "bookmark", family: "material" };
      case "following":
        return { name: "person-add", family: "material" };
      case "viewBusiness":
        return { name: "visibility", family: "material" };
      case "affiliationRequests":
        return { name: "handshake", family: "community" };
      case "mediaLibrary":
        return { name: "video-library", family: "material" };
      case "aiTools":
        return { name: "smart-toy", family: "material" };
      case "rules":
        return { name: "description", family: "material" };
      case "logout":
        return { name: "logout", family: "material" };
      case "delete":
        return { name: "delete-outline", family: "material" };
      default:
        return { name: "settings", family: "material" };
    }
  };

  /* ════════════════════════════════════════════════
     Business owner layout
     ════════════════════════════════════════════════ */
  if (isBusiness) {
    type SettingsRowItem = {
      key: string;
      title: string;
      isDelete?: boolean;
    };

    const accountSettingsRows: SettingsRowItem[] = [
      { key: "language", title: t("language") },
      { key: "notifications", title: t("notificationSettings") },
      { key: "rules", title: t("rulesAndTerms") },
      { key: "logout", title: t("logOut") },
      { key: "delete", title: t("deleteAccount"), isDelete: true },
    ];

    return (
      <View style={styles.container}>
        <DashboardHeader />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{t("profilePageTitle")}</Text>
            <Text style={styles.subtitle}>{t("profilePageSubtitle")}</Text>
          </View>

          {/* Two big nav cards */}
          <View style={styles.navCardsBlock}>
            <ProfileNavCard
              title={t("myBarberProfile")}
              subtitle={t("barberProfileSubtitle")}
              badgeText={t("owner")}
              iconName="person"
              iconVariant="dark"
              onPress={() => handleRowPress("barberProfile")}
              theme={theme}
              styles={styles}
            />
            <ProfileNavCard
              title={t("businessManagement")}
              subtitle={t("businessManagementSubtitle")}
              iconName="storefront"
              iconVariant="accent"
              onPress={() => handleRowPress("business")}
              theme={theme}
              styles={styles}
            />
          </View>

          {/* Account settings section */}
          <View style={styles.sectionHeaderBlock}>
            <Text style={styles.sectionHeaderText}>
              {t("accountSettings")}
            </Text>
          </View>

          <View style={styles.settingsListBlock}>
            {accountSettingsRows.map((row, index) => {
              const iconMeta = getIconMeta(row.key);
              return (
                <SettingsRow
                  key={row.key}
                  title={row.title}
                  iconName={iconMeta.name}
                  iconFamily={iconMeta.family}
                  iconVariant={getIconVariant(index)}
                  onPress={() => handleRowPress(row.key)}
                  disabled={row.isDelete && deleteLoading}
                  isDelete={row.isDelete}
                  loading={row.isDelete && deleteLoading}
                  theme={theme}
                  styles={styles}
                />
              );
            })}
          </View>
        </ScrollView>

        <BuyBusinessPlanModal
          visible={buyPlanModalVisible}
          onClose={() => setBuyPlanModalVisible(false)}
          onViewPlans={handleViewPlans}
        />
      </View>
    );
  }

  /* ════════════════════════════════════════════════
     Non-business layout (customer / staff / guest)
     — unchanged grid
     ════════════════════════════════════════════════ */
  type Row = {
    key: string;
    title: string;
  };

  const rows: Row[] = [
    ...(!isGuest
      ? [{ key: "personal", title: t("personalInformation") }]
      : []),
    ...(userRole === "staff" && !isGuest
      ? [
          { key: "availability", title: t("setAvailability") },
          { key: "uploadWork", title: t("uploadYourWork") },
          // Staff post reels for the business within the owner's monthly number
          { key: "mediaLibrary", title: t("mediaLibrary") },
          // AI reel requests + generate reel live inside AI Tools
          { key: "aiTools", title: t("aiTools") },
        ]
      : []),
    ...(isCustomer
      ? [{ key: "country", title: t("country") }]
      : []),
    ...(isCustomer
      ? [{ key: "aiTools", title: t("aiTools") }]
      : []),
    { key: "language", title: t("language") },
    ...((userRole === "staff") && !isGuest && !isCustomer
      ? [{ key: "leaveRequest", title: t("leaveRequest") || "Leave Request" }]
      : []),
    { key: "notifications", title: t("notificationSettings") },
    // Products bought from reels, with their tracking
    ...(isCustomer && !isGuest
      ? [{ key: "myOrders", title: t("myOrders") }]
      : []),
    ...(isCustomer
      ? [{ key: "subscriptions", title: t("subscription") }]
      : []),
    ...(isCustomer
      ? [{ key: "reviews", title: t("reviews") }]
      : []),
    ...(isCustomer && !isGuest
      ? [{ key: "myLooks", title: t("myLooks") }]
      : []),
    ...(isCustomer && !isGuest
      ? [{ key: "following", title: t("following") }]
      : []),
    { key: "rules", title: t("rulesAndTerms") },
    { key: "logout", title: isGuest ? t("signIn") : t("logOut") },
    ...(!isGuest
      ? [{ key: "delete", title: t("deleteAccount") }]
      : []),
  ];

  return (
    <View style={styles.container}>
      {userRole === "customer" || isGuest ? (
        <DashboardHeaderClient />
      ) : (
        <DashboardHeader />
      )}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{t("accountSettings")}</Text>
          <Text style={styles.subtitle}>
            {t("manageAccountPreferences")}
          </Text>
        </View>

        {isStaff && (staffBusiness?.name || user.business_name) ? (
          <StaffBusinessCard
            name={staffBusiness?.name || user.business_name || ""}
            summary={staffBusiness}
            loading={staffBusinessLoading}
            // Tap to open the business profile — off for now (no onPress = no chevron, not tappable)
            // onPress={
            //   user.business_id || staffBusiness?.id
            //     ? () =>
            //         router.push({
            //           pathname: "/(main)/businessDetail",
            //           params: {
            //             business_id: String(
            //               user.business_id || staffBusiness?.id,
            //             ),
            //           },
            //         } as any)
            //     : undefined
            // }
            theme={theme}
            styles={styles}
          />
        ) : null}

        <View style={styles.gridContainer}>
          {rows.map((row, index) => {
            const isDelete = row.key === "delete";
            const iconMeta = getIconMeta(row.key);
            return (
              <ProfileSettingCard
                key={row.key}
                title={row.title}
                iconName={iconMeta.name}
                iconFamily={iconMeta.family}
                onPress={() => handleRowPress(row.key)}
                disabled={isDelete && deleteLoading}
                isDelete={isDelete}
                loading={isDelete && deleteLoading}
                theme={theme}
                styles={styles}
                iconVariant={getIconVariant(index)}
              />
            );
          })}
        </View>
      </ScrollView>

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />
    </View>
  );
}
