import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type { ShopOrder, ShopOrderStatus } from "@/src/types/shopOrder";
import type { ShopShippingMethod } from "@/src/types/shopProduct";
import {
  formatOrderAddressLines,
  getHistoryEntryDetails,
  getHistoryEntryLabelKey,
  getItemsSummary,
  getJourneyStepLabelKey,
  getOrderJourney,
  getOrderStatusLabelKey,
  isPickupOrder,
  type OrderJourneyStep,
} from "@/src/utils/shopOrderHelpers";

/**
 * Pieces shared by the owner's and the customer's order screens: status
 * badge, "what now" card with the step tracker, shipping details, items,
 * totals and the history timeline. Large type, like the step-by-step flows.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

const DOT = widthScale(30);

export function formatOrderDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = dayjs(iso);
  return date.isValid() ? date.format("MMM D, YYYY · h:mm A") : "";
}

export function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = dayjs(iso);
  return date.isValid() ? date.format("MMM D, YYYY") : "";
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // ── Status badge
    badge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
    },
    badgeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    badgeNeutral: { backgroundColor: theme.lightGreen07 },
    badgeNeutralText: { color: theme.darkGreen },
    badgeNew: { backgroundColor: theme.orangeBrown015 },
    badgeNewText: { color: theme.orangeBrownText },
    badgeWaiting: { backgroundColor: theme.apptBlueBg },
    badgeWaitingText: { color: theme.apptBlueAccent },
    badgeDone: { backgroundColor: theme.apptMintBg },
    badgeDoneText: { color: theme.darkGreen },
    badgeStopped: { backgroundColor: theme.lightRed },
    badgeStoppedText: { color: theme.red },

    // ── Cards
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(16),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    section: {
      gap: moderateHeightScale(10),
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      minHeight: heightScale(32),
    },
    sectionTitle: {
      flexShrink: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(6),
    },
    sectionActionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },

    // ── Stage card ("what now") + tracker
    stageTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    stageDate: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "right",
    },
    stageTitle: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size30,
    },
    stageText: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size22,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(16),
    },
    journeyRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    journeyRail: {
      width: DOT,
      alignItems: "center",
    },
    journeyDot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    journeyDotDone: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    journeyDotNext: {
      borderColor: theme.orangeBrown,
      backgroundColor: theme.upcomingCard,
    },
    journeyDotNextInner: {
      width: DOT / 3,
      height: DOT / 3,
      borderRadius: DOT / 6,
      backgroundColor: theme.orangeBrown,
    },
    journeyDotStopped: {
      borderColor: theme.red,
      backgroundColor: theme.lightRed,
    },
    journeyLine: {
      flex: 1,
      width: 2,
      minHeight: heightScale(14),
      marginVertical: moderateHeightScale(3),
      backgroundColor: theme.lightGreen015,
    },
    journeyLineDone: {
      backgroundColor: theme.darkGreen,
    },
    journeyBody: {
      flex: 1,
      minWidth: 0,
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(14),
    },
    journeyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    journeyTitleUpcoming: {
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    journeyTitleStopped: {
      color: theme.red,
    },
    journeyMeta: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    journeyMetaNext: {
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },

    // ── Text blocks
    bodyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    mutedText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size21,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
    },
    infoRowText: {
      flex: 1,
      minWidth: 0,
    },
    infoGap: {
      gap: moderateHeightScale(10),
    },

    // ── Items + totals
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    itemThumb: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      overflow: "hidden",
    },
    itemImage: {
      width: "100%",
      height: "100%",
    },
    itemThumbFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    itemBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    itemName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    itemMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    itemTotal: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    itemsGap: {
      gap: moderateHeightScale(12),
    },
    totals: {
      gap: moderateHeightScale(6),
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    totalLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    totalValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    grandLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    grandValue: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },

    // ── History timeline
    historyRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    historyRail: {
      width: widthScale(14),
      alignItems: "center",
    },
    historyDot: {
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      marginTop: moderateHeightScale(5),
      backgroundColor: theme.lightGreen4,
    },
    historyDotLatest: {
      backgroundColor: theme.orangeBrown,
      borderWidth: 2,
      borderColor: theme.upcomingBorder,
    },
    historyLine: {
      flex: 1,
      width: 2,
      marginTop: moderateHeightScale(4),
      backgroundColor: theme.lightGreen015,
    },
    historyBody: {
      flex: 1,
      minWidth: 0,
      paddingBottom: moderateHeightScale(16),
      gap: moderateHeightScale(2),
    },
    historyTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    historyDate: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    historyDetails: {
      marginTop: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },

    // ── List card (owner + customer order lists)
    summaryCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    summaryBody: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    summaryHead: {
      gap: moderateHeightScale(4),
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    summaryNumber: {
      flexShrink: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summaryMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    summaryItemText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    summaryItemName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    summaryItemMore: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    summaryBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    summaryMethod: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      flexShrink: 1,
    },
    summaryMethodText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    summaryTotal: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    nextStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      backgroundColor: theme.upcomingCard,
      borderTopWidth: 1,
      borderTopColor: theme.orangeBrown30,
    },
    nextText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
  });

function useOrderStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

type Styles = ReturnType<typeof createStyles>;

function badgeTone(status: ShopOrderStatus, styles: Styles) {
  switch (status) {
    case "paid":
      return [styles.badgeNew, styles.badgeNewText] as const;
    case "ready_for_pickup":
      return [styles.badgeWaiting, styles.badgeWaitingText] as const;
    case "shipped":
    case "completed":
      return [styles.badgeDone, styles.badgeDoneText] as const;
    case "cancelled":
      return [styles.badgeStopped, styles.badgeStoppedText] as const;
    default:
      return [styles.badgeNeutral, styles.badgeNeutralText] as const;
  }
}

/** Status pill: the label carries the meaning, the color only supports it. */
export function OrderStatusBadge({
  status,
  shippingMethod,
}: {
  status: ShopOrderStatus;
  shippingMethod: ShopShippingMethod;
}) {
  const { styles } = useOrderStyles();
  const { t } = useTranslation();
  const [box, text] = badgeTone(status, styles);
  const label = t(getOrderStatusLabelKey(status, shippingMethod));
  return (
    <View
      style={[styles.badge, box]}
      accessible
      accessibilityLabel={t("orderStatusA11y", { status: label })}
    >
      <Text style={[styles.badgeText, text]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function OrderCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useOrderStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Section title with an optional text action ("Edit"), then a card. */
export function OrderSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; icon: IconName; onPress: () => void } | null;
  children: React.ReactNode;
}) {
  const { theme, styles } = useOrderStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {action ? (
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={action.onPress}
            activeOpacity={0.7}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${title}`}
          >
            <MaterialIcons
              name={action.icon}
              size={moderateWidthScale(18)}
              color={theme.buttonBack}
            />
            <Text style={styles.sectionActionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <OrderCard>{children}</OrderCard>
    </View>
  );
}

function JourneyRow({
  step,
  last,
  shippingMethod,
}: {
  step: OrderJourneyStep;
  last: boolean;
  shippingMethod: ShopShippingMethod;
}) {
  const { theme, styles } = useOrderStyles();
  const { t } = useTranslation();
  const title = t(getJourneyStepLabelKey(step.key, shippingMethod));
  const meta =
    step.state === "next"
      ? t("orderStepNext")
      : step.at
        ? formatOrderDateTime(step.at)
        : "";
  const stateLabel =
    step.state === "done"
      ? t("orderStepDone")
      : step.state === "next"
        ? t("orderStepNext")
        : step.state === "stopped"
          ? ""
          : t("orderStepUpcoming");

  return (
    <View
      style={styles.journeyRow}
      accessible
      accessibilityLabel={[title, stateLabel, step.at ? meta : null]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.journeyRail}>
        <View
          style={[
            styles.journeyDot,
            step.state === "done" && styles.journeyDotDone,
            step.state === "next" && styles.journeyDotNext,
            step.state === "stopped" && styles.journeyDotStopped,
          ]}
        >
          {step.state === "done" ? (
            <MaterialIcons
              name="check"
              size={moderateWidthScale(18)}
              color={theme.white}
            />
          ) : step.state === "stopped" ? (
            <MaterialIcons
              name="close"
              size={moderateWidthScale(18)}
              color={theme.red}
            />
          ) : step.state === "next" ? (
            <View style={styles.journeyDotNextInner} />
          ) : null}
        </View>
        {!last ? (
          <View
            style={[
              styles.journeyLine,
              step.state === "done" && styles.journeyLineDone,
            ]}
          />
        ) : null}
      </View>
      <View style={[styles.journeyBody, last && { paddingBottom: 0 }]}>
        <Text
          style={[
            styles.journeyTitle,
            step.state === "upcoming" && styles.journeyTitleUpcoming,
            step.state === "stopped" && styles.journeyTitleStopped,
          ]}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            style={[
              styles.journeyMeta,
              step.state === "next" && styles.journeyMetaNext,
            ]}
          >
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The "where is this order" card: status, a big title saying what happens
 * now, a short line, and the steps (paid → shipped / ready → picked up).
 */
export function OrderStageCard({
  order,
  title,
  text,
}: {
  order: ShopOrder;
  title: string;
  text: string;
}) {
  const { styles } = useOrderStyles();
  const { t } = useTranslation();
  const journey = useMemo(() => getOrderJourney(order), [order]);
  const placed = formatOrderDate(order.createdAt);

  return (
    <OrderCard>
      <View style={styles.stageTop}>
        <OrderStatusBadge
          status={order.status}
          shippingMethod={order.shippingMethod}
        />
        {placed ? (
          <Text style={styles.stageDate} numberOfLines={1}>
            {t("orderPlacedOn", { date: placed })}
          </Text>
        ) : null}
      </View>
      <Text style={styles.stageTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.stageText}>{text}</Text>
      <View style={styles.divider} />
      <View>
        {journey.map((step, index) => (
          <JourneyRow
            key={step.key}
            step={step}
            last={index === journey.length - 1}
            shippingMethod={order.shippingMethod}
          />
        ))}
      </View>
    </OrderCard>
  );
}

/** Free-text shipping details; line breaks kept, long-press to copy. */
export function ShippingDetailsText({ text }: { text: string }) {
  const { styles } = useOrderStyles();
  return (
    <Text style={styles.bodyText} selectable>
      {text}
    </Text>
  );
}

export function OrderMutedText({ text }: { text: string }) {
  const { styles } = useOrderStyles();
  return <Text style={styles.mutedText}>{text}</Text>;
}

/** Icon + lines (address, contact rows). */
export function OrderInfoRows({
  rows,
}: {
  rows: { icon: IconName; lines: string[] }[];
}) {
  const { theme, styles } = useOrderStyles();
  return (
    <View style={styles.infoGap}>
      {rows
        .filter((row) => row.lines.length > 0)
        .map((row) => (
          <View key={`${row.icon}-${row.lines[0]}`} style={styles.infoRow}>
            <MaterialIcons
              name={row.icon}
              size={moderateWidthScale(20)}
              color={theme.buttonBack}
            />
            <View style={styles.infoRowText}>
              {row.lines.map((line) => (
                <Text key={line} style={styles.bodyText} selectable>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
    </View>
  );
}

/** "Ship to" address, or where the order is collected. */
export function OrderDeliveryRows({
  order,
  pickupText,
}: {
  order: ShopOrder;
  pickupText: string;
}) {
  if (isPickupOrder(order)) {
    return <OrderInfoRows rows={[{ icon: "storefront", lines: [pickupText] }]} />;
  }
  return (
    <OrderInfoRows
      rows={[
        {
          icon: "location-on",
          lines: formatOrderAddressLines(order.shippingAddress),
        },
      ]}
    />
  );
}

/** Product photo, or a bag icon when the product has none. */
export function OrderItemThumb({ uri }: { uri: string | null }) {
  const { theme, styles } = useOrderStyles();
  return (
    <View style={styles.itemThumb}>
      <AppImage
        uri={uri}
        style={styles.itemImage}
        resizeMode="cover"
        fallback={
          <View style={styles.itemThumbFallback}>
            <MaterialIcons
              name="shopping-bag"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </View>
        }
      />
    </View>
  );
}

/** Items with quantities, then subtotal / shipping / tax / total. */
export function OrderItemsAndTotals({ order }: { order: ShopOrder }) {
  const { styles } = useOrderStyles();
  const { t } = useTranslation();
  const pickup = isPickupOrder(order);

  return (
    <View>
      <View style={styles.itemsGap}>
        {order.items.map((item) => (
          <View key={item.id || item.productId} style={styles.itemRow}>
            <OrderItemThumb uri={item.productImageUrl} />
            <View style={styles.itemBody}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName}
              </Text>
              <Text style={styles.itemMeta}>
                {`${item.quantity} × ${formatShopPrice(item.unitPrice)}`}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatShopPrice(item.total)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("orderSubtotal")}</Text>
          <Text style={styles.totalValue}>
            {formatShopPrice(order.subtotal)}
          </Text>
        </View>
        {!pickup ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("orderShipping")}</Text>
            <Text style={styles.totalValue}>
              {formatShopPrice(order.shippingAmount)}
            </Text>
          </View>
        ) : null}
        {order.taxAmount > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("orderTax")}</Text>
            <Text style={styles.totalValue}>
              {formatShopPrice(order.taxAmount)}
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>{t("orderTotalLabel")}</Text>
          <Text style={styles.grandValue}>{formatShopPrice(order.total)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Every status change and shipping details edit, oldest first. */
export function OrderHistoryTimeline({ order }: { order: ShopOrder }) {
  const { styles } = useOrderStyles();
  const { t } = useTranslation();

  return (
    <View>
      {order.history.map((entry, index) => {
        const last = index === order.history.length - 1;
        const title = t(getHistoryEntryLabelKey(entry, order.shippingMethod));
        const when = formatOrderDateTime(entry.createdAt);
        const details = getHistoryEntryDetails(entry);
        return (
          <View key={entry.id || `${entry.event}-${index}`} style={styles.historyRow}>
            <View style={styles.historyRail}>
              <View
                style={[styles.historyDot, last && styles.historyDotLatest]}
              />
              {!last ? <View style={styles.historyLine} /> : null}
            </View>
            <View style={[styles.historyBody, last && { paddingBottom: 0 }]}>
              <Text style={styles.historyTitle}>{title}</Text>
              {when ? <Text style={styles.historyDate}>{when}</Text> : null}
              {details ? (
                <Text style={styles.historyDetails} selectable>
                  {details}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Order row for the order lists: number + status, a meta line (customer /
 * date), the first item, delivery method + total, and an optional
 * "Next: …" strip for the owner.
 */
export function OrderSummaryCard({
  order,
  meta,
  nextLabel,
  onPress,
}: {
  order: ShopOrder;
  meta: string;
  nextLabel?: string | null;
  onPress: () => void;
}) {
  const { theme, styles } = useOrderStyles();
  const { t } = useTranslation();
  const { first, moreCount } = getItemsSummary(order.items);
  const pickup = isPickupOrder(order);
  const title = t("orderNumberTitle", { id: order.id });

  return (
    <TouchableOpacity
      style={styles.summaryCard}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, meta, formatShopPrice(order.total), nextLabel]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.summaryBody}>
        <View style={styles.summaryHead}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryNumber} numberOfLines={1}>
              {title}
            </Text>
            <OrderStatusBadge
              status={order.status}
              shippingMethod={order.shippingMethod}
            />
          </View>
          {/* Full width so the badge never squeezes the name and date */}
          {meta ? (
            <Text style={styles.summaryMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        {first ? (
          <View style={styles.itemRow}>
            <OrderItemThumb uri={first.productImageUrl} />
            <View style={styles.summaryItemText}>
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {`${first.productName} × ${first.quantity}`}
              </Text>
              {moreCount > 0 ? (
                <Text style={styles.summaryItemMore}>
                  {t("orderItemsMore", { count: moreCount })}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.summaryBottom}>
          <View style={styles.summaryMethod}>
            <MaterialIcons
              name={pickup ? "storefront" : "local-shipping"}
              size={moderateWidthScale(18)}
              color={theme.buttonBack}
            />
            <Text style={styles.summaryMethodText} numberOfLines={1}>
              {pickup ? t("pickup") : t("orderMethodShipping")}
            </Text>
          </View>
          <Text style={styles.summaryTotal}>{formatShopPrice(order.total)}</Text>
        </View>
      </View>

      {nextLabel ? (
        <View style={styles.nextStrip}>
          <MaterialIcons
            name="arrow-forward"
            size={moderateWidthScale(18)}
            color={theme.orangeBrownText}
          />
          <Text style={styles.nextText} numberOfLines={1}>
            {nextLabel}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
