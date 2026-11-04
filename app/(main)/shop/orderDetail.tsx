import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import { InfoNote, OptionRow } from "@/src/components/reelFlow/flowParts";
import EmptyState from "@/src/components/emptyState";
import {
  OrderDeliveryRows,
  OrderHistoryTimeline,
  OrderItemsAndTotals,
  OrderSection,
  OrderStageCard,
  ShippingDetailsText,
  formatOrderDate,
  formatOrderDateTime,
  getRefundBadgeInfo,
} from "@/src/components/shopOrderParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { fetchCustomerOrder } from "@/src/services/orderService";
import { fetchProduct } from "@/src/services/productService";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import type {
  OrderRefundState,
  ShopOrder,
  ShopOrderItem,
} from "@/src/types/shopOrder";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  getCustomerStageKeys,
  getOrderErrorMessage,
  getRefundReasonLabelKey,
  getRefundStateLabelKey,
  isPickupOrder,
  isRefundStateRefunded,
} from "@/src/utils/shopOrderHelpers";

/**
 * Customer's order: where it is now, the shipping details from the salon
 * (tracking number etc.), what was bought, and the history timeline.
 * Also the cancellation / refund status, the request buttons the server
 * allows (refundActions) and "Write a review" once the order is fulfilled.
 * Order notifications open this screen (GET /api/orders/{order}).
 */
const PENDING_RETRIES = 3;
const PENDING_RETRY_MS = 2000;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(22),
    },
    // ── Refund status card
    refundHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    refundIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
    },
    refundIconWaiting: { backgroundColor: theme.apptBlueBg },
    refundIconDone: { backgroundColor: theme.apptMintBg },
    refundIconStopped: { backgroundColor: theme.lightRed },
    refundHeadText: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(4),
    },
    refundTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    refundText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size21,
    },
    quote: {
      marginTop: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen05,
      gap: moderateHeightScale(4),
    },
    quoteWarm: {
      backgroundColor: theme.upcomingCard,
    },
    quoteLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    quoteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(16),
    },
    requestHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    requestLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    requestDate: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "right",
    },
    requestReason: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    requestNote: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size21,
    },
    photo: {
      marginTop: moderateHeightScale(10),
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.lightGreen05,
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    // ── Help actions
    section: {
      gap: moderateHeightScale(10),
    },
    sectionTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    // ── Write a review (under a fulfilled item)
    reviewBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(38),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(19),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.upcomingCard,
    },
    reviewBtnText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
  });

type Styles = ReturnType<typeof createStyles>;

/** One line under the status title, by state. */
function getRefundStateTextKey(state: OrderRefundState): string | null {
  switch (state) {
    case "cancellation_requested":
    case "refund_requested":
      return "mpOrdRefundWaitingText";
    case "refund_on_the_way":
      return "mpOrdRefundOnTheWayText";
    case "refunded":
      return null; // the title already says it
    case "refunded_by_freshpass":
      return "mpOrdRefundedText";
    case "refund_declined":
      return "mpOrdRefundDeclinedText";
    case "under_review":
      return "mpOrdUnderReviewText";
    case "declined_reviewed":
      return "mpOrdDeclinedReviewedText";
    case "cancelled_not_refunded":
      return "mpOrdCancelledNotRefundedText";
  }
}

function PhotoThumb({
  url,
  label,
  styles,
}: {
  url: string | null;
  label: string;
  styles: Styles;
}) {
  const dispatch = useAppDispatch();
  const uri = resolveApiImageUrl(url);
  if (!uri) return null;
  return (
    <TouchableOpacity
      style={styles.photo}
      activeOpacity={0.85}
      onPress={() => dispatch(openFullImageModal({ images: [uri] }))}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
    >
      <AppImage uri={uri} style={styles.photoImage} resizeMode="cover" />
    </TouchableOpacity>
  );
}

/**
 * Cancellation / refund status: what is happening, the seller's and
 * FreshPass's answers, and what the customer sent.
 */
