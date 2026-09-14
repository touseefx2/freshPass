import React, { useMemo, useState } from "react";
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
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import DashboardHeaderClient from "@/src/components/DashboardHeaderClient";
import { openNotificationSettings } from "@/src/services/notificationPermissionService";

const CARD_WIDTH_PERCENT = "46.5%";

type IconVariant = "dark" | "accent" | "cream";
type IconFamily = "material" | "community";

function getIconVariant(index: number): IconVariant {
  const variants: IconVariant[] = ["dark", "accent", "cream"];
  return variants[index % 3];
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
  const iconSize = moderateWidthScale(24);
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
      {/* Soft drop shadow wrapper */}
      <View
        style={[
          styles.cardShadowWrap,
          pressed && styles.cardShadowWrapPressed,
        ]}
      >
        {/* Thickness base = real 3D depth */}
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
            {/* Single raised icon — soft shadow only */}
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
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>
        </View>
      </View>
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
      paddingTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(14),
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
    gridContainer: {
      marginTop: moderateHeightScale(14),
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: moderateHeightScale(16),
      columnGap: moderateWidthScale(10),
    },
    gridItem: {
      width: CARD_WIDTH_PERCENT as any,
    },
    cardShadowWrap: {
      borderRadius: moderateWidthScale(18),
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(4),
          },
          shadowOpacity: 0.14,
          shadowRadius: moderateWidthScale(7),
        },
        android: {
          elevation: 4,
          shadowColor: theme.darkGreen,
        },
        default: {
          shadowColor: theme.darkGreen,
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(4),
          },
          shadowOpacity: 0.14,
          shadowRadius: moderateWidthScale(7),
        },
      }),
    },
    cardShadowWrapPressed: {
      ...Platform.select({
        ios: {
          shadowOpacity: 0.07,
          shadowRadius: moderateWidthScale(3),
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(1),
          },
        },
        android: {
          elevation: 1,
        },
        default: {
          shadowOpacity: 0.07,
        },
      }),
    },
    // Darker base under face = visible 3D side
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
      borderTopColor: theme.white,
      borderLeftColor: theme.white,
      borderRightColor: theme.lightGreen1,
      borderBottomColor: theme.lightGreen13,
    },
    iconWrap: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(13),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(2),
          },
          shadowOpacity: 0.22,
          shadowRadius: moderateWidthScale(3),
        },
        android: {
          elevation: 3,
          shadowColor: theme.shadow,
        },
        default: {
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: moderateHeightScale(2),
          },
          shadowOpacity: 0.22,
          shadowRadius: moderateWidthScale(3),
        },
      }),
    },
    iconWrapCream: {
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      ...Platform.select({
        ios: {
          shadowOpacity: 0.12,
        },
        android: {
          elevation: 2,
        },
        default: {
          shadowOpacity: 0.12,
        },
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
  });

export default function AccountScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const isCustomer = user.userRole === "customer";
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const showStripeBanner =
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  const handleLogout = async () => {
    if (isGuest) {
      await ApiService.logout();
      return;
    }

    Alert.alert(
      t("logout"),
      t("areYouSureLogout"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
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
        {
          text: t("cancel"),
          style: "cancel",
        },
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
    } else if (key === "leaveRequest") {
      router.push("/(main)/leaveList");
    } else if (key === "customers") {
      router.push("./customers");
    } else if (key === "reviews") {
      if (user.id) {
        router.push({
          pathname: "/(main)/userReviews",
          params: { screenName: "customerReview" },
        } as any);
      }
    } else if (key === "subscriptions") {
      router.push(isCustomer ? "./subscriptionCustomer" : "./subscription");
    } else if (key === "aiTools") {
      router.push("/(main)/aiTools/toolList");
    } else if (key === "viewBusiness") {
      const businessId = user.business_id;
      if (!businessId) {
        return;
      }
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

  type Row = {
    key:
      | "personal"
      | "business"
      | "availability"
      | "leaveRequest"
      | "customers"
      | "language"
      | "country"
      | "notifications"
      | "rules"
      | "reviews"
      | "subscriptions"
      | "aiTools"
      | "viewBusiness"
      | "affiliationRequests"
      | "logout"
      | "delete";
    title: string;
  };

  const rows: Row[] = [
    ...(!isGuest
      ? [{ key: "personal" as const, title: t("personalInformation") }]
      : []),
    ...(userRole === "business" && !isGuest
      ? [
          {
            key: "business" as const,
            title: t("businessProfileSettings"),
          },
          {
            key: "customers" as const,
            title: t("customers"),
          },
        ]
      : []),
    ...(userRole === "staff" && !isGuest
      ? [{ key: "availability" as const, title: t("setAvailability") }]
      : []),
    ...(userRole === "business" || userRole === "customer"
      ? [{ key: "aiTools" as const, title: t("aiTools") }]
      : []),
    ...(isCustomer
      ? [{ key: "country" as const, title: t("country") }]
      : []),
    {
      key: "language",
      title: t("language"),
    },
    ...(userRole === "business" && !isGuest
      ? [{ key: "viewBusiness" as const, title: t("viewBusiness") }]
      : []),
    ...(userRole === "business" &&
    !isGuest &&
    businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliationRequests" as const,
            title: t("affiliationRequests"),
          },
        ]
      : []),
    ...((userRole === "business" || userRole === "staff") &&
    !isGuest &&
    !isCustomer
      ? [
          {
            key: "leaveRequest" as const,
            title: t("leaveRequest") || "Leave Request",
          },
        ]
      : []),
    {
      key: "notifications",
      title: t("notificationSettings"),
    },
    ...(isCustomer || (userRole === "business" && !showStripeBanner)
      ? [{ key: "subscriptions" as const, title: t("subscription") }]
      : []),
    ...(isCustomer
      ? [{ key: "reviews" as const, title: t("reviews") }]
      : []),
    {
      key: "rules" as const,
      title: t("rulesAndTerms"),
    },
    { key: "logout", title: isGuest ? t("signIn") : t("logOut") },
    ...(!isGuest
      ? [{ key: "delete" as const, title: t("deleteAccount") }]
      : []),
  ];

  const getIconMeta = (
    key: Row["key"],
  ): {
    name: string;
    family: IconFamily;
  } => {
    // Closest matches to design mock icons (filled soft glyphs)
    switch (key) {
      case "personal":
        return { name: "account", family: "community" };
      case "business":
        return { name: "storefront", family: "community" };
      case "availability":
        return { name: "calendar-clock", family: "community" };
      case "leaveRequest":
        return { name: "calendar-remove", family: "community" };
      case "customers":
        return { name: "account-multiple", family: "community" };
      case "country":
        return { name: "earth", family: "community" };
      case "language":
        return { name: "earth", family: "community" };
      case "subscriptions":
        return { name: "crown", family: "community" };
      case "notifications":
        return { name: "bell", family: "community" };
      case "reviews":
        return { name: "star", family: "community" };
      case "viewBusiness":
        return { name: "eye", family: "community" };
      case "affiliationRequests":
        return { name: "handshake", family: "community" };
      case "aiTools":
        // Same icon as AI Requests / AI Results header (top-right)
        return { name: "smart-toy", family: "material" };
      case "rules":
        return { name: "file-document-outline", family: "community" };
      case "logout":
        return { name: "logout", family: "community" };
      case "delete":
        return { name: "trash-can-outline", family: "community" };
      default:
        return { name: "cog", family: "community" };
    }
  };

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
    </View>
  );
}
