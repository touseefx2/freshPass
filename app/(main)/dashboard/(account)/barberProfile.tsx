import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
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
import StackHeader from "@/src/components/StackHeader";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const CARD_WIDTH_PERCENT = "48%";

type IconVariant = "dark" | "accent" | "cream";
type IconFamily = "material" | "community";

function getIconVariant(index: number): IconVariant {
  const variants: IconVariant[] = ["dark", "accent", "cream"];
  return variants[index % 3];
}

type BarberSettingKey =
  | "contact"
  | "workingHours"
  | "portfolio"
  | "appointments"
  | "workHistory"
  | "customers"
  | "followers"
  | "viewPublicProfile"
  | "timeOff";

type BarberSettingItem = {
  key: BarberSettingKey;
  title: string;
};

function BarberCard({
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
  const [pressed, setPressed] = useState(false);
  const iconSize = moderateWidthScale(27);
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
      marginBottom: moderateHeightScale(6),
    },
    ownerBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.orangeBrown30,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(6),
      marginBottom: moderateHeightScale(6),
    },
    ownerBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
      rowGap: moderateHeightScale(10),
      columnGap: moderateWidthScale(8),
    },
    gridItem: {
      width: CARD_WIDTH_PERCENT as any,
    },
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
    cardTitle: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size17,
    },
  });

export default function BarberProfileScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);

  const handlePress = (key: BarberSettingKey) => {
    switch (key) {
      case "contact":
        router.push("./(profile)");
        break;
      case "workingHours":
        router.push("./staffAvailability");
        break;
      case "portfolio":
        router.push("./staffWorkImages");
        break;
      case "appointments":
        router.push("./myAppointments");
        break;
      case "workHistory":
        router.push("./myWorkHistory");
        break;
      case "customers":
        router.push("./customers");
        break;
      case "followers":
        router.push("./followers");
        break;
      case "viewPublicProfile": {
        const staffId = user.businessStatus?.owner_as_staff?.staff_id;
        if (staffId) {
          router.push({
            pathname: "/(main)/staffDetail",
            params: { id: staffId.toString(), viewMode: "true" },
          } as any);
        }
        break;
      }
      case "timeOff":
        router.push("/(main)/leaveList");
        break;
    }
  };

  const settings: BarberSettingItem[] = [
    { key: "contact", title: t("contactInformation") },
    { key: "workingHours", title: t("myWorkingHours") },
    { key: "portfolio", title: t("myPortfolio") },
    { key: "appointments", title: t("myAppointments") },
    { key: "workHistory", title: t("myWorkHistory") },
    { key: "customers", title: t("myCustomers") },
    { key: "followers", title: t("myFollowers") },
    { key: "viewPublicProfile", title: t("viewPublicProfile") },
    { key: "timeOff", title: t("timeOff") },
  ];

  const getIconMeta = (
    key: BarberSettingKey,
  ): { name: string; family: IconFamily } => {
    switch (key) {
      case "contact":
        return { name: "person", family: "material" };
      case "workingHours":
        return { name: "calendar-month", family: "material" };
      case "portfolio":
        return { name: "photo-library", family: "material" };
      case "appointments":
        return { name: "event-note", family: "material" };
      case "workHistory":
        return { name: "history", family: "material" };
      case "customers":
        return { name: "people", family: "material" };
      case "followers":
        return { name: "group", family: "material" };
      case "viewPublicProfile":
        return { name: "visibility", family: "material" };
      case "timeOff":
        return { name: "event-busy", family: "material" };
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
          <Text style={styles.title}>{t("myBarberProfile")}</Text>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>{t("owner")}</Text>
          </View>
          <Text style={styles.subtitle}>{t("manageYourWorkAsBarber")}</Text>
        </View>

        <View style={styles.gridContainer}>
          {settings.map((setting, index) => {
            const iconMeta = getIconMeta(setting.key);
            return (
              <BarberCard
                key={setting.key}
                title={setting.title}
                iconName={iconMeta.name}
                iconFamily={iconMeta.family}
                onPress={() => handlePress(setting.key)}
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
