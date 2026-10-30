import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type {
  EarningsOverview,
  RevenueSourceFilter,
} from "@/src/types/businessEarnings";
import {
  formatAmount,
  formatAmountCompact,
  formatAmountShort,
} from "./shared";

export interface DashboardAppointmentCounts {
  total?: number;
  completed?: number;
  upcoming?: number;
  awaiting_outcome?: number;
  no_show?: number;
  cancelled?: number;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heroRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    heroCard: {
      flex: 1,
      minHeight: moderateHeightScale(104),
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(10),
      justifyContent: "space-between",
      overflow: "hidden",
    },
    heroShadow: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
      borderRadius: moderateWidthScale(16),
    },
    ratingCard: {
      backgroundColor: theme.orangeBrown,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
    },
    heroValueLight: {
      flex: 1,
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    heroValueDark: {
      flex: 1,
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    heroBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(8),
    },
    heroLabelLight: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
    },
    heroLabelDark: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    placeholderLight: {
      height: moderateHeightScale(26),
      width: "70%",
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.white15,
    },
    placeholderDark: {
      height: moderateHeightScale(26),
      width: "45%",
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
    },
    tilesRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(12),
    },
    countTile: {
      flex: 1,
      borderRadius: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(4),
      alignItems: "center",
    },
    countValue: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    countLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    breakdownRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    breakdownTile: {
      flex: 1,
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(3),
      alignItems: "center",
    },
    breakdownIcon: {
      height: iconScale(26),
      justifyContent: "center",
      alignItems: "center",
    },
    breakdownAmount: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    breakdownLabel: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    breakdownSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      textAlign: "center",
    },
    gridRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    gridCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingVertical: moderateHeightScale(14),
      paddingLeft: moderateWidthScale(12),
      paddingRight: moderateWidthScale(8),
    },
    gridIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    gridCopy: {
      flex: 1,
      minWidth: 0,
    },
    gridAmount: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    gridLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    gridSub: {
      marginTop: moderateHeightScale(1),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
    },
    feesLine: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

/* ── Total revenue + rating ─────────────────────────────────────────── */

