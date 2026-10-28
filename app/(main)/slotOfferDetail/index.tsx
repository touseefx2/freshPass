import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import RetryButton from "@/src/components/retryButton";
import { bookSlotOffer } from "@/src/components/slotOffer/SlotOfferCard";
import { fetchSlotOfferDetail } from "@/src/services/slotOfferService";
import { resolveApiImageUrl } from "@/src/utils/media";
import Logger from "@/src/services/logger";
import type { SlotOffer } from "@/src/types/slotOffer";

function formatDealPrice(price: number) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(120),
      gap: moderateHeightScale(16),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(24),
    },
    // Business header
    businessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    businessImage: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen05,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    businessInfo: { flex: 1, gap: moderateHeightScale(2) },
    businessName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    businessAddress: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    // Info card
    infoCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(14),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    infoIconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    infoTextCol: { flex: 1, gap: moderateHeightScale(1) },
    infoLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    divider: {
      height: 1,
      backgroundColor: theme.lightGreen07,
    },
    // Price section
    priceCard: {
      backgroundColor: theme.tileMint,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(8),
    },
    priceMainRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(8),
    },
    dealPriceLarge: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    normalPriceStrike: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      marginBottom: moderateHeightScale(3),
    },
    savingsBadgeLarge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
    },
    savingsTextLarge: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.successGreen,
    },
    // Ended overlay
    endedCard: {
      backgroundColor: theme.lightRed,
      borderRadius: moderateWidthScale(14),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    endedText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    // CTA
    ctaWrap: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(34),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen07,
    },
    ctaBtn: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
    ctaBtnText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    closesRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(6),
    },
    closesText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
  });

export default function SlotOfferDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();

  const [deal, setDeal] = useState<SlotOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const loadDeal = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(false);
    try {
      const result = await fetchSlotOfferDetail(params.id);
      if (!result) {
        setNotFound(true);
      } else {
        setDeal(result);
      }
    } catch (err) {
      Logger.error("Failed to load slot offer detail:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdDealDetails")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdDealDetails")} />
        <View style={styles.center}>
          <RetryButton onPress={loadDeal} />
        </View>
      </View>
    );
  }

  if (notFound || !deal) {
    return (
      <View style={styles.container}>
        <StackHeader title={t("sdDealDetails")} />
        <View style={styles.center}>
          <MaterialIcons
            name="event-busy"
            size={moderateWidthScale(48)}
            color={theme.lightGreen2}
          />
          <Text
            style={{
              fontSize: fontSize.size16,
              fontFamily: fonts.fontBold,
              color: theme.darkGreen,
              textAlign: "center",
            }}
          >
            {t("sdDealNotFound")}
          </Text>
        </View>
      </View>
    );
  }

  const imageUrl = resolveApiImageUrl(deal.business.image_url);
  const hasDiscount = deal.savings > 0;
  const start = dayjs(deal.starts_at);
  const end = start.add(deal.duration_minutes, "minute");
  const timeLabel = `${start.format("h:mm A")} – ${end.format("h:mm A")}`;
  const dateLabel = start.format("dddd, MMMM D, YYYY");
  const closesLabel = dayjs(deal.closes_at).format("ddd, MMM D · h:mm A");

  return (
    <View style={styles.container}>
      <StackHeader title={t("sdDealDetails")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ended banner */}
        {!deal.bookable && (
          <View style={styles.endedCard}>
            <MaterialIcons name="info-outline" size={20} color={theme.red} />
            <Text style={styles.endedText}>{t("sdDealEnded")}</Text>
          </View>
        )}

        {/* Business header */}
        <View style={styles.businessRow}>
          <View style={styles.businessImage}>
            {imageUrl ? (
              <AppImage
                uri={imageUrl}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <MaterialIcons
                name="storefront"
                size={moderateWidthScale(26)}
                color={theme.lightGreen2}
              />
            )}
          </View>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName} numberOfLines={1}>
              {deal.business.title}
            </Text>
            <Text style={styles.businessAddress} numberOfLines={1}>
              {[deal.business.address, deal.business.city, deal.business.state]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialIcons
                name="content-cut"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t("sdService")}</Text>
              <Text style={styles.infoValue}>{deal.service.name}</Text>
            </View>
          </View>

          {deal.staff && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <MaterialIcons
                    name="person"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  />
                </View>
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoLabel}>{t("sdStaff")}</Text>
                  <Text style={styles.infoValue}>{deal.staff.name}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialIcons
                name="event"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t("sdDate")}</Text>
              <Text style={styles.infoValue}>{dateLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialIcons
                name="schedule"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>{t("sdTime")}</Text>
              <Text style={styles.infoValue}>
                {timeLabel} ({deal.duration_minutes} {t("sdMin")})
              </Text>
            </View>
          </View>
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <View style={styles.priceMainRow}>
            <Text style={styles.dealPriceLarge}>
              {formatDealPrice(deal.offer_price)}
            </Text>
            {hasDiscount && (
              <Text style={styles.normalPriceStrike}>
                {formatDealPrice(deal.normal_price)}
              </Text>
            )}
          </View>
          {hasDiscount && (
            <View style={styles.savingsBadgeLarge}>
              <MaterialIcons
                name="local-offer"
                size={moderateWidthScale(14)}
                color={theme.successGreen}
              />
              <Text style={styles.savingsTextLarge}>
                {t("sdYouSave")} {formatDealPrice(deal.savings)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      {deal.bookable && (
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.75}
            onPress={() => bookSlotOffer(router, deal)}
            accessibilityRole="button"
            accessibilityLabel={t("sdBookThisOpening")}
          >
            <Text style={styles.ctaBtnText}>{t("sdBookThisOpening")}</Text>
          </TouchableOpacity>
          <View style={styles.closesRow}>
            <MaterialIcons
              name="timer"
              size={moderateWidthScale(14)}
              color={theme.lightGreen5}
            />
            <Text style={styles.closesText}>
              {t("sdBookingCloses")} {closesLabel}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
