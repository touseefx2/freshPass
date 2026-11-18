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
import {
  formatDeadlineDate,
  formatOrderDateTime,
} from "@/src/components/shopOrderParts";
import type {
  BusinessShopOrder,
  OrderEarnings,
  OrderRefundRequest,
  OrderRefundState,
  ShopOrder,
} from "@/src/types/shopOrder";
import {
  getRefundReasonLabelKey,
  getRefundRequestTypeLabelKey,
  getReturnMethodLabelKey,
  isRefundStateAwaitingSeller,
  reasonNeedsReturnMethod,
} from "@/src/utils/shopOrderHelpers";

/**
 * Seller (business mode) pieces for the owner's order screens: earnings,
 * the customer's cancellation / return / problem report, the cancel choice
 * cards, the footer notes and the list badge. Return policy guide
 * § Business Flows.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

// ── Rules ───────────────────────────────────────────────────────────

/** The customer asked and the seller still has to approve or decline. */
export function isRefundAwaitingSeller(
  order: Pick<ShopOrder, "refundState">,
): boolean {
  return isRefundStateAwaitingSeller(order.refundState);
}

/** A cancellation request is open: ship / ready for pickup are blocked (422). */
export function isCancellationRequestOpen(
  order: Pick<ShopOrder, "refundState">,
): boolean {
  return order.refundState === "cancellation_requested";
}

/**
 * Approving refunds at once: a cancellation, or a "never arrived" report
 * (nothing to send back). Returns / other reports wait for confirm-receipt.
 */
export function isImmediateRefundRequest(
  request: Pick<OrderRefundRequest, "type" | "reason"> | null | undefined,
): boolean {
  if (!request) return false;
  return (
    request.type === "cancellation" ||
    (request.type === "report" && request.reason === "never_arrived")
  );
}

/** The returned item comes back (not a cancellation, not "never arrived"). */
function requestHasReturn(
  request: Pick<OrderRefundRequest, "type" | "reason">,
): boolean {
  return request.type !== "cancellation" && reasonNeedsReturnMethod(request.reason);
}

/** List rows that need the seller's eye (badge on the owner's order list). */
export function getOwnerListRefundBadge(
  state: OrderRefundState | null | undefined,
): { labelKey: string; icon: IconName; tone: "action" | "review" } | null {
  switch (state) {
    case "cancellation_requested":
      return {
        labelKey: "mpSelBadgeCancellationRequested",
        icon: "pan-tool",
        tone: "action",
      };
    case "return_requested":
      return {
        labelKey: "mpSelBadgeReturnRequested",
        icon: "assignment-return",
        tone: "action",
      };
    case "problem_reported":
      return {
        labelKey: "mpSelBadgeProblemReported",
        icon: "report-problem",
        tone: "action",
      };
    // The item is coming back: the seller confirms receipt to refund
    case "return_shipped":
      return {
        labelKey: "mpSelBadgeReturnShipped",
        icon: "local-shipping",
        tone: "action",
      };
    case "awaiting_in_person_return":
      return {
        labelKey: "mpSelBadgeInPersonReturn",
        icon: "storefront",
        tone: "action",
      };
    case "under_review":
      return {
        labelKey: "mpSelBadgeUnderReview",
        icon: "gavel",
        tone: "review",
      };
    default:
      return null;
  }
}

/**
 * Title + text of the owner's "what now" card while a cancellation / return /
 * problem report is involved; null keeps the normal status wording.
 */
