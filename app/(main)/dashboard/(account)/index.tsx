import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
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
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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
    const languages: { [key: string]: string } = {
      en: "English",
      fr: "French",
      es: "Spanish",
    };
    return languages[code] || "English";
  };

  const handleLogout = async () => {
    if (isGuest) {
      await ApiService.logout();
      return;
    }

    Alert.alert(
      "Logout",
      `Are you sure you want to logout ?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            await ApiService.logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
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
                  "Success",
                  "Account deleted successfully",
                  "success",
                  2500
                );
                // Logout after successful deletion
                await ApiService.logout();
                router.replace(`/(main)/${MAIN_ROUTES.ROLE}`);
              }
            } catch (error: any) {
              showBanner(
                "Error",
                error?.message || "Failed to delete account",
                "error",
                2500
              );
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
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
      console.log("Account row pressed:", key);
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
      ? [{ key: "personal" as const, title: "Personal information" }]
      : []),
    ...((userRole === "business" || userRole === "staff") &&
    !isGuest &&
    !isCustomer
      ? userRole === "staff"
        ? [{ key: "availability" as const, title: "Set availability" }]
        : [{ key: "business" as const, title: "Business profile settings" }]
      : []),
    ...(isCustomer
      ? [
          {
            key: "country" as const,
            title: "Country",
            subtitle:
              countryName && countryName.trim().length > 0
                ? countryName
                : "Set country",
          },
        ]
      : []),
    {
      key: "language",
      title: "Language",
      subtitle: `Current language (${getLanguageName(currentLanguage)})`,
    },
    ...(userRole === "business" || isCustomer
      ? [{ key: "subscriptions" as const, title: "Subscription" }]
      : []),
    {
      key: "notifications",
      title: "Notification settings",
      subtitle: "Turned ON",
    },
    ...(isCustomer ? [{ key: "reviews" as const, title: "Reviews" }] : []),
    ...(userRole === "business" || userRole === "customer"
      ? [{ key: "aiTools" as const, title: "Ai Tools" }]
      : []),
    {
      key: "rules" as const,
      title: "Rules and terms",
    },
    { key: "logout", title: isGuest ? "Sign in" : "Log out" },
    ...(!isGuest ? [{ key: "delete" as const, title: "Delete account" }] : []),
  ];

  return (
    <View style={styles.container}>
      <DashboardHeader />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Account settings</Text>

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