function RefundStatusCard({
  order,
  styles,
  theme,
}: {
  order: ShopOrder;
  styles: Styles;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const state = order.refundState ?? null;
  const request = order.refundRequest ?? null;
  if (!state && !request) return null;

  const info = state ? getRefundBadgeInfo(state) : null;
  const textKey = state ? getRefundStateTextKey(state) : null;
  const iconColor =
    info?.tone === "done"
      ? theme.darkGreen
      : info?.tone === "stopped"
        ? theme.red
        : theme.apptBlueAccent;
  const reasonLabel = request
    ? (request.reasonLabel ??
      (request.reason ? t(getRefundReasonLabelKey(request.reason)) : null))
    : null;
  const typeLabel = request
    ? t(
        request.type === "cancellation"
          ? "mpOrdRequestTypeCancellation"
          : "mpOrdRequestTypeRefund",
      )
    : "";
  const sentOn = request ? formatOrderDateTime(request.createdAt) : "";
  const escalatedOn = request ? formatOrderDateTime(request.escalatedAt) : "";

  return (
    <OrderSection title={t("mpOrdRefundSection")}>
      {state && info ? (
        <View style={styles.refundHead}>
          <View
            style={[
              styles.refundIcon,
              info.tone === "done"
                ? styles.refundIconDone
                : info.tone === "stopped"
                  ? styles.refundIconStopped
                  : styles.refundIconWaiting,
            ]}
          >
            <MaterialIcons
              name={info.icon}
              size={moderateWidthScale(22)}
              color={iconColor}
            />
          </View>
          <View style={styles.refundHeadText}>
            <Text style={styles.refundTitle} accessibilityRole="header">
              {t(getRefundStateLabelKey(state))}
            </Text>
            {textKey ? <Text style={styles.refundText}>{t(textKey)}</Text> : null}
          </View>
        </View>
      ) : null}

      {request?.sellerResponse ? (
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>{t("mpOrdSellerReason")}</Text>
          <Text style={styles.quoteText} selectable>
            {request.sellerResponse}
          </Text>
        </View>
      ) : null}

      {request?.adminNote ? (
        <View style={[styles.quote, styles.quoteWarm]}>
          <Text style={styles.quoteLabel}>{t("mpOrdFreshpassNote")}</Text>
          <Text style={styles.quoteText} selectable>
            {request.adminNote}
          </Text>
        </View>
      ) : null}

      {request ? (
        <>
          {state ? <View style={styles.divider} /> : null}
          <View style={styles.requestHead}>
            <Text style={styles.requestLabel}>{t("mpOrdYourRequest")}</Text>
            {sentOn ? (
              <Text style={styles.requestDate} numberOfLines={1}>
                {sentOn}
              </Text>
            ) : null}
          </View>
          <Text style={styles.requestReason}>
            {reasonLabel ? `${typeLabel} · ${reasonLabel}` : typeLabel}
          </Text>
          {request.note ? (
            <Text style={styles.requestNote} selectable>
              {request.note}
            </Text>
          ) : null}
          <PhotoThumb
            url={request.photoUrl}
            label={t("rvViewPhoto")}
            styles={styles}
          />

          {request.escalationNote || request.escalationPhotoUrl ? (
            <>
              <View style={styles.divider} />
              <View style={styles.requestHead}>
                <Text style={styles.requestLabel}>
                  {t("mpOrdYourReviewRequest")}
                </Text>
                {escalatedOn ? (
                  <Text style={styles.requestDate} numberOfLines={1}>
                    {escalatedOn}
                  </Text>
                ) : null}
              </View>
              {request.escalationNote ? (
                <Text style={styles.requestNote} selectable>
                  {request.escalationNote}
                </Text>
              ) : null}
              <PhotoThumb
                url={request.escalationPhotoUrl}
                label={t("rvViewPhoto")}
                styles={styles}
              />
            </>
          ) : null}
        </>
      ) : null}
    </OrderSection>
  );
}

function CustomerOrder({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const orderRef = useRef(order);
  orderRef.current = order;
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!orderId) {
        setLoading(false);
        setLoadError(t("orderLoadFailed"));
        return;
      }
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        const next = await fetchCustomerOrder(orderId);
        setOrder(next);
        setLoadError(null);
      } catch (err) {
        // A background retry fails quietly; the order on screen stays
        if (mode === "silent") return;
        const message = getOrderErrorMessage(err, t("somethingWentWrong"));
        if (orderRef.current) {
          showBannerRef.current(t("orderLoadFailed"), message, "error");
        } else {
          setLoadError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, t],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Back from a cancellation / refund request (or a review): show the new state
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (orderRef.current) void load("silent");
    }, [load]),
  );

  const openRequest = useCallback(
    (mode: "cancellation" | "refund" | "escalate") => {
      router.push({
        pathname: "/(main)/shop/refundRequest" as any,
        params: { orderId, mode },
      });
    },
    [orderId, router],
  );

  const openWriteReview = useCallback(
    (item: ShopOrderItem) => {
      router.push({
        pathname: "/(main)/marketplace/writeReview" as any,
        params: {
          productId: item.productId,
          productName: item.productName,
          imageUrl: item.productImageUrl ?? "",
        },
      });
    },
    [router],
  );

  // The order has no seller contact, so the product's seller opens the salon
  // profile, where the customer can chat with them.
  const [openingSeller, setOpeningSeller] = useState(false);
  const contactSeller = useCallback(async () => {
    const productId = orderRef.current?.items[0]?.productId;
    if (openingSeller || !productId) return;
    setOpeningSeller(true);
    try {
      const product = await fetchProduct(productId);
      const sellerId = product.seller?.id ?? product.business_id;
      if (!sellerId) throw new Error("no seller");
      router.push({
        pathname: "/(main)/businessDetail",
        params: { business_id: String(sellerId) },
      });
    } catch {
      showBannerRef.current(
        t("mpOrdContactSellerFailed"),
        t("somethingWentWrong"),
        "error",
      );
    } finally {
      setOpeningSeller(false);
    }
  }, [openingSeller, router, t]);

  const renderHelp = (current: ShopOrder) => {
    const shipping = !isPickupOrder(current);
    const actions = current.refundActions;
    const canCancel = !!actions?.canRequestCancellation;
    const canRefund = !!actions?.canRequestRefund;
    const canEscalate = !!actions?.canEscalate;
    const canContact =
      current.refundState === "cancelled_not_refunded" &&
      current.items.length > 0;
    if (!canCancel && !canRefund && !canEscalate && !canContact) return null;
    const deadline = formatOrderDate(actions?.refundDeadline);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t("mpOrdHelpSection")}
        </Text>
        {canEscalate ? (
          <OptionRow
            icon="support-agent"
            title={t("mpOrdAskReview")}
            subtitle={t("mpOrdAskReviewSub")}
            onPress={() => openRequest("escalate")}
          />
        ) : null}
        {canCancel ? (
          <OptionRow
            icon="cancel"
            title={t("mpOrdRequestCancellation")}
            subtitle={t(
              shipping
                ? "mpOrdRequestCancellationSub"
                : "mpOrdRequestCancellationPickupSub",
            )}
            onPress={() => openRequest("cancellation")}
          />
        ) : null}
        {canRefund ? (
          <OptionRow
            icon="assignment-return"
            title={t("mpOrdRequestRefund")}
            subtitle={
              deadline
                ? t("mpOrdRefundAvailableUntil", { date: deadline })
                : null
            }
            onPress={() => openRequest("refund")}
          />
        ) : null}
        {canContact ? (
          <OptionRow
            icon="chat-bubble-outline"
            title={t("mpOrdContactSeller")}
            subtitle={t("mpOrdContactSellerSub")}
            onPress={() => void contactSeller()}
            disabled={openingSeller}
          />
        ) : null}
        {canCancel || canRefund ? (
          <InfoNote text={t("mpRefundPolicyNote")} />
        ) : null}
      </View>
    );
  };

  // Right after paying, Stripe's webhook can lag a few seconds. While the
  // order is still pending, reload a few times (each GET also makes the
  // backend check the payment with Stripe).
  const pendingRetriesRef = useRef(0);
  useEffect(() => {
    if (order?.status !== "pending") return;
    if (pendingRetriesRef.current >= PENDING_RETRIES) return;
    const timer = setTimeout(() => {
      pendingRetriesRef.current += 1;
      void load("silent");
    }, PENDING_RETRY_MS);
    return () => clearTimeout(timer);
  }, [load, order]);

  const renderOrder = (current: ShopOrder) => {
    const stage = getCustomerStageKeys(current);
    const shipping = !isPickupOrder(current);
    // Reviews open once the order shipped / was picked up, unless refunded
    const canReview =
      (current.status === "shipped" || current.status === "completed") &&
      !isRefundStateRefunded(current.refundState);
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(32) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        <OrderStageCard
          order={current}
          title={t(stage.title)}
          text={t(stage.text)}
        />

        <RefundStatusCard order={current} styles={styles} theme={theme} />

        {renderHelp(current)}

        {shipping && current.shippingDetails ? (
          <OrderSection title={t("orderShippingDetails")}>
            <ShippingDetailsText text={current.shippingDetails} />
          </OrderSection>
        ) : null}

        <OrderSection title={shipping ? t("orderShipTo") : t("pickup")}>
          <OrderDeliveryRows
            order={current}
            pickupText={t("orderPickupCustomerText")}
          />
        </OrderSection>

        <OrderSection title={t("orderItemsSection")}>
          <OrderItemsAndTotals
            order={current}
            itemFooter={
              canReview
                ? (item) =>
                    item.productId ? (
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        activeOpacity={0.75}
                        hitSlop={{ top: 4, bottom: 4 }}
                        onPress={() => openWriteReview(item)}
                        accessibilityRole="button"
                        accessibilityLabel={t("mpOrdWriteReviewA11y", {
                          name: item.productName,
                        })}
                      >
                        <MaterialIcons
                          name="rate-review"
                          size={moderateWidthScale(18)}
                          color={theme.orangeBrownText}
                        />
                        <Text style={styles.reviewBtnText}>
                          {t("writeAReview")}
                        </Text>
                      </TouchableOpacity>
                    ) : null
                : undefined
            }
          />
        </OrderSection>

        {current.history.length > 0 ? (
          <OrderSection title={t("orderHistory")}>
            <OrderHistoryTimeline order={current} />
          </OrderSection>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      <FlowHeader
        title={orderId ? t("orderNumberTitle", { id: orderId }) : ""}
        onBack={() => router.back()}
      />
      {loading && !order ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : !order ? (
        <EmptyState
          icon="error-outline"
          title={t("orderLoadFailed")}
          subtitle={loadError ?? undefined}
          actionTitle={orderId ? t("orderRetry") : undefined}
          onActionPress={orderId ? () => void load("initial") : undefined}
        />
      ) : (
        renderOrder(order)
      )}
    </View>
  );
}

export default function CustomerOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = typeof orderId === "string" ? orderId : "";
  // Another order in the same screen (e.g. a second notification) starts clean
  return <CustomerOrder key={id} orderId={id} />;
}
