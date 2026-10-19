import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import EarningsTransactionRow from "@/src/components/earningsTransactionRow";
import type {
  EarningsTransaction,
  RevenueChart,
  RevenueChartPoint,
} from "@/src/types/businessEarnings";
import { formatAmount, initialsOf, resolveImageUri } from "./shared";

const AVATAR = widthScale(42);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(10),
      backgroundColor: theme.white,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: theme.emptyProfileImage,
    },
    initials: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tileMint,
    },
    initialsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    who: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    desc: {
      marginTop: moderateHeightScale(1),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    vDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: theme.borderNormal,
    },
    when: {
      width: moderateWidthScale(98),
      gap: moderateHeightScale(4),
    },
    time: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen6,
      fontVariant: ["tabular-nums"],
    },
    method: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    methodText: {
      flexShrink: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    amountCol: {
      alignItems: "flex-end",
      minWidth: moderateWidthScale(54),
    },
    amount: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    amountStruck: {
      textDecorationLine: "line-through",
      color: theme.lightGreen5,
    },
    refunded: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // Chart
    chartWrap: {
      flex: 1,
    },
    bars: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    bar: {
      flex: 1,
      borderTopLeftRadius: moderateWidthScale(3),
      borderTopRightRadius: moderateWidthScale(3),
    },
    labels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(6),
    },
    label: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.white80,
    },
    // Detail sheet
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "80%",
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    grabber: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.lightGreen2,
      marginBottom: moderateHeightScale(10),
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sheetTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    closeButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
}

function transactionMoment(item: EarningsTransaction): dayjs.Dayjs | null {
  if (item.occurredAt && dayjs(item.occurredAt).isValid()) {
    return dayjs(item.occurredAt);
  }
  if (item.appointmentDate) {
    const parsed = dayjs(
      `${item.appointmentDate} ${item.appointmentTime ?? "00:00"}`,
      "YYYY-MM-DD HH:mm",
    );
    if (parsed.isValid()) return parsed;
  }
  if (item.paidAt && dayjs(item.paidAt).isValid()) return dayjs(item.paidAt);
  return null;
}

/* ── Row ───────────────────────────────────────────────────────────────── */