export function getOwnerRefundStageKeys(
  order: Pick<BusinessShopOrder, "refundState" | "canRefund" | "refundRequest">,
): { title: string; text: string } | null {
  if (order.canRefund) {
    return {
      title: "mpSelStageNotRefundedTitle",
      text: "mpSelStageNotRefundedText",
    };
  }
  switch (order.refundState) {
    case "cancellation_requested":
      return {
        title: "mpSelStageCancelRequestedTitle",
        text: "mpSelStageCancelRequestedText",
      };
    case "return_requested":
      return {
        title: "mpSelStageReturnRequestedTitle",
        text: "mpSelStageReturnRequestedText",
      };
    case "problem_reported":
      return {
        title: "mpSelStageProblemReportedTitle",
        text:
          order.refundRequest?.reason === "never_arrived"
            ? "mpSelStageNeverArrivedText"
            : "mpSelStageProblemReportedText",
      };
    case "return_approved":
      return {
        title: "mpSelStageReturnApprovedTitle",
        text: "mpSelStageReturnApprovedText",
      };
    case "return_shipped":
      return {
        title: "mpSelStageReturnShippedTitle",
        text: "mpSelStageReturnShippedText",
      };
    case "awaiting_in_person_return":
      return {
        title: "mpSelStageInPersonTitle",
        text: "mpSelStageInPersonText",
      };
    case "return_received":
      return {
        title: "mpSelStageReturnReceivedTitle",
        text: "mpSelStageReturnReceivedText",
      };
    case "refund_pending":
      return {
        title: "mpSelStageOnTheWayTitle",
        text: "mpSelStageOnTheWayText",
      };
    case "refunded":
      return {
        title: "mpSelStageRefundedTitle",
        text: "mpSelStageRefundedText",
      };
    case "return_declined":
      return {
        title: "mpSelStageDeclinedTitle",
        text: "mpSelStageDeclinedText",
      };
    case "under_review":
      return {
        title: "mpSelStageUnderReviewTitle",
        text: "mpSelStageUnderReviewText",
      };
    case "refunded_by_freshpass":
      return {
        title: "mpSelStageRefundedByFreshpassTitle",
        text: "mpSelStageRefundedByFreshpassText",
      };
    case "declined_reviewed":
      return {
        title: "mpSelStageDeclinedReviewedTitle",
        text: "mpSelStageDeclinedReviewedText",
      };
    case "cancelled_not_refunded":
      return {
        title: "mpSelStageNotRefundedTitle",
        text: "mpSelStageNotRefundedDoneText",
      };
    default:
      return null;
  }
}

/** Seller wording for where the request stands (pill on the request card). */
function getSellerRequestStateKey(state: OrderRefundState | null | undefined) {
  switch (state) {
    case "cancellation_requested":
    case "return_requested":
    case "problem_reported":
      return "mpSelRequestWaitingOnYou";
    case "return_approved":
      return "mpSelRequestAwaitingItem";
    case "return_shipped":
      return "mpSelRequestItemShipped";
    case "awaiting_in_person_return":
      return "mpSelRequestInPerson";
    case "return_received":
      return "mpSelRequestReceived";
    case "refund_pending":
      return "mpRefundStateRefundPending";
    case "refunded":
      return "mpSelRequestApproved";
    case "return_declined":
      return "mpSelRequestDeclined";
    case "under_review":
      return "mpSelReviewInProgress";
    case "refunded_by_freshpass":
      return "mpRefundStateRefundedByFreshpass";
    case "declined_reviewed":
      return "mpSelRequestDeclineUpheld";
    default:
      return null;
  }
}

/** "$3.20", "−$3.20" (negative net after a refund). */
export function formatSignedPrice(amount: number): string {
  return amount < 0
    ? `−${formatShopPrice(Math.abs(amount))}`
    : formatShopPrice(amount);
}

