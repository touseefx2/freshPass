import React, { useMemo } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  canShowStaffManagement,
  isBusinessSubscriptionActive,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import { openNotificationSettings } from "@/src/services/notificationPermissionService";

const CARD_WIDTH_PERCENT = "49%";

type IconVariant = "dark" | "accent" | "cream";
type IconFamily = "material" | "community";

function getIconVariant(index: number): IconVariant {
  const variants: IconVariant[] = ["dark", "accent", "cream"];
  return variants[index % 3];
}

type SettingKey =
  | "businessProfile"
  | "businessLocation"
  | "description"
  | "availability"
  | "services"
  | "cancellationPolicy"
  | "subscriptions"
  | "team"
  | "socialMedia"
  | "portfolio"
  | "products"
  | "freshpassSubscription"
  | "notificationSettings"
  | "affiliationRequests"
  | "mediaLibrary"
  | "aiTools"
  | "allAppointments"
  | "allWorkHistory"
  | "viewBusinessProfile";

type SettingItem = {
  key: SettingKey;
  title: string;
  subtitle: string;
};

function SettingCard({
  title,
  subtitle,
  iconName,
  iconFamily = "material",
  onPress,
  theme,
  styles,
  iconVariant,
}: {
  title: string;
  subtitle: string;
  iconName: string;
  iconFamily?: IconFamily;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  iconVariant: IconVariant;
}) {
  const iconSize = moderateWidthScale(26);
  const thickness = moderateHeightScale(2.5);
  const radius = moderateWidthScale(16);

  const iconBg =
    iconVariant === "dark"
      ? theme.darkGreen
      : iconVariant === "accent"
        ? theme.selectCard
        : theme.orangeBrown015;

  const iconColor =
    iconVariant === "cream" ? theme.darkGreen : theme.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.gridItem}
    >
      <View style={styles.cardShadowWrap}>
        <View
          style={[
            styles.cardBase,
            {
              borderRadius: radius,
              paddingBottom: thickness,
            },
          ]}
        >
          <View style={[styles.cardFace, { borderRadius: radius }]}>
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

            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={3}>
                {subtitle}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
      paddingHorizontal: moderateWidthScale(12),
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
    gridContainer: {
      marginTop: moderateHeightScale(14),
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: moderateHeightScale(10),
      columnGap: moderateWidthScale(6),
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
            height: 0,
          },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(8),
        },
        android: {
          elevation: 5,
          shadowColor: theme.darkGreen,
        },
        default: {
          shadowColor: theme.darkGreen,
          shadowOffset: {
            width: 0,
            height: 0,
          },
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
        android: {
          elevation: 2,
        },
        default: {
          shadowOpacity: 0.1,
        },
      }),
    },
    cardBase: {
      backgroundColor: theme.lightGreen16,
    },
    cardFace: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(14),
      minHeight: moderateHeightScale(92),
      gap: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    iconWrap: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.2,
          shadowRadius: moderateWidthScale(4),
        },
        android: {
          elevation: 0,
        },
        default: {
          shadowColor: theme.shadow,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.2,
          shadowRadius: moderateWidthScale(4),
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
          elevation: 0,
        },
        default: {
          shadowOpacity: 0.12,
        },
      }),
    },
    cardTextBlock: {
      flex: 1,
      flexShrink: 1,
      justifyContent: "center",
      gap: moderateHeightScale(2),
    },
    cardTitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size15,
      textAlign: "left",
    },
    cardSubtitle: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      lineHeight: fontSize.size12,
      textAlign: "left",
    },
  });

