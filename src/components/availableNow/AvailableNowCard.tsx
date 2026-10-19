import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { AvailableNowListItem } from "@/src/types/availableNow";
import { getAvailableNowBadge } from "@/src/utils/availableNow";
import { resolveApiImageUrl } from "@/src/utils/media";

type AppRouter = ReturnType<typeof useRouter>;

/** Row tap → the business profile; Book there preselects this pro. */
export function openAvailableNowProfile(
  router: AppRouter,
  item: AvailableNowListItem,
) {
  const staffId = item.professional?.staff_id;
  router.push({
    pathname: "/(main)/businessDetail",
    params: {
      business_id: String(item.business.id),
      ...(staffId != null ? { staff_id: String(staffId) } : null),
    },
  } as any);
}

/** Book → bookingNow with the offered service and pro preselected. */
export function bookAvailableNow(router: AppRouter, item: AvailableNowListItem) {
  const staffId = item.professional?.staff_id;
  router.push({
    pathname: "/(main)/bookingNow",
    params: {
      business_id: String(item.business.id),
      ...(item.service?.id != null
        ? { service_id: String(item.service.id) }
        : null),
      ...(staffId != null ? { staff_id: String(staffId) } : null),
    },
  } as any);
}

export function formatServicePrice(price: string | number | null | undefined) {
  if (price == null || price === "") return null;
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      gap: moderateHeightScale(10),
    },
    cardCompact: {
      width: widthScale(260),
      marginRight: moderateWidthScale(12),
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    image: {
      width: moderateWidthScale(52),
      height: moderateWidthScale(52),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    title: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    distance: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    meta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    badge: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minWidth: 0,
    },
    dot: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.green,
    },
    dotBusy: {
      backgroundColor: theme.orangeBrown,
    },
    badgeText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bookBtn: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
    },
    bookText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

type Props = {
  item: AvailableNowListItem;
  onPress: (item: AvailableNowListItem) => void;
  onBook: (item: AvailableNowListItem) => void;
  /** Fixed-width card for the home strip */
  compact?: boolean;
};

/** One professional free now: business, pro + service + price, distance and the live badge. */
export default function AvailableNowCard({
  item,
  onPress,
  onBook,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const imageUri = resolveApiImageUrl(item.business?.image_url);
  const badge = getAvailableNowBadge(item, t);
  const price = formatServicePrice(item.service?.price);
  const meta = [
    item.professional?.name,
    item.service?.name,
    price,
  ]
    .filter(Boolean)
    .join(" · ");
  const distance =
    item.distance_km != null ? `${Number(item.distance_km).toFixed(1)} km` : null;

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[item.business?.title, meta, badge?.label, distance]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.topRow}>
        <View style={styles.image}>
          {imageUri ? (
            <AppImage uri={imageUri} style={StyleSheet.absoluteFill} />
          ) : (
            <MaterialIcons
              name="storefront"
              size={moderateWidthScale(24)}
              color={theme.lightGreen}
            />
          )}
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.business?.title || ""}
            </Text>
            {distance ? <Text style={styles.distance}>{distance}</Text> : null}
          </View>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        {badge ? (
          <View style={styles.badge}>
            <View style={[styles.dot, !badge.available && styles.dotBusy]} />
            <Text style={styles.badgeText} numberOfLines={compact ? 1 : 2}>
              {badge.label}
            </Text>
          </View>
        ) : (
          <View style={styles.badge} />
        )}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => onBook(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("anBook")}
        >
          <Text style={styles.bookText}>{t("anBook")}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