// ── Styles ──────────────────────────────────────────────────────────

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    cardAction: {
      borderColor: theme.orangeBrown30,
      borderWidth: 1.5,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(12),
    },

    // ── Source chip
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(12),
    },
    chipMarket: { backgroundColor: theme.orangeBrown01 },
    chipReel: { backgroundColor: theme.lightGreen07 },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    chipTextMarket: { color: theme.orangeBrownText },
    chipTextReel: { color: theme.darkGreen },

    // ── Earnings
    moneyRows: {
      gap: moderateHeightScale(10),
    },
    moneyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    moneyLabel: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    moneyValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    moneyPending: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    moneyPendingText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    netLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    netValue: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    netNegative: {
      color: theme.red,
    },
    footNote: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },

    // ── Request card
    requestTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    requestIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.orangeBrown01,
    },
    requestHeadText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    requestTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    requestDate: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    statePill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      marginTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(12),
    },
    statePillWaiting: { backgroundColor: theme.orangeBrown015 },
    statePillGood: { backgroundColor: theme.apptMintBg },
    statePillBad: { backgroundColor: theme.lightRed },
    statePillNeutral: { backgroundColor: theme.apptBlueBg },
    statePillText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    deadline: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown01,
    },
    deadlineLate: {
      backgroundColor: theme.lightRed,
    },
    deadlineText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    deadlineTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    deadlineTitleLate: {
      color: theme.red,
    },
    deadlineSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    fields: {
      gap: moderateHeightScale(12),
      marginTop: moderateHeightScale(14),
    },
    field: {
      gap: moderateHeightScale(3),
    },
    fieldLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    fieldValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    fieldStrong: {
      fontFamily: fonts.fontBold,
    },
    photoButton: {
      alignSelf: "flex-start",
      marginTop: moderateHeightScale(4),
      borderRadius: moderateWidthScale(14),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    photo: {
      width: widthScale(96),
      height: widthScale(96),
    },
    photoFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    photoZoom: {
      position: "absolute",
      right: moderateWidthScale(6),
      bottom: moderateWidthScale(6),
      width: widthScale(26),
      height: widthScale(26),
      borderRadius: widthScale(13),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    subBlock: {
      marginTop: moderateHeightScale(14),
      paddingTop: moderateHeightScale(14),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateHeightScale(12),
    },
    subHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    subTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // ── Choice cards (cancel and refund / without refund)
    choice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      minHeight: heightScale(88),
    },
    choiceSelected: {
      borderColor: theme.darkGreen,
      borderWidth: 2,
      backgroundColor: theme.lightGreen05,
    },
    choiceIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    choiceIconSelected: {
      backgroundColor: theme.darkGreen,
    },
    choiceText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(4),
    },
    choiceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    choiceTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    choiceTag: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.orangeBrown01,
    },
    choiceTagText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    choiceSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    radio: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      borderWidth: 2,
      borderColor: theme.borderDark,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(10),
    },
    radioSelected: {
      borderColor: theme.darkGreen,
    },
    radioDot: {
      width: widthScale(12),
      height: widthScale(12),
      borderRadius: widthScale(6),
      backgroundColor: theme.darkGreen,
    },

    // ── Fee note (under Refund / Approve buttons)
    feeNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(4),
    },
    feeNoteText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
      textAlign: "center",
    },

    // ── List badge
    listBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(14),
    },
    listBadgeAction: {
      backgroundColor: theme.selectCard,
    },
    listBadgeReview: {
      backgroundColor: theme.apptBlueBg,
    },
    listBadgeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
  });

function usePartStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

// ── Source chip ─────────────────────────────────────────────────────

/** "Marketplace" / "Reel": where the order came from (sets the FreshPass fee). */
export function OrderSourceChip({
  source,
  style,
}: {
  source: ShopOrder["source"];
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  if (source !== "marketplace" && source !== "reel") return null;
  const market = source === "marketplace";
  const label = market ? t("mpSelSourceMarketplace") : t("mpSelSourceReel");
  return (
    <View
      style={[styles.chip, market ? styles.chipMarket : styles.chipReel, style]}
      accessible
      accessibilityLabel={t("mpSelSourceA11y", { source: label })}
    >
      <MaterialIcons
        name={market ? "storefront" : "movie"}
        size={moderateWidthScale(15)}
        color={market ? theme.orangeBrownText : theme.darkGreen}
      />
      <Text
        style={[
          styles.chipText,
          market ? styles.chipTextMarket : styles.chipTextReel,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Earnings ────────────────────────────────────────────────────────

function PendingValue() {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.moneyPending}>
      <MaterialIcons
        name="schedule"
        size={moderateWidthScale(16)}
        color={theme.orangeBrownText}
      />
      <Text style={styles.moneyPendingText}>{t("mpFeePending")}</Text>
    </View>
  );
}

/**
 * Seller earnings: gross, FreshPass fee (2% on Marketplace orders), Stripe
 * fee and net. Stripe fee / net stay "Pending" until Stripe reports its fee.
 */
export function OrderEarningsSection({
  earnings,
  source,
}: {
  earnings: OrderEarnings;
  source: ShopOrder["source"];
}) {
  const { styles } = usePartStyles();
  const { t } = useTranslation();
  const feeLabel =
    source === "marketplace"
      ? t("mpSelFeeFreshpassMarketplace")
      : t("mpSelFeeFreshpass");
  const pending = earnings.stripeFee == null || earnings.net == null;
  const negativeNet = earnings.net != null && earnings.net < 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t("mpSelEarningsTitle")}
        </Text>
        <OrderSourceChip source={source} />
      </View>
      <View style={styles.card}>
        <View style={styles.moneyRows}>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>{t("mpSelGross")}</Text>
            <Text style={styles.moneyValue}>
              {formatSignedPrice(earnings.gross)}
            </Text>
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>{feeLabel}</Text>
            <Text style={styles.moneyValue}>
              {formatSignedPrice(-Math.abs(earnings.platformFee))}
            </Text>
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>{t("mpSelFeeStripe")}</Text>
            {earnings.stripeFee == null ? (
              <PendingValue />
            ) : (
              <Text style={styles.moneyValue}>
                {formatSignedPrice(-Math.abs(earnings.stripeFee))}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.divider} />
        <View
          style={styles.moneyRow}
          accessible
          accessibilityLabel={`${t("mpSelNet")}, ${
            earnings.net == null
              ? t("mpFeePending")
              : formatSignedPrice(earnings.net)
          }`}
        >
          <Text style={styles.netLabel}>{t("mpSelNet")}</Text>
          {earnings.net == null ? (
            <PendingValue />
          ) : (
            <Text style={[styles.netValue, negativeNet && styles.netNegative]}>
              {formatSignedPrice(earnings.net)}
            </Text>
          )}
        </View>
        {pending ? (
          <Text style={styles.footNote}>{t("mpSelEarningsPendingNote")}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Customer request ────────────────────────────────────────────────

function RequestPhoto({
  uri,
  label,
  onOpen,
}: {
  uri: string;
  label: string;
  onOpen: (uri: string) => void;
}) {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.photoButton}
      activeOpacity={0.8}
      onPress={() => onOpen(uri)}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityHint={t("mpSelPhotoEnlargeHint")}
    >
      <AppImage
        uri={uri}
        style={styles.photo}
        resizeMode="cover"
        fallback={
          <View style={[styles.photo, styles.photoFallback]}>
            <MaterialIcons
              name="image"
              size={moderateWidthScale(28)}
              color={theme.lightGreen}
            />
          </View>
        }
      />
      <View style={styles.photoZoom} pointerEvents="none">
        <MaterialIcons
          name="zoom-out-map"
          size={moderateWidthScale(15)}
          color={theme.white}
        />
      </View>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string | null | undefined;
  strong?: boolean;
}) {
  const { styles } = usePartStyles();
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, strong && styles.fieldStrong]} selectable>
        {value}
      </Text>
    </View>
  );
}

/** Is an ISO time already behind us? (unparseable → no) */
function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return Number.isFinite(time) && time < Date.now();
}