export default function BusinessProfileSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const businessStatus = user.businessStatus;
  const userRole = user.userRole;
  const businessId = user.business_id;
  const showManageTeam = canShowStaffManagement(businessStatus);
  const isBusinessOwner = userRole === "business";
  const showStripeBanner =
    isBusinessOwner &&
    businessStatus?.onboarding_completed === true &&
    businessStatus?.stripe_onboarding_status === "pending";

  const handleRowPress = (key: SettingKey) => {
    if (key === "businessProfile") {
      router.push("./businessProfile");
    } else if (key === "description") {
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
    } else if (key === "freshpassSubscription") {
      router.push("/(main)/dashboard/(account)/subscription");
    } else if (key === "notificationSettings") {
      openNotificationSettings();
    } else if (key === "allAppointments") {
      router.push("/(main)/dashboard/(account)/allAppointments" as any);
    } else if (key === "allWorkHistory") {
      router.push("/(main)/dashboard/(account)/allWorkHistory" as any);
    } else if (key === "affiliationRequests") {
      router.push("./affiliationRequests");
    } else if (key === "mediaLibrary") {
      router.push("/(main)/aiTools/toolList");
    } else if (key === "aiTools") {
      router.push({
        pathname: "/(main)/aiTools/toolList",
        params: { mode: "aiTools" },
      });
    } else if (key === "viewBusinessProfile") {
      const bid = businessId ?? businessStatus?.business_id;
      if (bid) {
        router.push({
          pathname: "/(main)/businessDetail",
          params: { business_id: bid.toString(), viewMode: "true" },
        } as any);
      }
    } else {
      Logger.log("Business profile setting pressed:", key);
    }
  };

  const settings: SettingItem[] = [
    {
      key: "businessProfile",
      title: t("businessProfile"),
      subtitle: t("businessProfileCardSubtitle"),
    },
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
      key: "allAppointments" as const,
      title: t("allAppointments"),
      subtitle: t("allAppointmentsCardSubtitle"),
    },
    {
      key: "allWorkHistory" as const,
      title: t("allWorkHistory"),
      subtitle: t("allWorkHistoryCardSubtitle"),
    },
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
    ...(isBusinessOwner &&
    businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliationRequests" as const,
            title: t("affiliationRequests"),
            subtitle: t("affiliationRequestsCardSubtitle"),
          },
        ]
      : []),
    {
      key: "mediaLibrary" as const,
      title: t("mediaLibrary"),
      subtitle: t("mediaLibraryCardSubtitle"),
    },
    {
      key: "aiTools" as const,
      title: t("aiTools"),
      subtitle: t("aiToolsCardSubtitle"),
    },
    ...(!showStripeBanner
      ? [
          {
            key: "freshpassSubscription" as const,
            title: t("freshpassSubscription"),
            subtitle: t("freshpassSubscriptionSubtitle"),
          },
        ]
      : []),
    {
      key: "viewBusinessProfile" as const,
      title: t("viewBusinessProfile"),
      subtitle: t("viewBusinessProfileSubtitle"),
    },
  ];

  const getIconMeta = (
    key: SettingKey,
  ): { name: string; family: IconFamily } => {
    // Closest matches to client design icons
    switch (key) {
      case "businessProfile":
        return { name: "storefront", family: "material" };
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
      case "allAppointments":
        return { name: "event-note", family: "material" };
      case "allWorkHistory":
        return { name: "history", family: "material" };
      case "affiliationRequests":
        return { name: "handshake", family: "community" };
      case "mediaLibrary":
        return { name: "video-library", family: "material" };
      case "aiTools":
        return { name: "smart-toy", family: "material" };
      case "notificationSettings":
        return { name: "notifications", family: "material" };
      case "freshpassSubscription":
        return { name: "crown", family: "community" };
      case "viewBusinessProfile":
        return { name: "visibility", family: "material" };
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

        <View style={styles.gridContainer}>
          {settings.map((setting, index) => {
            const iconMeta = getIconMeta(setting.key);
            return (
              <SettingCard
                key={setting.key}
                title={setting.title}
                subtitle={setting.subtitle}
                iconName={iconMeta.name}
                iconFamily={iconMeta.family}
                onPress={() => handleRowPress(setting.key)}
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
