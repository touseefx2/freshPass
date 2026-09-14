import React, { useMemo, useState } from "react";
import Logger from "@/src/services/logger";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
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
import { canShowStaffManagement } from "@/src/state/slices/userSlice";

const CARD_WIDTH_PERCENT = "46.5%";

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
  | "subscriptions"
  | "team"
  | "socialMedia"
  | "portfolio";

type SettingItem = {
  key: SettingKey;
  title: string;
  fullWidth?: boolean;
};

function SettingCard({
  title,
  iconName,
  iconFamily = "material",
  onPress,
  theme,
  styles,
  iconVariant,
  fullWidth,
}: {
  title: string;
  iconName: string;
  iconFamily?: IconFamily;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
  iconVariant: IconVariant;
  fullWidth?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(24);
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
      style={[styles.gridItem, fullWidth && styles.gridItemFull]}
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

            <Text style={styles.cardTitle} numberOfLines={3}>
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
      lineHeight: fontSize.size18,
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
    gridItemFull: {
      width: "100%",
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
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size17,
    },
  });

export default function BusinessProfileSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const showManageTeam = canShowStaffManagement(businessStatus);

  const handleRowPress = (key: string) => {
    if (key === "businessProfile") {
      router.push("./businessProfile");
    } else if (key === "description") {
      router.push("./description");
    } else if (key === "services") {
      router.push("./services");
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
    } else if (key === "businessLocation") {
      router.push("./location");
    } else {
      Logger.log("Business profile setting pressed:", key);
    }
  };

  const settings: SettingItem[] = [
    { key: "businessProfile", title: t("businessProfile") },
    { key: "businessLocation", title: t("yourBusinessLocation") },
    { key: "description", title: t("description") },
    { key: "availability", title: t("setAvailabilityTitle") },
    { key: "services", title: t("manageServicesList") },
    { key: "subscriptions", title: t("manageSubscriptionList") },
    ...(showManageTeam
      ? [{ key: "team" as const, title: t("manageTeam") }]
      : []),
    { key: "socialMedia", title: t("yourSocialMedia") },
    {
      key: "portfolio",
      title: t("managePortfolioPhotos"),
      fullWidth: true,
    },
  ];

  const getIconMeta = (
    key: SettingKey,
  ): { name: string; family: IconFamily } => {
    // Match client design image icons as closely as possible
    switch (key) {
      case "businessProfile":
        return { name: "storefront", family: "material" };
      case "businessLocation":
        return { name: "location-on", family: "material" };
      case "description":
        return { name: "edit-note", family: "material" };
      case "availability":
        return { name: "calendar-month", family: "material" };
      case "services":
        return { name: "content-cut", family: "material" };
      case "subscriptions":
        return { name: "crown", family: "community" };
      case "team":
        return { name: "groups", family: "material" };
      case "socialMedia":
        return { name: "share", family: "material" };
      case "portfolio":
        return { name: "image", family: "material" };
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
                iconName={iconMeta.name}
                iconFamily={iconMeta.family}
                onPress={() => handleRowPress(setting.key)}
                theme={theme}
                styles={styles}
                iconVariant={getIconVariant(index)}
                fullWidth={setting.fullWidth}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
