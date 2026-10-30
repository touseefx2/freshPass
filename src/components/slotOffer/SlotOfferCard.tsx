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
import { parseSalonTime } from "@/src/utils/availableNow";

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
      deal_price: String(deal.offer_price),
      deal_normal_price: String(deal.normal_price),
    },
  } as any);
}

function formatDealPrice(price: number) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

/** Salon clock, not the phone's: read from the string's own offset. */
export function salonDayjs(iso: string) {
  return dayjs(parseSalonTime(iso)?.wall ?? iso);
}

function formatDealTime(startsAt: string, durationMinutes: number) {
  const start = salonDayjs(startsAt);
  const end = start.add(durationMinutes, "minute");
  return `${start.format("h:mm A")} – ${end.format("h:mm A")}`;
}

/** "YYYY-MM-DD" today on the salon's clock; phone date if the zone is unknown. */
function salonToday(timezone: string | null | undefined) {
  if (timezone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {}
  }
  return dayjs().format("YYYY-MM-DD");
}

type Props = {
  deal: SlotOffer;
  compact?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(12),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    cardCompact: {
      width: widthScale(290),
      marginRight: moderateWidthScale(12),
      marginBottom: moderateHeightScale(6),
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    image: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(3),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
    },
    meta: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    offBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.tilePeach,
    },
    offBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      letterSpacing: 0.3,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.lightGreen015,
    },
    serviceBlock: {
      gap: moderateHeightScale(3),
    },
    serviceName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
    timeBox: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(9),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.tileMint,
      gap: moderateWidthScale(10),
    },
    timeItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      flexShrink: 1,
    },
    timeSep: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: theme.lightGreen015,
    },
    timeText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    priceCol: {
      flexShrink: 1,
      gap: moderateHeightScale(1),
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(6),
    },
    dealPrice: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    normalPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    savingsText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
    },
    bookBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingLeft: moderateWidthScale(18),
      paddingRight: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
    },
    bookBtnText: {
      fontSize: fontSize.size14,
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
  const percentOff =
    hasDiscount && deal.normal_price > 0
      ? Math.round((deal.savings / deal.normal_price) * 100)
      : 0;
  const timeLabel = formatDealTime(deal.starts_at, deal.duration_minutes);
  const today = salonToday(deal.timezone);
  const dealDay = dayjs(deal.date);
  const dateLabel =
    deal.date === today
      ? t("today")
      : deal.date === dayjs(today).add(1, "day").format("YYYY-MM-DD")
        ? t("tomorrow")
        : dealDay.format("ddd, MMM D");
  const location = [deal.business.city, deal.business.state]
    .filter(Boolean)
    .join(", ");
  const serviceSub = [
    deal.staff ? `${t("sdWith")} ${deal.staff.name}` : null,
    deal.duration_minutes ? `${deal.duration_minutes} ${t("sdMin")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
              size={moderateWidthScale(22)}
              color={theme.lightGreen2}
            />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {deal.business.title}
          </Text>
          {!!location && (
            <View style={styles.locationRow}>
              <MaterialIcons
                name="place"
                size={moderateWidthScale(13)}
                color={theme.lightGreen5}
              />
              <Text style={styles.meta} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </View>
        {percentOff > 0 && (
          <View style={styles.offBadge}>
            <Text style={styles.offBadgeText}>
              {t("sdPercentOff", { percent: percentOff })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceBlock}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {deal.service.name}
        </Text>
        {!!serviceSub && (
          <Text style={styles.serviceSub} numberOfLines={1}>
            {serviceSub}
          </Text>
        )}
      </View>

      <View style={styles.timeBox}>
        <View style={styles.timeItem}>
          <MaterialIcons
            name="event"
            size={moderateWidthScale(15)}
            color={theme.buttonBack}
          />
          <Text style={styles.timeText} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        <View style={styles.timeSep} />
        <View style={styles.timeItem}>
          <MaterialIcons
            name="schedule"
            size={moderateWidthScale(15)}
            color={theme.buttonBack}
          />
          <Text style={styles.timeText} numberOfLines={1}>
            {timeLabel}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.priceCol}>
          <View style={styles.priceRow}>
            <Text style={styles.dealPrice}>
              {formatDealPrice(deal.offer_price)}
            </Text>
            {hasDiscount && (
              <Text style={styles.normalPrice}>
                {formatDealPrice(deal.normal_price)}
              </Text>
            )}
          </View>
          {hasDiscount && (
            <Text style={styles.savingsText}>
              {t("sdYouSave")} {formatDealPrice(deal.savings)}
            </Text>
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
          <MaterialIcons
            name="arrow-forward"
            size={moderateWidthScale(16)}
            color={theme.buttonText}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