export function RevenueRatingCards({
  totalRevenue,
  rating,
  revenueLoading,
  ratingLoading,
  onRevenuePress,
  onRatingPress,
}: {
  /** null = not available (shown as a dash) */
  totalRevenue: number | null;
  rating: number | null;
  revenueLoading: boolean;
  ratingLoading: boolean;
  onRevenuePress: () => void;
  onRatingPress: () => void;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  return (
    <View style={styles.heroRow}>
      <TouchableOpacity
        style={[styles.heroShadow, { flex: 1 }]}
        activeOpacity={0.85}
        onPress={onRevenuePress}
        accessibilityRole="button"
        accessibilityLabel={`${t("totalRevenue")} ${
          totalRevenue == null ? "" : formatAmount(totalRevenue)
        }`}
      >
        <LinearGradient
          colors={[theme.darkGreen, theme.darkGreenDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            {revenueLoading ? (
              <View style={styles.placeholderLight} />
            ) : (
              <Text
                style={styles.heroValueLight}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {totalRevenue == null ? "—" : formatAmount(totalRevenue)}
              </Text>
            )}
            <Ionicons
              name="stats-chart"
              size={iconScale(18)}
              color={theme.white}
            />
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroLabelLight} numberOfLines={1}>
              {t("totalRevenue")}
            </Text>
            <Feather
              name="chevron-right"
              size={iconScale(18)}
              color={theme.white70}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.heroShadow, { flex: 1 }]}
        activeOpacity={0.85}
        onPress={onRatingPress}
        accessibilityRole="button"
        accessibilityLabel={`${t("userReviewsRate")} ${
          rating == null ? "" : rating.toFixed(1)
        }`}
      >
        <View style={[styles.heroCard, styles.ratingCard]}>
          <View style={styles.heroTop}>
            {ratingLoading ? (
              <View style={styles.placeholderDark} />
            ) : (
              <Text style={styles.heroValueDark} numberOfLines={1}>
                {rating == null ? "—" : rating.toFixed(1)}
              </Text>
            )}
            <Ionicons name="star" size={iconScale(20)} color={theme.darkGreen} />
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroLabelDark} numberOfLines={1}>
              {t("userReviewsRate")}
            </Text>
            <Feather
              name="chevron-right"
              size={iconScale(18)}
              color={theme.darkGreen}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/* ── Appointments / Completed / Awaiting / Canceled ─────────────────── */

export function AppointmentCountTiles({
  counts,
}: {
  counts: DashboardAppointmentCounts | null;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const value = (n?: number) => (counts == null ? "–" : String(n ?? 0));
  // Older backends: no `total` — the five counts add up to it
  const total =
    counts?.total ??
    (counts
      ? (counts.completed ?? 0) +
        (counts.upcoming ?? 0) +
        (counts.awaiting_outcome ?? 0) +
        (counts.no_show ?? 0) +
        (counts.cancelled ?? 0)
      : undefined);

  const tiles = [
    {
      key: "total",
      label: t("appointments"),
      count: total,
      bg: theme.tileMint,
      icon: (
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={iconScale(24)}
          color={theme.buttonBack}
        />
      ),
    },
    {
      key: "completed",
      label: t("bhStatusCompleted"),
      count: counts?.completed,
      bg: theme.tileMint,
      icon: (
        <Ionicons
          name="checkmark-circle"
          size={iconScale(24)}
          color={theme.successGreen}
        />
      ),
    },
    {
      key: "awaiting",
      label: t("statusAwaitingOutcome"),
      count: counts?.awaiting_outcome,
      bg: theme.tilePeach,
      icon: (
        <Ionicons
          name="time-outline"
          size={iconScale(24)}
          color={theme.accentAmber}
        />
      ),
    },
    {
      key: "cancelled",
      label: t("canceled"),
      count: counts?.cancelled,
      bg: theme.tileRose,
      icon: (
        <Ionicons
          name="close-circle"
          size={iconScale(24)}
          color={theme.accentRose}
        />
      ),
    },
  ];

  return (
    <View style={styles.tilesRow}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={[styles.countTile, { backgroundColor: tile.bg }]}
          accessible
          accessibilityLabel={`${value(tile.count)} ${tile.label}`}
        >
          {tile.icon}
          <Text
            style={styles.countValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {value(tile.count)}
          </Text>
          <Text style={styles.countLabel} numberOfLines={2}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ── Services / Tips / Membership / Products ────────────────────────── */

type BreakdownItem = {
  key: Exclude<RevenueSourceFilter, "all" | "other">;
  label: string;
  amount: number;
  sub: string;
  tint: string;
  icon: (size: number) => React.ReactNode;
};

function useBreakdownItems(
  overview: EarningsOverview | null,
  hideProducts: boolean,
): BreakdownItem[] {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const { t } = useTranslation();
  const items: BreakdownItem[] = [
    {
      key: "appointment",
      label: t("bhServices"),
      amount: overview?.services.amount ?? 0,
      sub: t("bhTxCount", { count: overview?.services.count ?? 0 }),
      tint: theme.tileMint,
      icon: (size) => (
        <MaterialCommunityIcons
          name="content-cut"
          size={size}
          color={theme.buttonBack}
        />
      ),
    },
    {
      key: "tip",
      label: t("bhTips"),
      amount: overview?.tips.amount ?? 0,
      sub: t("bhTxCount", { count: overview?.tips.count ?? 0 }),
      tint: theme.tilePeach,
      icon: (size) => (
        <FontAwesome5 name="coins" size={size * 0.9} color={theme.accentAmber} />
      ),
    },
    {
      key: "subscription",
      label: t("bhMembership"),
      amount: overview?.memberships.amount ?? 0,
      sub: t("bhVisitsCount", { count: overview?.memberships.visits ?? 0 }),
      tint: theme.tilePeach,
      icon: (size) => (
        <MaterialCommunityIcons
          name="crown"
          size={size}
          color={theme.orangeBrown}
        />
      ),
    },
    {
      key: "product",
      label: t("bhProducts"),
      amount: overview?.products?.amount ?? 0,
      sub: t("bhTxCount", { count: overview?.products?.count ?? 0 }),
      tint: theme.tileRose,
      icon: (size) => (
        <MaterialCommunityIcons
          name="shopping"
          size={size}
          color={theme.accentRose}
        />
      ),
    },
  ];
  // Staff: no Products tile (the key is missing from their report)
  const noProducts = hideProducts || (overview != null && overview.products == null);
  return noProducts ? items.filter((item) => item.key !== "product") : items;
}

/** Cancellation / no-show fees — no tile in the design, a line only when > 0. */
function FeesLine({ overview }: { overview: EarningsOverview | null }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { t } = useTranslation();
  const amount = overview?.other?.amount ?? 0;
  if (!(amount > 0)) return null;
  return (
    <Text style={styles.feesLine}>
      {t("bhFeesLine", { amount: formatAmountCompact(amount) })}
    </Text>
  );
}

/** Home: four (staff: three) compact tiles in one row. */
export function RevenueBreakdownTiles({
  overview,
  onPressSource,
  hideProducts = false,
}: {
  overview: EarningsOverview | null;
  onPressSource: (source: BreakdownItem["key"]) => void;
  /** Staff: Services, Tips, Membership only */
  hideProducts?: boolean;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const items = useBreakdownItems(overview, hideProducts);
  const loading = overview == null;

  return (
    <View>
      <View style={styles.breakdownRow}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.breakdownTile}
            activeOpacity={0.75}
            onPress={() => onPressSource(item.key)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ${
              loading ? "" : formatAmountCompact(item.amount)
            }, ${loading ? "" : item.sub}`}
          >
            <View style={styles.breakdownIcon}>{item.icon(iconScale(24))}</View>
            <Text
              style={styles.breakdownAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {loading ? "–" : formatAmountShort(item.amount)}
            </Text>
            <Text style={styles.breakdownLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text
              style={styles.breakdownSub}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {loading ? " " : `(${item.sub})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FeesLine overview={overview} />
    </View>
  );
}

/** Transactions screen: 2 × 2 cards with tinted icon squares. */
export function RevenueBreakdownGrid({
  overview,
  onPressSource,
  hideProducts = false,
}: {
  overview: EarningsOverview | null;
  onPressSource: (source: BreakdownItem["key"]) => void;
  /** Staff: Services, Tips, Membership only */
  hideProducts?: boolean;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const items = useBreakdownItems(overview, hideProducts);
  const loading = overview == null;
  // 3 items (staff): the last card takes the full row
  const rows = [items.slice(0, 2), items.slice(2, 4)];

  return (
    <View style={{ gap: moderateHeightScale(10) }}>
      {rows.map((row, index) => (
        <View key={index} style={styles.gridRow}>
          {row.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.gridCard}
              activeOpacity={0.75}
              onPress={() => onPressSource(item.key)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} ${
                loading ? "" : formatAmountCompact(item.amount)
              }, ${loading ? "" : item.sub}`}
            >
              <View style={[styles.gridIcon, { backgroundColor: item.tint }]}>
                {item.icon(iconScale(22))}
              </View>
              <View style={styles.gridCopy}>
                <Text
                  style={styles.gridAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loading ? "–" : formatAmountShort(item.amount)}
                </Text>
                <Text style={styles.gridLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.gridSub} numberOfLines={1}>
                  {loading ? " " : item.sub}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={iconScale(18)}
                color={theme.lightGreen5}
              />
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <FeesLine overview={overview} />
    </View>
  );
}
