import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
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
  widthScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import DashboardHeaderClient from "@/src/components/DashboardHeaderClient";

const CARD_GAP = 10;
const CARD_WIDTH_PERCENT = "48%";

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
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(28),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    gridContainer: {
      marginTop: moderateHeightScale(18),
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(CARD_GAP),
    },
    gridItem: {
      width: CARD_WIDTH_PERCENT as any,
      maxWidth: widthScale(168),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(4),
      elevation: 2,
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      minHeight: moderateHeightScale(88),
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: moderateWidthScale(4),
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(6),
    },
    iconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(1),
    },
    cardSubtitle: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    cardHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    arrowCircle: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
    },
    newBadge: {
      backgroundColor: theme.green,
      paddingHorizontal: moderateWidthScale(5),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(4),
      marginRight: moderateWidthScale(4),
    },
    newBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    cardContent: {
      flex: 1,
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
  const currentLanguage = useAppSelector((state) => state.general.language);
  const countryName = user.countryName;

  const getLanguageName = (code: string) => {
    if (code === "en") return "English";
    if (code === "fr") return "French";
    if (code === "es") return "Spanish";
    return "English";
  };

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
                // Logout after successful deletion
                await ApiService.logout();
                router.replace(`/(main)/${MAIN_ROUTES.ROLE}`);
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
      router.push("./notificationSettings");
    } else if (key === "language") {
      router.push("./languageChange");
    } else if (key === "country") {
      router.push("./countryChange");
    } else if (key === "business") {
      router.push("./(businessProfileSettings)");
    } else if (key === "availability") {
      router.push("./staffAvailability");
    } else if (key === "reviews") {
      if (user.id) {
        router.push({
          pathname: "/(main)/userReviews",
          params: { business_id: user.id }, // Dummy business ID
        } as any);
      }
    } else if (key === "subscriptions") {
      router.push(isCustomer ? "./subscriptionCustomer" : "./subscription");
    } else if (key === "aiTools") {
      router.push("/(main)/aiTools/toolList");
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
      | "language"
      | "country"
      | "notifications"
      | "rules"
      | "reviews"
      | "subscriptions"
      | "aiTools"
      | "logout"
      | "delete";

    title: string;
    subtitle?: string;
  };

  const rows: Row[] = [
    ...(!isGuest
      ? [{ key: "personal" as const, title: t("personalInformation") }]
      : []),
    ...((userRole === "business" || userRole === "staff") &&
    !isGuest &&
    !isCustomer
      ? userRole === "staff"
        ? [{ key: "availability" as const, title: t("setAvailability") }]
        : [{ key: "business" as const, title: t("businessProfileSettings") }]
      : []),
    ...(isCustomer
      ? [
          {
            key: "country" as const,
            title: t("country"),
            subtitle:
              countryName && countryName.trim().length > 0
                ? countryName
                : t("setCountry"),
          },
        ]
      : []),
    {
      key: "language",
      title: t("language"),
      subtitle: getLanguageName(currentLanguage),
    },
    ...(userRole === "business" || isCustomer
      ? [{ key: "subscriptions" as const, title: t("subscription") }]
      : []),
    {
      key: "notifications",
      title: t("notificationSettings"),
      subtitle: t("turnedOn"),
    },
    ...(isCustomer ? [{ key: "reviews" as const, title: t("reviews") }] : []),
    ...(userRole === "business" || userRole === "customer"
      ? [{ key: "aiTools" as const, title: t("aiTools") }]
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

  const getIconForRow = (key: Row["key"]) => {
    const iconSize = moderateWidthScale(20);
    const iconColor = theme.darkGreen;
    const redColor = theme.red;
    switch (key) {
      case "personal":
        return (
          <MaterialIcons name="person" size={iconSize} color={iconColor} />
        );
      case "business":
        return <MaterialIcons name="store" size={iconSize} color={iconColor} />;
      case "availability":
        return (
          <MaterialIcons
            name="event-available"
            size={iconSize}
            color={iconColor}
          />
        );
      case "country":
        return (
          <MaterialIcons name="public" size={iconSize} color={iconColor} />
        );
      case "language":
        return (
          <MaterialIcons name="language" size={iconSize} color={iconColor} />
        );
      case "subscriptions":
        return (
          <MaterialCommunityIcons
            name="crown"
            size={iconSize}
            color={theme.orangeBrown}
          />
        );
      case "notifications":
        return (
          <MaterialIcons
            name="notifications"
            size={iconSize}
            color={iconColor}
          />
        );
      case "reviews":
        return (
          <MaterialIcons
            name="star"
            size={iconSize}
            color={theme.orangeBrown}
          />
        );
      case "aiTools":
        return (
          <MaterialIcons name="smart-toy" size={iconSize} color={iconColor} />
        );
      case "rules":
        return (
          <MaterialIcons name="description" size={iconSize} color={iconColor} />
        );
      case "logout":
        return <MaterialIcons name="login" size={iconSize} color={iconColor} />;
      case "delete":
        return (
          <MaterialIcons
            name="delete-outline"
            size={iconSize}
            color={redColor}
          />
        );
      default:
        return (
          <MaterialIcons name="settings" size={iconSize} color={iconColor} />
        );
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
        <Text style={styles.title}>{t("accountSettings")}</Text>

        <View style={styles.gridContainer}>
          {rows.map((row) => {
            const isDelete = row.key === "delete";
            const isLogout = row.key === "logout";
            const showNewBadge = row.key === "subscriptions";
            return (
              <View key={row.key} style={styles.gridItem}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleRowPress(row.key)}
                  style={[styles.card, styles.shadow]}
                  disabled={isDelete && deleteLoading}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      {getIconForRow(row.key)}
                    </View>
                    <View style={styles.cardHeaderRight}>
                      {showNewBadge && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                      <View style={styles.arrowCircle}>
                        {isDelete && deleteLoading ? (
                          <ActivityIndicator size="small" color={theme.red} />
                        ) : !isDelete && !isLogout ? (
                          <MaterialIcons
                            name="keyboard-arrow-right"
                            size={moderateWidthScale(14)}
                            color={theme.darkGreen}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text
                      style={[
                        styles.cardTitle,
                        isDelete && styles.deleteCardTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {row.title}
                    </Text>
                    {row.subtitle ? (
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
