import React, { useMemo, useState, useCallback, useRef } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { canShowStaffManagement } from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { resolveApiImageUrl } from "@/src/utils/media";
import { getDefaultBusinessLogo } from "@/src/services/remoteConfigService";

type IconFamily = "material" | "community";

type SettingKey =
  | "businessLocation"
  | "description"
  | "availability"
  | "services"
  | "cancellationPolicy"
  | "subscriptions"
  | "team"
  | "socialMedia"
  | "portfolio"
  | "products";

type SettingItem = {
  key: SettingKey;
  title: string;
  subtitle: string;
};

interface BusinessProfileData {
  title: string;
  slogan: string;
  logo_url: string | null;
  country_code?: string | null;
  phone?: string | null;
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
      lineHeight: fontSize.size18,
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
      marginBottom: moderateHeightScale(6),
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
      width: widthScale(60),
      height: widthScale(60),
      borderRadius: widthScale(30),
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
      textTransform:"capitalize"
    },
    profileEmail: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    profilePhone: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    profileCategory: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.selectCard,
      marginTop: moderateHeightScale(2),
      textTransform: "uppercase",
    },
    listContainer: {
      marginTop: moderateHeightScale(14),
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
    profileLoading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
      marginBottom: moderateHeightScale(6),
    },
  });

export default function BusinessProfileSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);
  const user = useAppSelector((state) => state.user);
  const showManageTeam = canShowStaffManagement(businessStatus);
  const isBusinessOwner = userRole === "business";
  const businessCategoryName = businessStatus?.business_category?.name;

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState<BusinessProfileData | null>(
    null,
  );
  const hasFetchedOnce = useRef(false);

  const fetchBusinessProfile = useCallback(async () => {
    if (!hasFetchedOnce.current) setProfileLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: BusinessProfileData;
      }>(businessEndpoints.moduleData("business-profile"));

      if (response.success && response.data) {
        setProfileData(response.data);
        hasFetchedOnce.current = true;
      }
    } catch (error: any) {
      Logger.error("Failed to fetch business profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBusinessProfile();
    }, [fetchBusinessProfile]),
  );

  const getLogoUri = () => {
    return (
      resolveApiImageUrl(profileData?.logo_url) ?? getDefaultBusinessLogo()
    );
  };

  const handleEditBusinessProfile = useCallback(() => {
    if (profileData) {
      router.push({
        pathname: "./editBusinessProfile",
        params: {
          title: profileData.title,
          slogan: profileData.slogan || "",
          logo_url: profileData.logo_url || "",
          country_code: profileData.country_code || "",
          phone: profileData.phone || "",
        },
      });
    } else {
      router.push("./editBusinessProfile");
    }
  }, [profileData, router]);

  const handleRowPress = (key: string) => {
    if (key === "description") {
      router.push("./description");
    } else if (key === "services") {
      router.push("./services");
    } else if (key === "cancellationPolicy") {
      router.push("./cancellationPolicy");
    } else if (key === "socialMedia") {
      router.push("./socialMedia");
    } else if (key === "availability") {
      router.push("./setupAvailability");
    } else if (key === "subscriptions") {
      router.push("./subscriptions");
    } else if (key === "team") {
      router.push("./team");
    } else if (key === "portfolio") {
      router.push("./portfolio");
    } else if (key === "products") {
      router.push("./products");
    } else if (key === "businessLocation") {
      router.push("./location");
    } else {
      Logger.log("Business profile setting pressed:", key);
    }
  };

  const settings: SettingItem[] = [
    {
      key: "businessLocation",
      title: t("yourBusinessLocation"),
      subtitle: t("businessLocationCardSubtitle"),
    },
    {
      key: "description",
      title: t("description"),
      subtitle: t("descriptionCardSubtitle"),
    },
    {
      key: "availability",
      title: t("setAvailabilityTitle"),
      subtitle: t("availabilityCardSubtitle"),
    },
    {
      key: "services",
      title: t("manageServicesList"),
      subtitle: t("servicesCardSubtitle"),
    },
    ...(isBusinessOwner
      ? [
          {
            key: "cancellationPolicy" as const,
            title: t("cancellationPolicy"),
            subtitle: t("cancellationPolicyCardSubtitle"),
          },
        ]
      : []),
    {
      key: "subscriptions",
      title: t("manageSubscriptionList"),
      subtitle: t("subscriptionListCardSubtitle"),
    },
    ...(showManageTeam
      ? [
          {
            key: "team" as const,
            title: t("manageTeam"),
            subtitle: t("teamCardSubtitle"),
          },
        ]
      : []),
    {
      key: "socialMedia",
      title: t("yourSocialMedia"),
      subtitle: t("socialMediaCardSubtitle"),
    },
    {
      key: "portfolio",
      title: t("managePortfolioPhotos"),
      subtitle: t("portfolioCardSubtitle"),
    },
    {
      key: "products",
      title: t("productsInventory"),
      subtitle: t("productsInventoryCardSubtitle"),
    },
  ];

  const getIconMeta = (
    key: SettingKey,
  ): { name: string; family: IconFamily } => {
    switch (key) {
      case "businessLocation":
        return { name: "place", family: "material" };
      case "description":
        return { name: "notebook-edit-outline", family: "community" };
      case "availability":
        return { name: "calendar-month", family: "material" };
      case "services":
        return { name: "content-cut", family: "material" };
      case "cancellationPolicy":
        return { name: "policy", family: "material" };
      case "subscriptions":
        return { name: "crown", family: "community" };
      case "team":
        return { name: "account-group", family: "community" };
      case "socialMedia":
        return { name: "share-variant", family: "community" };
      case "portfolio":
        return { name: "image-outline", family: "community" };
      case "products":
        return { name: "inventory-2", family: "material" };
      default:
        return { name: "settings", family: "material" };
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader title="" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{t("businessProfileSettings")}</Text>
          <Text style={styles.subtitle}>
            {t("manageBusinessAllInOnePlace")}
          </Text>
        </View>

        {profileLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditBusinessProfile}
            style={styles.profileCard}
          >
            <View style={styles.profileImageWrapper}>
              <AppImage
                uri={getLogoUri()}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profileData?.title || user.name || ""}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profileData?.slogan?.trim() || user.email || ""}
              </Text>
              {profileData?.phone ? (
                <Text style={styles.profilePhone} numberOfLines={1}>
                  {profileData.country_code ? `${profileData.country_code} ` : ""}{profileData.phone}
                </Text>
              ) : null}
              {businessCategoryName ? (
                <Text style={styles.profileCategory} numberOfLines={1}>
                  {businessCategoryName}
                </Text>
              ) : null}
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(24)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        )}

        <View style={styles.listContainer}>
          {settings.map((setting) => {
            const iconMeta = getIconMeta(setting.key);
            return (
              <TouchableOpacity
                key={setting.key}
                activeOpacity={0.6}
                onPress={() => handleRowPress(setting.key)}
                style={styles.rowItem}
              >
                <View style={styles.rowIconWrap}>
                  {iconMeta.family === "community" ? (
                    <MaterialCommunityIcons
                      name={iconMeta.name as any}
                      size={moderateWidthScale(24)}
                      color={theme.darkGreen}
                    />
                  ) : (
                    <MaterialIcons
                      name={iconMeta.name as any}
                      size={moderateWidthScale(24)}
                      color={theme.darkGreen}
                    />
                  )}
                </View>
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {setting.title}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>
                    {setting.subtitle}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen5}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
