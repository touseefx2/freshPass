import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import DashboardHeader from "@/src/components/DashboardHeader";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
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

type IconFamily = "material" | "community";

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
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(10),
      gap: moderateWidthScale(12),
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.12,
          shadowRadius: moderateWidthScale(6),
        },
        android: { elevation: 3, shadowColor: theme.darkGreen },
      }),
    },
    profileImageWrapper: {
      width: widthScale(70),
      height: widthScale(70),
      borderRadius: widthScale(35),
      overflow: "hidden",
    },
    profileImage: {
      width: "100%",
      height: "100%",
    },
    profileInfoCol: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    profileName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    profileEmail: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(6),
    },
    profileCategory: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    listContainer: {
      marginTop: moderateHeightScale(14),
      gap: moderateHeightScale(0),
    },
    rowItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(4),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen1,
      gap: moderateWidthScale(14),
    },
    rowIconWrap: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      alignItems: "center",
      justifyContent: "center",
    },
    rowTextCol: {
      flex: 1,
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    rowSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
    rowDeleteTitle: {
      color: theme.red,
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
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const showStripeBanner =
    userRole === "business" &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  const profileImageUri = user?.profile_image_url
    ? user.profile_image_url.startsWith("http://") ||
      user.profile_image_url.startsWith("https://")
      ? user.profile_image_url
      : process.env.EXPO_PUBLIC_API_BASE_URL + user.profile_image_url
    : "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";
  const userName = user.name || "";
  const userEmailDisplay = user.email || "";

  const handleEditProfile = useCallback(() => {
    router.push("./(profile)/editProfile");
  }, [router]);

  const handleChangePassword = useCallback(() => {
    router.push("./(profile)/changePassword");
  }, [router]);

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
    if (key === "rules") {
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
    } else if (key === "changePassword") {
      handleChangePassword();
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
      | "uploadWork"
      | "leaveRequest"
      | "customers"
      | "followers"
      | "language"
      | "country"
      | "notifications"
      | "rules"
      | "reviews"
      | "myLooks"
      | "following"
      | "subscriptions"
      | "mediaLibrary"
      | "aiTools"
      | "viewBusiness"
      | "affiliationRequests"
      | "changePassword"
      | "logout"
      | "delete";
    title: string;
    subtitle?: string;
  };

  const rows: Row[] = [
    ...(userRole === "business" && !isGuest
      ? [
          {
            key: "business" as const,
            title: t("businessProfileSettings"),
            subtitle: t("manageBusinessProfile") || "Manage your business settings.",
          },
          {
            key: "customers" as const,
            title: t("customers"),
            subtitle: t("manageCustomers") || "View and manage your customers.",
          },
          {
            key: "followers" as const,
            title: t("followers"),
            subtitle: t("manageFollowers") || "See who follows your business.",
          },
          {
            key: "uploadWork" as const,
            title: t("uploadYourWork"),
            subtitle: t("uploadWorkSubtitle") || "Showcase your work and portfolio.",
          },
        ]
      : []),
    ...(userRole === "staff" && !isGuest
      ? [
          {
            key: "availability" as const,
            title: t("setAvailability"),
            subtitle: t("setAvailabilitySubtitle") || "Set your available hours.",
          },
          {
            key: "uploadWork" as const,
            title: t("uploadYourWork"),
            subtitle: t("uploadWorkSubtitle") || "Showcase your work and portfolio.",
          },
        ]
      : []),
    ...(userRole === "business"
      ? [{ key: "mediaLibrary" as const, title: t("mediaLibrary"), subtitle: t("mediaLibrarySubtitle") || "Manage your media content." }]
      : []),
    ...(userRole === "business" || userRole === "customer"
      ? [{ key: "aiTools" as const, title: t("aiTools"), subtitle: t("aiToolsSubtitle") || "AI-powered tools and features." }]
      : []),
    ...(isCustomer
      ? [{ key: "country" as const, title: t("country"), subtitle: t("countrySubtitle") || "Set your country preference." }]
      : []),
    {
      key: "language",
      title: t("language"),
      subtitle: t("languageSubtitle") || "Choose your preferred language.",
    },
    ...(userRole === "business" && !isGuest
      ? [{ key: "viewBusiness" as const, title: t("viewBusiness"), subtitle: t("viewBusinessSubtitle") || "Preview your public business page." }]
      : []),
    ...(userRole === "business" &&
    !isGuest &&
    businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliationRequests" as const,
            title: t("affiliationRequests"),
            subtitle: t("affiliationRequestsSubtitle") || "Manage staff affiliation requests.",
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
            subtitle: t("leaveRequestSubtitle") || "Request or manage time off.",
          },
        ]
      : []),
    {
      key: "notifications",
      title: t("notificationSettings"),
      subtitle: t("notificationSettingsSubtitle") || "Manage your notification preferences.",
    },
    ...(isCustomer || (userRole === "business" && !showStripeBanner)
      ? [{ key: "subscriptions" as const, title: t("subscription"), subtitle: t("subscriptionSubtitle") || "Manage your subscription plan." }]
      : []),
    ...(isCustomer
      ? [{ key: "reviews" as const, title: t("reviews"), subtitle: t("reviewsSubtitle") || "View and respond to reviews." }]
      : []),
    ...(isCustomer && !isGuest
      ? [{ key: "myLooks" as const, title: t("myLooks"), subtitle: t("myLooksSubtitle") || "Your saved looks and styles." }]
      : []),
    ...(isCustomer && !isGuest
      ? [{ key: "following" as const, title: t("following"), subtitle: t("followingSubtitle") || "Businesses you follow." }]
      : []),
    {
      key: "rules" as const,
      title: t("rulesAndTerms"),
      subtitle: t("rulesSubtitle") || "View rules, terms and policies.",
    },
    ...(!isGuest
      ? [{ key: "changePassword" as const, title: t("changePassword"), subtitle: t("changePasswordSubtitle") || "Update your account password." }]
      : []),
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
    // Match client design image icons as closely as possible
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
        // Same robot icon as AI Requests / Results header
        return { name: "smart-toy", family: "material" };
      case "changePassword":
        return { name: "lock", family: "material" };
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

        {!isGuest && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditProfile}
            style={styles.profileCard}
          >
            <View style={styles.profileImageWrapper}>
              <AppImage
                uri={profileImageUri}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{userEmailDisplay}</Text>
              
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        )}

        <View style={styles.listContainer}>
          {rows.map((row) => {
            const isDelete = row.key === "delete";
            const isLogout = row.key === "logout";
            const iconMeta = getIconMeta(row.key);
            const iconColor = isDelete
              ? theme.red
              : theme.darkGreen;

            return (
              <TouchableOpacity
                key={row.key}
                activeOpacity={0.6}
                onPress={() => handleRowPress(row.key)}
                disabled={isDelete && deleteLoading}
                style={styles.rowItem}
              >
                <View style={styles.rowIconWrap}>
                  {isDelete && deleteLoading ? (
                    <ActivityIndicator size="small" color={theme.red} />
                  ) : iconMeta.family === "community" ? (
                    <MaterialCommunityIcons
                      name={iconMeta.name as any}
                      size={moderateWidthScale(24)}
                      color={iconColor}
                    />
                  ) : (
                    <MaterialIcons
                      name={iconMeta.name as any}
                      size={moderateWidthScale(24)}
                      color={iconColor}
                    />
                  )}
                </View>
                <View style={styles.rowTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      isDelete && styles.rowDeleteTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {row.title}
                  </Text>
                  {row.subtitle ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {row.subtitle}
                    </Text>
                  ) : null}
                </View>
                {!isLogout && !isDelete && (
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateWidthScale(22)}
                    color={theme.lightGreen5}
                  />
                )}
              </TouchableOpacity>
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
