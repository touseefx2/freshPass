import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { useDealsPlanGate } from "@/src/hooks/useDealsPlanGate";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";

type MarketingItem = {
  key: string;
  titleKey: string;
  icon: string;
  family: "material" | "community";
  iconBg: (t: Theme) => string;
  iconColor?: (t: Theme) => string;
  onPress: () => void;
};

export default function MarketingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { width } = useWindowDimensions();
  const { ensureCanPostDeals, planModal } = useDealsPlanGate();
  const styles = useMemo(() => createStyles(theme), [colors]);

  const items: MarketingItem[] = [
    {
      key: "promotion",
      titleKey: "mktPromotion",
      icon: "campaign",
      family: "material",
      iconBg: (t) => t.darkGreen,
      onPress: () => router.push("/(main)/promotions" as any),
    },
    {
      key: "socialMedia",
      titleKey: "mktSocialMedia",
      icon: "share-variant",
      family: "community",
      iconBg: (t) => t.selectCard,
      onPress: () =>
        router.push("/(main)/marketing/socialMedia" as any),
    },
    {
      key: "deals",
      titleKey: "mktDeals",
      icon: "tag-outline",
      family: "community",
      iconBg: () => "#E8DFC8",
      iconColor: (t: Theme) => t.darkGreen,
      onPress: () => {
        if (ensureCanPostDeals()) router.push("/(main)/myDeals" as any);
      },
    },
    {
      key: "offers",
      titleKey: "mktOffers",
      icon: "confirmation-number",
      family: "material",
      iconBg: (t) => t.darkGreen,
      onPress: () => router.push("/(main)/bringCustomersBack" as any),
    },
  ];

  const hPad = moderateWidthScale(20);
  const gap = moderateWidthScale(14);
  const tileWidth = Math.floor((width - hPad * 2 - gap) / 2);

  return (
    <View style={styles.container}>
      <StackHeader title="" />
      <View style={styles.body}>
        {/* Icon + subtitle */}
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <MaterialIcons
              name="campaign"
              size={moderateWidthScale(30)}
              color={theme.white}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.heading}>{t("mktTitle")}</Text>
            <Text style={styles.subtitle}>{t("mktSubtitle")}</Text>
          </View>
        </View>

        {/* Tile grid */}
        <View style={[styles.grid, { columnGap: gap, rowGap: gap }]}>
          {items.map((item) => {
            const Icon: any =
              item.family === "community"
                ? MaterialCommunityIcons
                : MaterialIcons;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tile, { width: tileWidth }]}
                activeOpacity={0.75}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={t(item.titleKey)}
              >
                <View
                  style={[
                    styles.tileIcon,
                    { backgroundColor: item.iconBg(theme) },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={moderateWidthScale(26)}
                    color={item.iconColor ? item.iconColor(theme) : theme.white}
                  />
                </View>
                <Text style={styles.tileLabel}>{t(item.titleKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {planModal}
    </View>
  );
}

const TILE_RADIUS = moderateWidthScale(16);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.darkGreen,
    },
    body: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(24),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(20),
    },
    headerIcon: {
      width: moderateWidthScale(54),
      height: moderateWidthScale(54),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
    },
    heading: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      marginTop: moderateHeightScale(2),
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    tile: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: TILE_RADIUS,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.background,
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: moderateWidthScale(4),
        },
        android: { elevation: 3, shadowColor: theme.darkGreen },
        default: {},
      }),
    },
    tileIcon: {
      width: moderateWidthScale(50),
      height: moderateWidthScale(50),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    tileLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
  });
