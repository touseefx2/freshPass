/**
 * Owner "My Deals" — list + summary + pause/resume/withdraw actions.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import RetryButton from "@/src/components/retryButton";
import Logger from "@/src/services/logger";
import {
  fetchMySlotOffers,
  patchSlotOffer,
} from "@/src/services/slotOfferService";
import type {
  SlotOffer,
  SlotOfferMineSummary,
  SlotOfferStatus,
} from "@/src/types/slotOffer";

function formatPrice(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const STATUS_COLORS: Record<SlotOfferStatus, { bg: string; text: string }> = {
  live: { bg: "#EAF2E1", text: "#2F7A34" },
  paused: { bg: "#FBF0DC", text: "#C9822A" },
  withdrawn: { bg: "#F5F5F5", text: "#666" },
  booked: { bg: "#DDE5F6", text: "#365AB8" },
  expired: { bg: "#F5F5F5", text: "#999" },
  unavailable: { bg: "#FBE7E3", text: "#C8402F" },
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(24),
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(10),
    },
    // Summary row
    summaryRow: {
      flexDirection: "row",
      marginHorizontal: moderateWidthScale(16),
      marginVertical: moderateHeightScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(12),
      gap: moderateWidthScale(8),
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
      gap: moderateHeightScale(2),
    },
    summaryValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summaryLabel: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
      textTransform: "uppercase",
    },
    // Deal card (owner)
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(8),
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardService: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusBadge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(6),
    },
    statusText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      textTransform: "uppercase",
    },
    cardMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    cardPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    cardDealPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    cardNormalPrice: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    cardStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    cardStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    cardStatText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    actionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(4),
    },
    actionBtn: {
      flex: 1,
      borderRadius: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(9),
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    actionBtnText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actionBtnDanger: {
      borderColor: theme.red,
    },
    actionBtnDangerText: {
      color: theme.red,
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textAlign: "center",
    },
    emptyBtn: {
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
    },
    emptyBtnText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function MyDealsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const [items, setItems] = useState<SlotOffer[]>([]);
  const [summary, setSummary] = useState<SlotOfferMineSummary | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more") => {
      const requestId = ++requestIdRef.current;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
      setError(false);
      try {
        const res = await fetchMySlotOffers({ page: nextPage });
        if (requestId !== requestIdRef.current) return;
        setItems((prev) =>
          nextPage === 1
            ? res.data
            : [...prev, ...res.data.filter((d) => !prev.some((p) => p.id === d.id))],
        );
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setSummary(res.summary);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        Logger.error("MyDeals: load failed", err);
        if (nextPage === 1) setError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const didMount = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!didMount.current) {
        didMount.current = true;
        load(1, "initial");
      } else {
        load(1, "refresh");
      }
    }, [load]),
  );

  const handleAction = async (
    deal: SlotOffer,
    action: "pause" | "resume" | "withdraw",
  ) => {
    if (action === "withdraw") {
      Alert.alert(t("sdWithdrawTitle"), t("sdWithdrawMsg"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("sdWithdraw"),
          style: "destructive",
          onPress: () => doAction(deal, action),
        },
      ]);
      return;
    }
    doAction(deal, action);
  };

  const doAction = async (
    deal: SlotOffer,
    action: "pause" | "resume" | "withdraw",
  ) => {
    setActionLoading(deal.id);
    try {
      const updated = await patchSlotOffer(deal.id, action);
      setItems((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, ...updated } : d)),
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || t("sdActionError");
      Alert.alert(t("sdError"), msg);
    } finally {
      setActionLoading(null);
    }
  };

  const renderDeal = useCallback(
    ({ item: deal }: { item: SlotOffer }) => {
      const sc = STATUS_COLORS[deal.status] ?? STATUS_COLORS.expired;
      const start = dayjs(deal.starts_at);
      const dateLabel = start.format("ddd, MMM D · h:mm A");
      const isLive = deal.status === "live";
      const isPaused = deal.status === "paused";
      const isActing = actionLoading === deal.id;

      return (
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardService} numberOfLines={1}>
              {deal.service.name}
              {deal.staff ? ` · ${deal.staff.name}` : ""}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>
                {deal.status}
              </Text>
            </View>
          </View>

          <Text style={styles.cardMeta}>{dateLabel}</Text>

          <View style={styles.cardPriceRow}>
            <Text style={styles.cardDealPrice}>
              {formatPrice(deal.offer_price)}
            </Text>
            {deal.savings > 0 && (
              <Text style={styles.cardNormalPrice}>
                {formatPrice(deal.normal_price)}
              </Text>
            )}
          </View>

          {(deal.views_count != null || deal.appointment) && (
            <View style={styles.cardStatsRow}>
              {deal.views_count != null && (
                <View style={styles.cardStat}>
                  <MaterialIcons
                    name="visibility"
                    size={iconScale(14)}
                    color={theme.lightGreen5}
                  />
                  <Text style={styles.cardStatText}>
                    {deal.views_count} {t("sdViews")}
                  </Text>
                </View>
              )}
              {deal.appointment && (
                <View style={styles.cardStat}>
                  <MaterialIcons
                    name="event-available"
                    size={iconScale(14)}
                    color={theme.successGreen}
                  />
                  <Text style={styles.cardStatText}>{t("sdBooked")}</Text>
                </View>
              )}
            </View>
          )}

          {(isLive || isPaused) && (
            <View style={styles.actionsRow}>
              {isLive && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                  disabled={isActing}
                  onPress={() => handleAction(deal, "pause")}
                >
                  {isActing ? (
                    <ActivityIndicator size="small" color={theme.darkGreen} />
                  ) : (
                    <Text style={styles.actionBtnText}>{t("sdPause")}</Text>
                  )}
                </TouchableOpacity>
              )}
              {isPaused && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                  disabled={isActing}
                  onPress={() => handleAction(deal, "resume")}
                >
                  {isActing ? (
                    <ActivityIndicator size="small" color={theme.darkGreen} />
                  ) : (
                    <Text style={styles.actionBtnText}>{t("sdResume")}</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                activeOpacity={0.75}
                disabled={isActing}
                onPress={() => handleAction(deal, "withdraw")}
              >
                <Text
                  style={[styles.actionBtnText, styles.actionBtnDangerText]}
                >
                  {t("sdWithdraw")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [actionLoading, styles, theme, t],
  );

  const renderHeader = () => {
    if (!summary) return null;
    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.live}</Text>
          <Text style={styles.summaryLabel}>{t("sdLive")}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.views}</Text>
          <Text style={styles.summaryLabel}>{t("sdViews")}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.booked}</Text>
          <Text style={styles.summaryLabel}>{t("sdBooked")}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatPrice(summary.revenue)}</Text>
          <Text style={styles.summaryLabel}>{t("sdRevenue")}</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.center}>
          <RetryButton onPress={() => load(1, "initial")} />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <MaterialIcons
          name="local-offer"
          size={moderateWidthScale(48)}
          color={theme.lightGreen2}
        />
        <Text style={styles.emptyTitle}>{t("sdMyDealsEmpty")}</Text>
        <Text style={styles.emptySub}>{t("sdMyDealsEmptySub")}</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          activeOpacity={0.75}
          onPress={() => router.push("/(main)/postDeal" as any)}
        >
          <Text style={styles.emptyBtnText}>{t("sdPostADeal")}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("sdMyDeals")}
        rightIcon={
          <MaterialIcons name="add" size={iconScale(22)} color={theme.white} />
        }
        onRightPress={() => router.push("/(main)/postDeal" as any)}
        rightAccessibilityLabel={t("sdPostADeal")}
      />
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDeal}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(1, "refresh")}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
          onEndReached={() => {
            if (!loadingMore && page < lastPage) load(page + 1, "more");
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={theme.darkGreen}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
