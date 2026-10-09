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
} from "@/src/state/slices/userSlice";

const CARD_WIDTH_PERCENT = "49%";

type IconVariant = "dark" | "accent" | "cream";
type IconFamily = "material" | "community";

type SettingKey =
  | "businessProfile"
  | "businessHours"
  | "servicesAndMemberships"
  | "cancellationPolicy"
  | "team"
  | "socialMedia"
  | "products"
  | "orders"
  | "freshpassSubscription"
  | "affiliationRequests"
  | "mediaLibrary"
  | "aiTools"
  | "allAppointments"
  | "viewBusinessProfile";

type SettingItem = {
  key: SettingKey;
  title: string;
};

function SettingCard({
  title,
  iconName,
  iconFamily = "material",
  onPress,
  theme,
  styles,
  iconVariant,
}: {
  title: string;
  iconName: string;
  iconFamily?: IconFamily;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  iconVariant: IconVariant;
}) {
  const iconSize = moderateWidthScale(28);
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
              {/* 2 lines + shrink-to-fit so long words ("Memberships") shrink
                  instead of breaking mid-word on narrow phones */}
              <Text
                style={styles.cardTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {title}
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
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(16),
      minHeight: moderateHeightScale(100),
      gap: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    iconWrap: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(14),
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
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
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
      router.push("./businessProfileMenu");
    } else if (key === "businessHours") {
      router.push("./setupAvailability");
    } else if (key === "servicesAndMemberships") {
      router.push("./servicesAndMemberships");
    } else if (key === "cancellationPolicy") {
      router.push("./cancellationPolicy");
    } else if (key === "socialMedia") {
      router.push("./socialMedia");
    } else if (key === "team") {
      router.push("./team");
    } else if (key === "products") {
      router.push("./products");
    } else if (key === "orders") {
      router.push("./orders" as any);
    } else if (key === "freshpassSubscription") {
      router.push("/(main)/dashboard/(account)/subscription");
    } else if (key === "allAppointments") {
      router.push("/(main)/dashboard/(account)/allAppointments" as any);
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
    { key: "businessProfile", title: t("businessProfileTitle") },
    { key: "businessHours", title: t("businessHoursTitle") },
    { key: "servicesAndMemberships", title: t("servicesAndMemberships") },
    ...(showManageTeam
      ? [{ key: "team" as const, title: t("manageTeamTitle") }]
      : []),
    { key: "allAppointments", title: t("appointments") },
    ...(isBusinessOwner
      ? [{ key: "cancellationPolicy" as const, title: t("cancellationPolicy") }]
      : []),
    { key: "socialMedia", title: t("yourSocialMedia") },
    { key: "products", title: t("productsInventoryShort") },
    // Order APIs are owner-only
    ...(isBusinessOwner
      ? [{ key: "orders" as const, title: t("ordersTitle") }]
      : []),
    ...(isBusinessOwner &&
    businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliationRequests" as const,
            title: t("affiliationRequests"),
          },
        ]
      : []),
    { key: "mediaLibrary", title: t("mediaLibrary") },
    { key: "aiTools", title: t("aiTools") },
    ...(!showStripeBanner
      ? [
          {
            key: "freshpassSubscription" as const,
            title: t("freshpassSubscription"),
          },
        ]
      : []),
    { key: "viewBusinessProfile", title: t("viewBusinessProfile") },
  ];

  const getIconMeta = (
    key: SettingKey,
  ): { name: string; family: IconFamily; variant: IconVariant } => {
    // Icons + colors follow the client's Business Management design
    switch (key) {
      case "businessProfile":
        return { name: "storefront", family: "material", variant: "dark" };
      case "businessHours":
        return { name: "calendar-month", family: "material", variant: "accent" };
      case "servicesAndMemberships":
        return { name: "content-cut", family: "material", variant: "accent" };
      case "team":
        return { name: "account-group", family: "community", variant: "dark" };
      case "allAppointments":
        return { name: "event-note", family: "material", variant: "cream" };
      case "cancellationPolicy":
        return { name: "policy", family: "material", variant: "cream" };
      case "socialMedia":
        return { name: "share-variant", family: "community", variant: "accent" };
      case "products":
        return { name: "inventory-2", family: "material", variant: "dark" };
      case "orders":
        return { name: "receipt-long", family: "material", variant: "accent" };
      case "affiliationRequests":
        return { name: "handshake", family: "community", variant: "accent" };
      case "mediaLibrary":
        return { name: "video-library", family: "material", variant: "cream" };
      case "aiTools":
        return { name: "smart-toy", family: "material", variant: "dark" };
      case "freshpassSubscription":
        return { name: "crown", family: "community", variant: "accent" };
      case "viewBusinessProfile":
        return { name: "visibility", family: "material", variant: "cream" };
      default:
        return { name: "settings", family: "material", variant: "cream" };
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
          <Text style={styles.title}>{t("businessManagement")}</Text>
        </View>

        <View style={styles.gridContainer}>
          {settings.map((setting) => {
            const iconMeta = getIconMeta(setting.key);
            return (
              <SettingCard
                key={setting.key}
                title={setting.title}
                iconName={iconMeta.name}
                iconFamily={iconMeta.family}
                onPress={() => handleRowPress(setting.key)}
                theme={theme}
                styles={styles}
                iconVariant={iconMeta.variant}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
