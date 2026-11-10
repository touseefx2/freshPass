import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { FlowCard } from "@/src/components/reelFlow/flowParts";
import { ClassStateView } from "@/src/components/masterClasses/parts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { isRequestCanceled } from "@/src/services/api";
import { fetchRewards } from "@/src/services/rewardsService";
import Logger from "@/src/services/logger";
import { formatRewardMoney } from "@/src/utils/rewardMath";
import type { RewardEntry } from "@/src/types/rewards";

const PER_PAGE = 20;

type CommunityIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

/** GET /api/rewards entry types (guide section 3). */
const TYPE_META: Record<
  string,
  { icon: CommunityIconName; labelKey: string; sign: 1 | -1 }
> = {
  reward: { icon: "gift-outline", labelKey: "rwListTypeReward", sign: 1 },
  spend: { icon: "shopping-outline", labelKey: "rwListTypeSpend", sign: -1 },
  release: { icon: "backup-restore", labelKey: "rwListTypeRelease", sign: 1 },
  refund: { icon: "cash-refund", labelKey: "rwListTypeRefund", sign: 1 },
  expiry: {
    icon: "timer-sand-complete",
    labelKey: "rwListTypeExpiry",
    sign: -1,
  },
};

const formatDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d.format("MMM D, YYYY") : null;
};

/**
 * Reward balance + every change, newest first (GET /api/rewards).
 * After a first-page load the balance is written to the user store so the
 * rest of the app shows the same number.
 */
