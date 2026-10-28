import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { SlotOffer } from "@/src/types/slotOffer";
import { resolveApiImageUrl } from "@/src/utils/media";

type AppRouter = ReturnType<typeof useRouter>;

export function navigateToSlotOfferDetail(
  router: AppRouter,
  deal: SlotOffer,
) {
  router.push({
    pathname: "/(main)/slotOfferDetail",
    params: { id: String(deal.id) },
  } as any);
}

export function bookSlotOffer(router: AppRouter, deal: SlotOffer) {
  router.push({
    pathname: "/(main)/bookingNow",
    params: {
      business_id: String(deal.business.id),
      service_id: String(deal.service.id),
      ...(deal.staff ? { staff_id: String(deal.staff.id) } : {}),
      appointment_date: deal.date,
      appointment_time: deal.start_time,
      slot_offer_id: String(deal.id),
    },
  } as any);
}

function formatDealPrice(price: number) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

function formatDealTime(startsAt: string, durationMinutes: number, timezone: string) {
  const start = dayjs(startsAt);
  const end = start.add(durationMinutes, "minute");
  return `${start.format("h:mm A")} – ${end.format("h:mm A")}`;
}

type Props = {
  deal: SlotOffer;
  compact?: boolean;
};

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
      width: widthScale(280),
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
      gap: moderateWidthScale(6),
    },
    title: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    serviceName: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    dealPrice: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    normalPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    savingsBadge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.tileMint,
    },
    savingsText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    timeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    bookBtn: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
    },
    bookBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

export default function SlotOfferCard({ deal, compact }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const imageUrl = resolveApiImageUrl(deal.business.image_url);
  const hasDiscount = deal.savings > 0;
  const timeLabel = formatDealTime(deal.starts_at, deal.duration_minutes, deal.timezone);
  const dateLabel = dayjs(deal.date).format("ddd, MMM D");

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      activeOpacity={0.75}
      onPress={() => navigateToSlotOfferDetail(router, deal)}
      accessibilityRole="button"
      accessibilityLabel={`${deal.service.name} ${t("sdAt")} ${deal.business.title}, ${formatDealPrice(deal.offer_price)}`}
    >
      <View style={styles.topRow}>
        <View style={styles.image}>
          {imageUrl ? (
            <AppImage
              uri={imageUrl}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <MaterialIcons
              name="storefront"
              size={moderateWidthScale(24)}
              color={theme.lightGreen2}
            />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {deal.business.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[deal.business.city, deal.business.state]
              .filter(Boolean)
              .join(", ")}
          </Text>
        </View>
      </View>

      <View style={styles.serviceRow}>
        <MaterialIcons
          name="content-cut"
          size={moderateWidthScale(14)}
          color={theme.lightGreen5}
        />
        <Text style={styles.serviceName} numberOfLines={1}>
          {deal.service.name}
          {deal.staff ? ` · ${deal.staff.name}` : ""}
        </Text>
      </View>

      <View style={styles.timeRow}>
        <MaterialIcons
          name="schedule"
          size={moderateWidthScale(14)}
          color={theme.lightGreen5}
        />
        <Text style={styles.timeText}>
          {dateLabel} · {timeLabel}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.priceRow}>
          <Text style={styles.dealPrice}>
            {formatDealPrice(deal.offer_price)}
          </Text>
          {hasDiscount && (
            <>
              <Text style={styles.normalPrice}>
                {formatDealPrice(deal.normal_price)}
              </Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  {t("sdSave")} {formatDealPrice(deal.savings)}
                </Text>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.75}
          onPress={() => bookSlotOffer(router, deal)}
          accessibilityRole="button"
          accessibilityLabel={t("sdBookThisOpening")}
        >
          <Text style={styles.bookBtnText}>{t("sdBook")}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