export function TransactionRow({
  item,
  showStaff,
  showDate,
  isFirst,
  onPress,
  style,
}: {
  item: EarningsTransaction;
  showStaff: boolean;
  showDate: boolean;
  isFirst: boolean;
  onPress: (item: EarningsTransaction) => void;
  style?: ViewStyle;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const moment = transactionMoment(item);
  const method = item.paymentMethod ?? "online";
  const methodLabel =
    method === "in_person"
      ? t("bhPayInPerson")
      : method === "membership"
        ? t("bhPayMembership")
        : t("bhPayOnline");
  const methodIcon =
    method === "in_person" ? (
      <MaterialCommunityIcons
        name="cash"
        size={iconScale(16)}
        color={theme.successGreen}
      />
    ) : method === "membership" ? (
      <MaterialCommunityIcons
        name="crown"
        size={iconScale(15)}
        color={theme.orangeBrown}
      />
    ) : (
      <MaterialCommunityIcons
        name="cellphone"
        size={iconScale(15)}
        color={theme.darkGreen}
      />
    );
  const isRefunded = item.status === "refunded";
  const isPartial = item.status === "partially_refunded";
  const description = [
    item.description || item.sourceLabel,
    showStaff && item.staffName ? item.staffName : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const timeLabel = moment
    ? moment.format(showDate ? "MMM D, h:mm A" : "h:mm A")
    : "—";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={[styles.row, !isFirst && styles.rowDivider, style]}
      accessibilityRole="button"
      accessibilityLabel={[
        item.customerName,
        description,
        timeLabel,
        methodLabel,
        formatAmount(item.amount),
        isRefunded
          ? t("earningsStatusRefunded")
          : isPartial
            ? t("earningsStatusPartialRefund")
            : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      {item.customerImage ? (
        <AppImage uri={resolveImageUri(item.customerImage)} style={styles.avatar} />
      ) : (
        <View style={styles.initials}>
          <Text style={styles.initialsText}>{initialsOf(item.customerName)}</Text>
        </View>
      )}
      <View style={styles.who}>
        <Text style={styles.name} numberOfLines={1}>
          {item.customerName || item.sourceLabel}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <View style={styles.vDivider} />
      <View style={styles.when}>
        <Text
          style={styles.time}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {timeLabel}
        </Text>
        <View style={styles.method}>
          {methodIcon}
          <Text style={styles.methodText} numberOfLines={1}>
            {methodLabel}
          </Text>
        </View>
      </View>
      <View style={styles.amountCol}>
        <Text
          style={[styles.amount, isRefunded && styles.amountStruck]}
          numberOfLines={1}
        >
          {formatAmount(item.amount)}
        </Text>
        {isRefunded || isPartial ? (
          <Text style={styles.refunded} numberOfLines={1}>
            {isRefunded
              ? t("earningsStatusRefunded")
              : t("earningsStatusPartialRefund")}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={iconScale(16)} color={theme.lightGreen5} />
    </TouchableOpacity>
  );
}

/**
 * Appointment → existing appointment detail; order → existing order detail;
 * anything else → the payment detail sheet.
 */
export function useTransactionPress(
  openDetail: (item: EarningsTransaction) => void,
) {
  const router = useRouter();
  return (item: EarningsTransaction) => {
    if (item.appointmentId != null) {
      router.push({
        pathname: "/(main)/bookingDetailsById",
        params: { bookingId: String(item.appointmentId) },
      });
      return;
    }
    if (item.orderId != null) {
      router.push({
        pathname:
          "/(main)/dashboard/(account)/(businessProfileSettings)/orderDetail" as any,
        params: { id: String(item.orderId) },
      });
      return;
    }
    openDetail(item);
  };
}

/* ── Bar chart ─────────────────────────────────────────────────────────── */

const MIN_HOUR_WINDOW = 6;

/** Hourly: trim empty hours at both ends (from the data, not fixed hours). */
function visiblePoints(chart: RevenueChart): RevenueChartPoint[] {
  const points = chart.points ?? [];
  if (chart.granularity !== "hour" || points.length === 0) return points;
  const firstIdx = points.findIndex((p) => p.amount > 0);
  if (firstIdx === -1) {
    // Nothing yet today: show a working-day frame
    return points.slice(8, 21);
  }
  let start = firstIdx;
  let end = points.length - 1 - [...points].reverse().findIndex((p) => p.amount > 0);
  while (end - start + 1 < MIN_HOUR_WINDOW) {
    if (start > 0) start -= 1;
    if (end - start + 1 < MIN_HOUR_WINDOW && end < points.length - 1) end += 1;
    if (start === 0 && end === points.length - 1) break;
  }
  return points.slice(start, end + 1);
}

/** Evenly spaced axis ticks; 3 when labels are long ("Mon 13") so they never collide. */
function labelIndexes(points: RevenueChartPoint[]): number[] {
  const count = points.length;
  const maxTicks = points.some((p) => p.label.length > 5) ? 3 : 4;
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);
  const last = count - 1;
  return Array.from(
    new Set(
      Array.from({ length: maxTicks }, (_, i) =>
        Math.round((i * last) / (maxTicks - 1)),
      ),
    ),
  );
}

export function RevenueBarChart({
  chart,
  height,
}: {
  chart: RevenueChart | null | undefined;
  height: number;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const points = useMemo(() => (chart ? visiblePoints(chart) : []), [chart]);
  if (points.length === 0) return <View style={[styles.chartWrap, { height }]} />;

  const max = Math.max(...points.map((p) => p.amount), 0);
  const peakIndex = max > 0 ? points.findIndex((p) => p.amount === max) : -1;
  const gap = points.length > 16 ? 1.5 : points.length > 10 ? 3 : 5;
  const labels = labelIndexes(points);
  const peak = peakIndex >= 0 ? points[peakIndex] : null;

  return (
    <View
      style={styles.chartWrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        peak
          ? t("bhRevenueChartA11y", {
              label: peak.label,
              amount: formatAmount(peak.amount),
            })
          : t("bhRevenueChartEmptyA11y")
      }
    >
      <View style={[styles.bars, { height, gap }]}>
        {points.map((point, index) => {
          const ratio = max > 0 ? point.amount / max : 0;
          const barHeight = point.amount > 0 ? Math.max(4, ratio * height) : 3;
          return (
            <View
              key={point.key}
              style={[
                styles.bar,
                {
                  height: barHeight,
                  maxWidth: moderateWidthScale(12),
                  backgroundColor:
                    point.amount <= 0
                      ? theme.chartBarEmpty
                      : index === peakIndex
                        ? theme.chartBarPeak
                        : theme.chartBar,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        {labels.map((index) => (
          <Text key={points[index].key} style={styles.label} numberOfLines={1}>
            {points[index].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ── Payment detail sheet ──────────────────────────────────────────────── */

export function TransactionDetailSheet({
  item,
  onClose,
}: {
  item: EarningsTransaction | null;
  onClose: () => void;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={item != null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback accessible={false}>
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, moderateHeightScale(16)) },
              ]}
            >
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} accessibilityRole="header">
                  {t("bhPaymentDetails")}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("close")}
                >
                  <Feather name="x" size={iconScale(18)} color={theme.darkGreen} />
                </TouchableOpacity>
              </View>
              <ScrollView bounces={false}>
                {item ? <EarningsTransactionRow item={item} /> : null}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