export default function RewardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const storedBalance = useAppSelector((state) => state.user.reward_balance);

  const [entries, setEntries] = useState<RewardEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(storedBalance);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh") => {
      const request = ++requestRef.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const result = await fetchRewards({ page: 1, per_page: PER_PAGE });
        if (request !== requestRef.current) return;
        setEntries(result.entries);
        setBalance(result.balance);
        setPage(result.meta.currentPage || 1);
        setLastPage(result.meta.lastPage || 1);
        setLoaded(true);
        dispatch(
          setUserDetails({
            reward_balance: result.balance,
            reward_balance_cents: result.balanceCents,
          }),
        );
      } catch (err) {
        if (request !== requestRef.current || isRequestCanceled(err)) return;
        Logger.error("Failed to load rewards:", err);
        if (entriesRef.current.length > 0) {
          // Keep the list on screen; say the refresh failed
          showBannerRef.current(
            t("rwListLoadError"),
            (err as Error)?.message || t("somethingWentWrong"),
            "error",
          );
        } else {
          setError(true);
        }
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dispatch, t],
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !loaded || page >= lastPage) {
      return;
    }
    const request = requestRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchRewards({ page: nextPage, per_page: PER_PAGE });
      if (request !== requestRef.current) return;
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...result.entries.filter((e) => !seen.has(e.id))];
      });
      setPage(nextPage);
      setLastPage(result.meta.lastPage || nextPage);
    } catch (err) {
      // Keep what is loaded; scrolling again retries
      if (!isRequestCanceled(err)) Logger.warn("Rewards next page failed:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [lastPage, loaded, loading, page]);

  useEffect(() => {
    void loadFirstPage("initial");
  }, [loadFirstPage]);

  const goInvite = useCallback(() => {
    // Opened from Invite a Pro: go back to it instead of stacking a copy
    if (from === "invitePro" && router.canGoBack()) router.back();
    else router.push("/(main)/invitePro" as any);
  }, [from, router]);

  // Unknown balance (page 1 failed, nothing stored) is "—", never "$0.00"
  const balanceText =
    balance == null ? "—" : formatRewardMoney(balance);
  const balanceA11y =
    balance == null
      ? t("rwListBalanceUnknownA11y")
      : t("rwListBalanceA11y", { amount: balanceText });

  const renderHeader = () => (
    <View>
      <View
        style={styles.balanceCard}
        accessible
        accessibilityLabel={balanceA11y}
      >
        <View style={styles.balanceTop}>
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons
              name="gift-outline"
              size={iconScale(20)}
              color={theme.orangeBrown}
            />
          </View>
          <Text style={styles.balanceCaption}>{t("rwListBalanceCaption")}</Text>
        </View>
        {balance == null && loading ? (
          <ActivityIndicator
            size="small"
            color={theme.white}
            style={styles.balanceLoader}
          />
        ) : (
          <Text style={styles.balanceAmount}>{balanceText}</Text>
        )}
        <Text style={styles.balanceNote}>{t("rwListBalanceNote")}</Text>
      </View>
      {entries.length > 0 ? (
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t("rwListHistory")}
        </Text>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: RewardEntry }) => (
    <RewardEntryRow entry={item} styles={styles} theme={theme} />
  );

  const renderEmpty = () => {
    if (!loaded && loading) {
      return (
        <ClassStateView loading message={t("rwListLoading")} />
      );
    }
    if (error) {
      return (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("rwListLoadError")}
          actionLabel={t("retry")}
          actionIcon="refresh"
          onAction={() => void loadFirstPage("initial")}
        />
      );
    }
    return (
      <ClassStateView
        icon="gift-outline"
        title={t("rwListEmptyTitle")}
        message={t("rwListEmptyText")}
        actionLabel={t("ipScreenTitle")}
        actionIcon="person-add-outline"
        onAction={goInvite}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={t("rwListTitle")} />
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function RewardEntryRow({
  entry,
  styles,
  theme,
}: {
  entry: RewardEntry;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const meta = TYPE_META[entry.type];
  // Unknown types: trust the sign the server sent
  const sign = meta ? meta.sign : entry.amount < 0 ? -1 : 1;
  const amountText = `${sign > 0 ? "+" : "−"}${formatRewardMoney(
    Math.abs(entry.amount),
  )}`;
  const label = meta ? t(meta.labelKey) : t("rwListTypeOther");
  const date = formatDate(entry.createdAt);
  const isHeld = entry.status === "held";
  const remaining = entry.remaining ?? 0;
  const expiresOn =
    entry.type === "reward" && remaining > 0 ? formatDate(entry.expiresAt) : null;
  const partlyUsed = remaining > 0 && remaining < Math.abs(entry.amount);

  const a11y = [
    label,
    entry.description,
    date,
    t(sign > 0 ? "rwListA11yAdded" : "rwListA11yTaken", {
      amount: formatRewardMoney(Math.abs(entry.amount)),
    }),
    isHeld ? t("rwListHeld") : null,
    partlyUsed
      ? t("rwListRemaining", { amount: formatRewardMoney(remaining) })
      : null,
    expiresOn ? t("rwListExpires", { date: expiresOn }) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <FlowCard style={styles.entryCard}>
      <View style={styles.entryRow} accessible accessibilityLabel={a11y}>
        <View
          style={[
            styles.entryIcon,
            sign > 0 ? styles.entryIconPlus : styles.entryIconMinus,
          ]}
        >
          <MaterialCommunityIcons
            name={meta?.icon ?? "swap-vertical"}
            size={iconScale(20)}
            color={sign > 0 ? theme.successGreen : theme.darkGreen}
          />
        </View>
        <View style={styles.entryBody}>
          <View style={styles.entryTitleRow}>
            <Text style={styles.entryTitle} numberOfLines={1}>
              {label}
            </Text>
            {isHeld ? (
              <View style={styles.heldPill}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={iconScale(11)}
                  color={theme.orangeBrownText}
                />
                <Text style={styles.heldText}>{t("rwListHeld")}</Text>
              </View>
            ) : null}
          </View>
          {entry.description ? (
            <Text style={styles.entryDescription} numberOfLines={3}>
              {entry.description}
            </Text>
          ) : null}
          {date ? <Text style={styles.entryMeta}>{date}</Text> : null}
          {expiresOn ? (
            <Text style={styles.entryExpiry}>
              {partlyUsed
                ? `${t("rwListRemaining", {
                    amount: formatRewardMoney(remaining),
                  })} · `
                : ""}
              {t("rwListExpires", { date: expiresOn })}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.entryAmount,
            sign > 0 ? styles.entryAmountPlus : styles.entryAmountMinus,
          ]}
        >
          {amountText}
        </Text>
      </View>
    </FlowCard>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
    },
    balanceCard: {
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(18),
    },
    balanceTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    balanceIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.orangeBrown30,
    },
    balanceCaption: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    balanceAmount: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size34,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    balanceLoader: {
      alignSelf: "flex-start",
      marginVertical: moderateHeightScale(16),
    },
    balanceNote: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.white85,
    },
    sectionTitle: {
      marginTop: moderateHeightScale(22),
      marginBottom: moderateHeightScale(10),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    separator: {
      height: moderateHeightScale(10),
    },
    entryCard: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(16),
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    entryIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    entryIconPlus: {
      backgroundColor: theme.mintTint,
    },
    entryIconMinus: {
      backgroundColor: theme.tileGoldCream,
    },
    entryBody: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    entryTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    entryTitle: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    heldPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: 999,
      backgroundColor: theme.tileGoldCream,
      borderWidth: 1,
      borderColor: theme.goldBorder,
    },
    heldText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    entryDescription: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    entryMeta: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    entryExpiry: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
      fontVariant: ["tabular-nums"],
    },
    entryAmount: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
    entryAmountPlus: {
      color: theme.successGreen,
    },
    entryAmountMinus: {
      color: theme.darkGreen,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
  });