/**
 * The customer's cancellation / return / problem report: type, reason, note,
 * photo, how the item comes back and who pays for it, the 3-business-day
 * reply deadline, the return's tracking / delivery / receipt, the seller's
 * answer and — once escalated — FreshPass's review. Read-only; the buttons
 * live in the screen's footer.
 */
export function RefundRequestSection({
  request,
  refundState,
  needsReceipt = false,
  onOpenPhoto,
}: {
  request: OrderRefundRequest;
  refundState: OrderRefundState | null | undefined;
  /** `canConfirmReceipt`: the seller must confirm the item came back. */
  needsReceipt?: boolean;
  onOpenPhoto: (uri: string) => void;
}) {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  const awaitingSeller = isRefundStateAwaitingSeller(refundState);
  const waiting = awaitingSeller || needsReceipt;
  const stateKey = getSellerRequestStateKey(refundState);
  const reason =
    request.reasonLabel ??
    (request.reason ? t(getRefundReasonLabelKey(request.reason)) : null);
  const asked = formatOrderDateTime(request.createdAt);
  const typeLabel = t(getRefundRequestTypeLabelKey(request.type));
  const hasReturn = requestHasReturn(request);
  const returnMethod =
    hasReturn && request.returnMethod
      ? t(getReturnMethodLabelKey(request.returnMethod))
      : null;
  const paidBy =
    hasReturn && request.returnShippingPaidBy && request.returnMethod !== "in_person"
      ? t(
          request.returnShippingPaidBy === "seller"
            ? "mpSelPaidByYou"
            : "mpSelPaidByCustomer",
        )
      : null;
  const deadline = awaitingSeller
    ? formatDeadlineDate(request.sellerDeadlineAt)
    : "";
  const deadlinePassed = !!deadline && isPast(request.sellerDeadlineAt);
  const shippedBack =
    !!request.trackingNumber ||
    !!request.carrierDeliveredAt ||
    !!request.sellerReceivedAt;
  const escalated =
    !!request.escalatedAt ||
    !!request.escalationNote ||
    refundState === "under_review" ||
    refundState === "refunded_by_freshpass" ||
    refundState === "declined_reviewed";

  const pillTone =
    refundState === "refunded" ||
    refundState === "refunded_by_freshpass" ||
    refundState === "return_received" ||
    refundState === "refund_pending"
      ? { box: styles.statePillGood, color: theme.darkGreen, icon: "check-circle" as IconName }
      : refundState === "return_declined" || refundState === "declined_reviewed"
        ? { box: styles.statePillBad, color: theme.red, icon: "block" as IconName }
        : refundState === "under_review"
          ? { box: styles.statePillNeutral, color: theme.apptBlueAccent, icon: "gavel" as IconName }
          : { box: styles.statePillWaiting, color: theme.orangeBrownText, icon: "schedule" as IconName };

  const outcomeKey =
    refundState === "refunded_by_freshpass"
      ? "mpRefundStateRefundedByFreshpass"
      : refundState === "declined_reviewed"
        ? "mpSelRequestDeclineUpheld"
        : refundState === "under_review"
          ? "mpSelReviewInProgress"
          : null;

  const headIcon: IconName =
    request.type === "cancellation"
      ? "pan-tool"
      : request.type === "report"
        ? "report-problem"
        : "assignment-return";
  const headTitle =
    request.type === "cancellation"
      ? t("mpSelRequestCancellationTitle")
      : request.type === "report"
        ? t("mpSelRequestReportTitle")
        : t("mpSelRequestReturnTitle");

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t("mpSelRequestSection")}
        </Text>
      </View>
      <View style={[styles.card, waiting && styles.cardAction]}>
        <View style={styles.requestTop}>
          <View style={styles.requestIcon}>
            <MaterialIcons
              name={headIcon}
              size={moderateWidthScale(22)}
              color={theme.selectCard}
            />
          </View>
          <View style={styles.requestHeadText}>
            <Text style={styles.requestTitle}>{headTitle}</Text>
            <Text style={styles.requestDate}>
              {asked
                ? `${typeLabel} · ${t("mpSelRequestAskedOn", { date: asked })}`
                : typeLabel}
            </Text>
          </View>
        </View>

        {stateKey ? (
          <View style={[styles.statePill, pillTone.box]}>
            <MaterialIcons
              name={pillTone.icon}
              size={moderateWidthScale(15)}
              color={pillTone.color}
            />
            <Text style={[styles.statePillText, { color: pillTone.color }]}>
              {t(stateKey)}
            </Text>
          </View>
        ) : null}

        {deadline ? (
          <View
            style={[styles.deadline, deadlinePassed && styles.deadlineLate]}
            accessible
          >
            <MaterialIcons
              name={deadlinePassed ? "error-outline" : "timer"}
              size={moderateWidthScale(20)}
              color={deadlinePassed ? theme.red : theme.orangeBrownText}
            />
            <View style={styles.deadlineText}>
              <Text
                style={[
                  styles.deadlineTitle,
                  deadlinePassed && styles.deadlineTitleLate,
                ]}
              >
                {deadlinePassed
                  ? t("mpSelRespondOverdue", { date: deadline })
                  : t("mpSelRespondBy", { date: deadline })}
              </Text>
              <Text style={styles.deadlineSub}>
                {deadlinePassed
                  ? t("mpSelRespondOverdueNote")
                  : t("mpSelRespondByNote")}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.fields}>
          <Field label={t("reason")} value={reason} strong />
          <Field label={t("mpSelCustomerNote")} value={request.note} />
          {request.photoUrl ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("mpSelCustomerPhoto")}</Text>
              <RequestPhoto
                uri={request.photoUrl}
                label={t("mpSelCustomerPhoto")}
                onOpen={onOpenPhoto}
              />
            </View>
          ) : null}
          {!reason && !request.note && !request.photoUrl ? (
            <Text style={styles.fieldValue}>{t("mpSelNoReasonGiven")}</Text>
          ) : null}
          <Field label={t("mpSelReturnMethod")} value={returnMethod} />
          <Field label={t("mpSelReturnShippingPaidBy")} value={paidBy} />
        </View>

        {shippedBack ? (
          <View style={styles.subBlock}>
            <View style={styles.subHead}>
              <MaterialIcons
                name={
                  request.returnMethod === "in_person"
                    ? "storefront"
                    : "local-shipping"
                }
                size={moderateWidthScale(20)}
                color={theme.buttonBack}
              />
              <Text style={styles.subTitle}>{t("mpSelReturnItemTitle")}</Text>
            </View>
            <Field
              label={t("mpSelTrackingNumber")}
              value={request.trackingNumber}
              strong
            />
            <Field
              label={t("mpSelCarrierDeliveredOn")}
              value={formatOrderDateTime(request.carrierDeliveredAt)}
            />
            <Field
              label={t("mpSelReceivedOn")}
              value={formatOrderDateTime(request.sellerReceivedAt)}
            />
          </View>
        ) : null}

        {request.sellerResponse ? (
          <View style={styles.subBlock}>
            <View style={styles.subHead}>
              <MaterialIcons
                name="reply"
                size={moderateWidthScale(20)}
                color={theme.buttonBack}
              />
              <Text style={styles.subTitle}>{t("mpSelYourAnswer")}</Text>
            </View>
            <Field
              label={formatOrderDateTime(request.respondedAt) || t("mpSelYourAnswer")}
              value={request.sellerResponse}
            />
          </View>
        ) : null}

        {escalated ? (
          <View style={styles.subBlock}>
            <View style={styles.subHead}>
              <MaterialIcons
                name="gavel"
                size={moderateWidthScale(20)}
                color={theme.apptBlueAccent}
              />
              <Text style={styles.subTitle}>{t("mpSelReviewTitle")}</Text>
            </View>
            <Field
              label={t("mpSelEscalatedOn")}
              value={formatOrderDateTime(request.escalatedAt)}
            />
            <Field
              label={t("mpSelEscalationNote")}
              value={request.escalationNote}
            />
            {request.escalationPhotoUrl ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>
                  {t("mpSelEscalationPhoto")}
                </Text>
                <RequestPhoto
                  uri={request.escalationPhotoUrl}
                  label={t("mpSelEscalationPhoto")}
                  onOpen={onOpenPhoto}
                />
              </View>
            ) : null}
            <Field
              label={t("mpSelReviewOutcome")}
              value={outcomeKey ? t(outcomeKey) : null}
              strong
            />
            <Field label={t("mpSelAdminNote")} value={request.adminNote} />
            <Field
              label={t("mpSelResolvedOn")}
              value={formatOrderDateTime(request.resolvedAt)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Cancel choice ───────────────────────────────────────────────────

/** Radio card for "Cancel and refund" / "Cancel without refund". */
export function CancelChoiceCard({
  icon,
  title,
  text,
  tag,
  selected,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  /** Small label next to the title (e.g. "Recommended"). */
  tag?: string | null;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { theme, styles } = usePartStyles();
  return (
    <TouchableOpacity
      style={[styles.choice, selected && styles.choiceSelected]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected, disabled }}
      accessibilityLabel={[title, tag, text].filter(Boolean).join(", ")}
    >
      <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(22)}
          color={selected ? theme.white : theme.darkGreen}
        />
      </View>
      <View style={styles.choiceText}>
        <View style={styles.choiceTitleRow}>
          <Text style={styles.choiceTitle}>{title}</Text>
          {tag ? (
            <View style={styles.choiceTag}>
              <Text style={styles.choiceTagText}>{tag}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.choiceSub}>{text}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Fee note ────────────────────────────────────────────────────────

/**
 * Small centred note under a footer button. Default: "The Stripe processing
 * fee is not returned on refunds." — under every Refund / Approve button.
 */
export function StripeFeeNote({
  style,
  text,
  icon = "info-outline",
}: {
  style?: StyleProp<ViewStyle>;
  /** Other wording (e.g. the auto-confirm note under Confirm receipt). */
  text?: string;
  icon?: IconName;
}) {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.feeNote, style]}>
      <MaterialIcons
        name={icon}
        size={moderateWidthScale(16)}
        color={theme.lightGreen}
      />
      <Text style={styles.feeNoteText}>
        {text ?? t("mpStripeFeeNotRefunded")}
      </Text>
    </View>
  );
}

// ── List badge ──────────────────────────────────────────────────────

/** Icon + text pill over an owner list row that needs a look. */
export function OrderRefundListBadge({
  refundState,
}: {
  refundState: OrderRefundState | null | undefined;
}) {
  const { theme, styles } = usePartStyles();
  const { t } = useTranslation();
  const badge = getOwnerListRefundBadge(refundState);
  if (!badge) return null;
  const action = badge.tone === "action";
  const color = action ? theme.white : theme.apptBlueAccent;
  return (
    <View
      style={[
        styles.listBadge,
        action ? styles.listBadgeAction : styles.listBadgeReview,
      ]}
    >
      <MaterialIcons
        name={badge.icon}
        size={moderateWidthScale(15)}
        color={color}
      />
      <Text style={[styles.listBadgeText, { color }]} numberOfLines={1}>
        {t(badge.labelKey)}
      </Text>
    </View>
  );
}
