import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import AppImage from "@/src/components/AppImage";
import { StarIconSmall } from "@/assets/icons";
import {
  HIRING_CORNER_OVERHANG,
  HIRING_FRAME_WIDTH,
  HiringCornerBadge,
} from "@/src/components/jobs/jobBadges";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { getDefaultBusinessImage } from "@/src/services/remoteConfigService";
import type {
  AvailableNowBusiness,
  AvailableNowListItem,
} from "@/src/types/availableNow";
import { getAvailableNowBadge } from "@/src/utils/availableNow";
import { resolveApiImageUrl } from "@/src/utils/media";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * One row is a business: no staff preselected — booking's "Anyone" slots
 * already show only times when somebody is free.
 */
export function openAvailableNowProfile(
  router: AppRouter,
  item: AvailableNowListItem,
) {
  router.push({
    pathname: "/(main)/businessDetail",
    params: { business_id: String(item.business.id) },
  } as any);
}

/** Book → booking with no service chosen; the customer picks one first. */
export function bookAvailableNow(router: AppRouter, item: AvailableNowListItem) {
  router.push({
    pathname: "/(main)/bookingNow",
    params: { business_id: String(item.business.id), pick_service: "1" },
  } as any);
}

/** Same picture as the Recommended card: portfolio photo → image → logo → default. */
function businessImage(business: AvailableNowBusiness | undefined) {
  return (
    business?.portfolio_photos?.[0]?.url ||
    resolveApiImageUrl(business?.image_url || business?.logo_url) ||
    getDefaultBusinessImage()
  );
}

// Same look as the home "Recommended" business card
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      // Transparent frame keeps hiring / non-hiring cards the same size
      borderWidth: HIRING_FRAME_WIDTH,
      borderColor: "transparent",
      paddingHorizontal: moderateWidthScale(10) - HIRING_FRAME_WIDTH,
      paddingVertical: moderateHeightScale(10) - HIRING_FRAME_WIDTH,
      height: heightScale(132),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    cardCompact: {
      width: widthScale(310),
    },
    cardHiring: {
      borderColor: theme.orangeBrown,
    },
    // Full-width list: room for the corner badge above the card
    cardHiringSpaced: {
      marginTop: HIRING_CORNER_OVERHANG,
    },
    image: {
      width: widthScale(110),
      height: heightScale(110),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    content: {
      flex: 1,
      height: heightScale(110),
      justifyContent: "space-between",
    },
    badge: {
      backgroundColor: theme.darkGreenLight,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      alignSelf: "flex-start",
      maxWidth: "100%",
    },
    dot: {
      width: moderateWidthScale(7),
      height: moderateWidthScale(7),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.green,
    },
    dotLater: {
      backgroundColor: theme.orangeBrown,
    },
    badgeText: {
      flexShrink: 1,
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      includeFontPadding: false,
    },
    info: {
      gap: moderateHeightScale(2),
      flexShrink: 1,
    },
    title: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textTransform: "capitalize",
      includeFontPadding: false,
    },
    staff: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
      includeFontPadding: false,
    },
    address: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
      includeFontPadding: false,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    rating: {
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.white70,
      gap: moderateWidthScale(6),
    },
    ratingText: {
      flexShrink: 1,
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      includeFontPadding: false,
    },
    bookBtn: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.orangeBrown,
    },
    bookText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      includeFontPadding: false,
    },
  });

type Props = {
  item: AvailableNowListItem;
  onPress: (item: AvailableNowListItem) => void;
  onBook: (item: AvailableNowListItem) => void;
  /** Fixed-width card for the home strip */
  compact?: boolean;
};

/** One business with free time left today: who's free, where, and the live badge. */
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

  const business = item.business;
  const isHiring = business?.is_hiring === true;
  const imageUri = businessImage(business);
  const ownerName = business?.owner?.name?.trim() || null;
  const badge = getAvailableNowBadge(item, t);
  // Single-provider businesses send no staff
  const staffNames = (item.available_staff ?? [])
    .map((s) => s.name?.trim())
    .filter(Boolean)
    .join(", ");
  const staffLine = staffNames ? t("anStaffFree", { names: staffNames }) : null;
  const distance =
    item.distance_km != null ? `${Number(item.distance_km).toFixed(1)} km` : null;
  const address = [
    business?.address ||
      business?.street_address ||
      [business?.city, business?.state].filter(Boolean).join(", "),
    distance,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <TouchableOpacity
      style={[
        styles.card,
        compact && styles.cardCompact,
        isHiring && styles.cardHiring,
        isHiring && !compact && styles.cardHiringSpaced,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={[business?.title, badge?.label, staffLine, address]
        .filter(Boolean)
        .join(", ")}
    >
      {isHiring ? <HiringCornerBadge /> : null}
      <AppImage
        uri={imageUri}
        style={styles.image}
        iconSize={widthScale(36)}
        iconColor={theme.white50}
      />

      <View style={styles.content}>
        {badge ? (
          <View style={styles.badge}>
            <View style={[styles.dot, !badge.available && styles.dotLater]} />
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {business?.title || ""}
          </Text>
          {/* Staff business: who's free; single provider: the owner */}
          {staffLine || ownerName ? (
            <Text style={styles.staff} numberOfLines={1}>
              {staffLine || t("ownedBy", { name: ownerName })}
            </Text>
          ) : null}
          {address ? (
            <Text style={styles.address} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.rating}>
            <StarIconSmall
              width={widthScale(12)}
              height={heightScale(12)}
              color={theme.orangeBrown}
            />
            <Text style={styles.ratingText} numberOfLines={1}>
              {business?.average_rating || 0}/ {business?.ratings_count || 0}{" "}
              reviews
            </Text>
          </View>
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
      </View>
    </TouchableOpacity>
  );
}
