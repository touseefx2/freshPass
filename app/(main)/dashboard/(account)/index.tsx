import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
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
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import DashboardHeaderClient from "@/src/components/DashboardHeaderClient";

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
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    placeholderText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginTop: moderateHeightScale(40),
    },
    listContainer: {
      marginTop: moderateHeightScale(24),
    },
    row: {
      paddingVertical: moderateHeightScale(14),
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    rowSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    rowDivider: {
      height: 1.1,
      backgroundColor: theme.borderLight,
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

        <View style={styles.listContainer}>
          {rows.map((row, index) => {
            const isDelete = row.key === "delete";
            const isLogout = row.key === "logout";
            return (
              <View key={row.key}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleRowPress(row.key)}
                  style={styles.row}
                  disabled={isDelete && deleteLoading}
                >
                  <View style={styles.rowHeader}>
                    <View>
                      <Text
                        style={[
                          styles.rowTitle,
                          isDelete && { color: theme.red },
                        ]}
                      >
                        {row.title}
                      </Text>
                      {row.subtitle ? (
                        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                      ) : null}
                    </View>
                    {isDelete && deleteLoading ? (
                      <ActivityIndicator size="small" color={theme.red} />
                    ) : !isDelete && !isLogout ? (
                      <MaterialIcons
                        name="keyboard-arrow-right"
                        size={moderateWidthScale(18)}
                        color={theme.darkGreen}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
                {index !== rows.length - 1 && (
                  <View style={styles.rowDivider} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
