import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { FlowTitle, InfoNote } from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import EmptyState from "@/src/components/emptyState";
import {
  OrderDeliveryRows,
  OrderHistoryTimeline,
  OrderInfoRows,
  OrderItemsAndTotals,
  OrderMutedText,
  OrderSection,
  OrderStageCard,
  ShippingDetailsText,
} from "@/src/components/shopOrderParts";
import {
  CancelChoiceCard,
  OrderEarningsSection,
  RefundRequestSection,
  StripeFeeNote,
  getOwnerRefundStageKeys,
  isCancellationRequestOpen,
  isRefundAwaitingSeller,
} from "@/src/components/ownerOrderRefundParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppDispatch } from "@/src/hooks/hooks";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  fetchBusinessOrder,
  refundBusinessOrder,
  respondToRefundRequest,
  saveOrderShippingDetails,
  updateOrderStatus,
} from "@/src/services/orderService";
import type {
  BusinessShopOrder,
  ShopOrderNextStatus,
} from "@/src/types/shopOrder";
import {
  SHIPPING_DETAILS_MAX_LENGTH,
  canSaveShippingDetails,
  getOrderActionLabelKey,
  getOrderErrorMessage,
  getOrderStepProgress,
  getOwnerStageKeys,
  getShipDetailsToSend,
  isPickupOrder,
  splitNextStatuses,
} from "@/src/utils/shopOrderHelpers";

/**
 * Owner's order screen, one step at a time:
 * overview ("what now" card + one button per `nextStatuses` value) →
 * "Mark as shipped" step with the shipping details box (sent in the same call),
 * or the shipping details step on its own (PUT, any time it's allowed).
 * Cancel opens a step to choose "Cancel and refund" / "Cancel without refund";
 * a customer's cancellation / refund request is answered from the overview
 * (Approve & refund) or the decline step (reason required).
 */
type OrderView = "overview" | "ship" | "details" | "cancel" | "decline";

type Busy =
  | ShopOrderNextStatus
  | "details"
  | "approve"
  | "decline"
  | "refund"
  | null;

/** Max length of the decline reason the customer sees. */
const DECLINE_RESPONSE_MAX_LENGTH = 1000;

const SUCCESS_KEYS: Record<ShopOrderNextStatus, string> = {
  shipped: "orderShippedSuccess",
  ready_for_pickup: "orderReadySuccess",
  completed: "orderPickedUpSuccess",
  cancelled: "orderCancelledSuccess",
};

const ACTION_ICONS: Record<
  ShopOrderNextStatus,
  React.ComponentProps<typeof FlowButton>["icon"]
> = {
  shipped: "local-shipping",
  ready_for_pickup: "storefront",
  completed: "task-alt",
  cancelled: undefined,
};

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
    stepContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(22),
    },
    stepGap: {
      gap: moderateHeightScale(12),
    },
    // Same frame as FlowFooter, with one button per next status
    actions: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateHeightScale(6),
    },
  });

function BusinessOrderDetail({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();

  const [order, setOrder] = useState<BusinessShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<OrderView>("overview");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  // Cancel step choice; the server's default is a refund
  const [cancelRefund, setCancelRefund] = useState(true);
  const [declineDraft, setDeclineDraft] = useState("");

  const busyRef = useRef<Busy>(null);
  // Which step the draft was typed for; going back and in again keeps it
  const draftStepRef = useRef<"ship" | "details" | null>(null);
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
        const next = await fetchBusinessOrder(orderId);
        setOrder(next);
        setLoadError(null);
      } catch (err) {
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

  // A reload moved the order on (request answered elsewhere, already
  // cancelled): leave a step that no longer applies
  useEffect(() => {
    if (!order) return;
    if (view === "decline" && !isRefundAwaitingSeller(order)) {
      setView("overview");
    } else if (view === "cancel" && !order.nextStatuses.includes("cancelled")) {
      setView("overview");
    }
  }, [order, view]);

  const startBusy = (value: Exclude<Busy, null>) => {
    busyRef.current = value;
    setBusy(value);
  };

  const endBusy = () => {
    busyRef.current = null;
    setBusy(null);
  };

  const onUpdateFailed = (err: unknown) => {
    showBanner(
      t("orderUpdateFailed"),
      getOrderErrorMessage(err, t("somethingWentWrong")),
      "error",
    );
    // 422: the order may have moved on elsewhere — reload so the steps match
    if ((err as { status?: number } | null)?.status === 422) {
      setView("overview");
      void load("silent");
    }
  };

  const runStatusUpdate = async (
    status: ShopOrderNextStatus,
    shippingDetails?: string,
    options?: { refund?: boolean },
  ) => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    startBusy(status);
    try {
      const updated = await updateOrderStatus(
        current.id,
        status,
        shippingDetails,
        options,
      );
      setOrder(updated);
      draftStepRef.current = null;
      setView("overview");
      showBanner(
        t("orderUpdatedTitle"),
        status === "cancelled" && options?.refund
          ? t("mpSelCancelRefundSuccess")
          : t(SUCCESS_KEYS[status]),
        "success",
      );
    } catch (err) {
      onUpdateFailed(err);
    } finally {
      endBusy();
    }
  };

  const saveDetails = async () => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    if (!canSaveShippingDetails(draft, current.shippingDetails)) return;
    startBusy("details");
    try {
      const updated = await saveOrderShippingDetails(current.id, draft.trim());
      setOrder(updated);
      draftStepRef.current = null;
      setView("overview");
      showBanner(
        t("orderUpdatedTitle"),
        t("orderDetailsSavedSuccess"),
        "success",
      );
    } catch (err) {
      onUpdateFailed(err);
    } finally {
      endBusy();
    }
  };

  /** Approve (full refund) or decline (reason shown to the customer). */
  const answerRequest = async (decision: "approve" | "decline") => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    const response = declineDraft.trim();
    if (decision === "decline" && !response) return;
    startBusy(decision);
    try {
      const updated = await respondToRefundRequest(current.id, {
        decision,
        response: decision === "decline" ? response : undefined,
      });
      setOrder(updated);
      if (decision === "decline") setDeclineDraft("");
      setView("overview");
      showBanner(
        t("orderUpdatedTitle"),
        decision === "approve"
          ? t("mpSelApproveSuccess")
          : t("mpSelDeclineSuccess"),
        "success",
      );
    } catch (err) {
      const fieldError = (
        err as { data?: { errors?: { response?: unknown } } } | null
      )?.data?.errors?.response;
      if (decision === "decline" && fieldError) {
        // Reason rejected (e.g. too long): stay on the step to fix it
        showBanner(
          t("orderUpdateFailed"),
          Array.isArray(fieldError)
            ? String(fieldError[0])
            : String(fieldError),
          "error",
        );
      } else {
        onUpdateFailed(err);
      }
    } finally {
      endBusy();
    }
  };

  /** Refund later: cancelled without a refund (`canRefund`). */
  const runRefund = async () => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    startBusy("refund");
    try {
      const updated = await refundBusinessOrder(current.id);
      setOrder(updated);
      showBanner(t("orderUpdatedTitle"), t("mpSelRefundSuccess"), "success");
    } catch (err) {
      onUpdateFailed(err);
    } finally {
      endBusy();
    }
  };

  const confirmApprove = () => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    const amount = formatShopPrice(current.total);
    Alert.alert(
      t("mpSelConfirmApproveTitle"),
      `${t(
        current.refundRequest?.type === "cancellation"
          ? "mpSelConfirmApproveCancelMessage"
          : "mpSelConfirmApproveRefundMessage",
        { id: current.id, amount },
      )}\n\n${t("mpStripeFeeNotRefunded")}`,
      [
        { text: t("notNow"), style: "cancel" },
        {
          text: t("mpSelApproveAndRefund"),
          onPress: () => void answerRequest("approve"),
        },
      ],
    );
  };

  const confirmRefund = () => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    Alert.alert(
      t("mpSelConfirmRefundTitle"),
      `${t("mpSelConfirmRefundMessage", {
        id: current.id,
        amount: formatShopPrice(current.total),
      })}\n\n${t("mpStripeFeeNotRefunded")}`,
      [
        { text: t("notNow"), style: "cancel" },
        {
          text: t("mpSelRefund"),
          onPress: () => void runRefund(),
        },
      ],
    );
  };

  const confirmCancel = () => {
    const current = orderRef.current;
    if (!current || busyRef.current) return;
    const refund = cancelRefund;
    const params = { id: current.id, amount: formatShopPrice(current.total) };
    Alert.alert(
      t("orderConfirmCancelTitle"),
      refund
        ? `${t("mpSelConfirmCancelRefundMessage", params)}\n\n${t(
            "mpStripeFeeNotRefunded",
          )}`
        : t("mpSelConfirmCancelNoRefundMessage", params),
      [
        { text: t("orderKeepOrder"), style: "cancel" },
        {
          text: refund ? t("mpSelCancelAndRefund") : t("mpSelCancelNoRefund"),
          style: "destructive",
          onPress: () =>
            void runStatusUpdate("cancelled", undefined, { refund }),
        },
      ],
    );
  };

  const openPhoto = (uri: string) => {
    dispatch(openFullImageModal({ images: [uri] }));
  };

  const openDetailsStep = (next: "ship" | "details") => {
    if (draftStepRef.current !== next) {
      setDraft(order?.shippingDetails ?? "");
      draftStepRef.current = next;
    }
    setView(next);
  };

  const onAction = (status: ShopOrderNextStatus) => {
    if (!order || busyRef.current) return;
    const params = { id: order.id };
    switch (status) {
      case "shipped":
        openDetailsStep("ship");
        return;
      case "ready_for_pickup":
        Alert.alert(
          t("orderConfirmReadyTitle"),
          t("orderConfirmReadyMessage", params),
          [
            { text: t("notNow"), style: "cancel" },
            {
              text: t("orderConfirmReadyCta"),
              onPress: () => void runStatusUpdate("ready_for_pickup"),
            },
          ],
        );
        return;
      case "completed":
        Alert.alert(
          t("orderConfirmPickedUpTitle"),
          t("orderConfirmPickedUpMessage", params),
          [
            { text: t("notNow"), style: "cancel" },
            {
              text: t("orderConfirmPickedUpCta"),
              onPress: () => void runStatusUpdate("completed"),
            },
          ],
        );
        return;
      case "cancelled":
        // Choose refund or not on its own step (refund preselected)
        setCancelRefund(true);
        setView("cancel");
        return;
    }
  };

  // Back (header, Android button, iOS swipe): a step goes back to the order;
  // nothing leaves while an update is being sent. Resets (sign-out) go through.
  usePreventRemove(view !== "overview" || busy !== null, ({ data }) => {
    const type = data.action.type;
    if (type !== "GO_BACK" && type !== "POP") {
      navigation.dispatch(data.action);
      return;
    }
    if (busyRef.current) return;
    setView("overview");
  });

  const onHeaderBack = () => {
    if (busyRef.current) return;
    if (view !== "overview") {
      setView("overview");
      return;
    }
    router.back();
  };

  const headerTitle =
    view === "ship"
      ? t("orderActionMarkShipped")
      : view === "details"
        ? t("orderShippingDetails")
        : view === "cancel"
          ? t("orderActionCancel")
          : view === "decline"
            ? t("mpSelDeclineTitle")
            : orderId
          ? t("orderNumberTitle", { id: orderId })
          : t("ordersTitle");

  const actionsFrame = (children: React.ReactNode) => (
    <View
      style={[
        styles.actions,
        {
          paddingBottom:
            Math.max(insets.bottom, moderateHeightScale(14)) +
            moderateHeightScale(4),
        },
      ]}
    >
      {children}
    </View>
  );

  const renderActions = (current: BusinessShopOrder) => {
    // The customer asked: answer first (ship / ready stay blocked meanwhile)
    if (isRefundAwaitingSeller(current)) {
      return actionsFrame(
        <>
          <FlowButton
            label={t("mpSelDecline")}
            variant="outline"
            icon="close"
            trailingIcon="chevron-right"
            disabled={busy !== null}
            onPress={() => {
              if (busyRef.current) return;
              setView("decline");
            }}
          />
          <FlowButton
            label={t("mpSelApproveAndRefund")}
            icon="check"
            loading={busy === "approve"}
            disabled={busy !== null && busy !== "approve"}
            onPress={confirmApprove}
          />
          <StripeFeeNote />
        </>,
      );
    }
    // Cancelled without a refund: refund later
    if (current.canRefund) {
      return actionsFrame(
        <>
          <FlowButton
            label={t("mpSelRefundAmount", {
              amount: formatShopPrice(current.total),
            })}
            icon="currency-exchange"
            loading={busy === "refund"}
            disabled={busy !== null && busy !== "refund"}
            onPress={confirmRefund}
          />
          <StripeFeeNote />
        </>,
      );
    }
    const { forward, canCancel } = splitNextStatuses(current.nextStatuses);
    // No buttons when nothing is left to do
    if (forward.length === 0 && !canCancel) return null;
    const buttonFor = (status: ShopOrderNextStatus, index: number) => (
      <FlowButton
        key={status}
        label={t(getOrderActionLabelKey(status))}
        variant={index === 0 ? "primary" : "outline"}
        icon={ACTION_ICONS[status]}
        // "Mark as shipped" opens one more step (the details box)
        trailingIcon={status === "shipped" ? "chevron-right" : undefined}
        loading={busy === status}
        disabled={busy !== null && busy !== status}
        onPress={() => onAction(status)}
      />
    );
    return actionsFrame(
      <>
        {forward.map(buttonFor)}
        {canCancel ? (
          <FlowButton
            label={t("orderActionCancel")}
            variant="text"
            compact
            danger
            loading={busy === "cancelled"}
            disabled={busy !== null && busy !== "cancelled"}
            onPress={() => onAction("cancelled")}
          />
        ) : null}
      </>,
    );
  };

  const renderOverview = (current: BusinessShopOrder) => {
    const stage = getOwnerRefundStageKeys(current) ?? getOwnerStageKeys(current);
    const shipping = !isPickupOrder(current);
    const showShippingDetails =
      shipping && (!!current.shippingDetails || current.canEditShippingDetails);
    const customer = current.customer;
    const actions = renderActions(current);

    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: actions
                ? moderateHeightScale(24)
                : insets.bottom + moderateHeightScale(32),
            },
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
          {current.refundError ? (
            <InfoNote
              tone="error"
              icon="error-outline"
              title={t("mpSelRefundFailedTitle")}
              text={`${current.refundError}\n${t("mpRefundErrorRetry")}`}
            />
          ) : null}

          <OrderStageCard
            order={current}
            title={t(stage.title)}
            text={t(stage.text)}
          />

          {isCancellationRequestOpen(current) ? (
            <InfoNote
              tone="warm"
              icon="pan-tool"
              text={t("mpSelCancelRequestBlocksShipping")}
            />
          ) : null}

          {current.refundRequest ? (
            <RefundRequestSection
              request={current.refundRequest}
              refundState={current.refundState}
              onOpenPhoto={openPhoto}
            />
          ) : null}

          {showShippingDetails ? (
            <OrderSection
              title={t("orderShippingDetails")}
              action={
                current.canEditShippingDetails
                  ? {
                      label: current.shippingDetails
                        ? t("edit")
                        : t("orderShippingDetailsAdd"),
                      icon: current.shippingDetails ? "edit" : "add",
                      onPress: () => openDetailsStep("details"),
                    }
                  : null
              }
            >
              {current.shippingDetails ? (
                <ShippingDetailsText text={current.shippingDetails} />
              ) : (
                <OrderMutedText text={t("orderShippingDetailsEmpty")} />
              )}
            </OrderSection>
          ) : null}

          <OrderSection title={shipping ? t("orderShipTo") : t("pickup")}>
            <OrderDeliveryRows
              order={current}
              pickupText={t("orderPickupOwnerText")}
            />
          </OrderSection>

          {customer ? (
            <OrderSection title={t("orderCustomer")}>
              <OrderInfoRows
                rows={[
                  {
                    icon: "person-outline",
                    lines: customer.name ? [customer.name] : [],
                  },
                  {
                    icon: "phone",
                    lines: customer.phone ? [customer.phone] : [],
                  },
                  {
                    icon: "mail-outline",
                    lines: customer.email ? [customer.email] : [],
                  },
                ]}
              />
            </OrderSection>
          ) : null}

          <OrderSection title={t("orderItemsSection")}>
            <OrderItemsAndTotals order={current} />
          </OrderSection>

          {current.earnings ? (
            <OrderEarningsSection
              earnings={current.earnings}
              source={current.source}
            />
          ) : null}

          {current.history.length > 0 ? (
            <OrderSection title={t("orderHistory")}>
              <OrderHistoryTimeline order={current} />
            </OrderSection>
          ) : null}
        </ScrollView>
        {actions}
      </>
    );
  };

  const renderDetailsStep = (current: BusinessShopOrder) => {
    const shipStep = view === "ship";
    const canSave = canSaveShippingDetails(draft, current.shippingDetails);
    return (
      <>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.stepContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(32)}
        >
          <FlowTitle
            title={
              shipStep ? t("orderShipStepTitle") : t("orderEditDetailsTitle")
            }
            subtitle={
              shipStep
                ? t("orderShipStepSubtitle")
                : t("orderEditDetailsSubtitle")
            }
          />
          <FlowTextField
            label={t("orderShippingDetails")}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxCount={SHIPPING_DETAILS_MAX_LENGTH}
            placeholder={t("orderShippingDetailsPlaceholder")}
            // Tracking numbers and links: no auto-caps / autocorrect
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={busy === null}
            autoFocus={!shipStep}
          />
          {shipStep ? (
            <OrderSection title={t("orderShipTo")}>
              <OrderDeliveryRows
                order={current}
                pickupText={t("orderPickupOwnerText")}
              />
            </OrderSection>
          ) : null}
        </KeyboardAwareScrollView>

        <View>
          {shipStep ? (
            <FlowFooter
              primary={{
                label: t("orderActionMarkShipped"),
                icon: "local-shipping",
                loading: busy === "shipped",
                onPress: () =>
                  void runStatusUpdate(
                    "shipped",
                    getShipDetailsToSend(draft, current.shippingDetails),
                  ),
              }}
              hint={t("orderShipStepHint")}
            />
          ) : (
            <FlowFooter
              primary={{
                label: t("orderSaveDetails"),
                icon: "check",
                loading: busy === "details",
                disabled: !canSave,
                onPress: () => void saveDetails(),
              }}
              hint={
                draft.trim()
                  ? t("orderSaveDetailsHint")
                  : t("orderDetailsRequired")
              }
            />
          )}
        </View>
      </>
    );
  };

  const renderCancelStep = (current: BusinessShopOrder) => {
    const amount = formatShopPrice(current.total);
    const choosing = busy === null;
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("orderConfirmCancelTitle")}
            subtitle={t("mpSelCancelStepSubtitle", { id: current.id, amount })}
          />
          <View style={styles.stepGap} accessibilityRole="radiogroup">
            <CancelChoiceCard
              icon="currency-exchange"
              title={t("mpSelCancelAndRefund")}
              text={t("mpSelCancelAndRefundText", { amount })}
              tag={t("recommended")}
              selected={cancelRefund}
              disabled={!choosing}
              onPress={() => setCancelRefund(true)}
            />
            <CancelChoiceCard
              icon="money-off"
              title={t("mpSelCancelNoRefund")}
              text={t("mpSelCancelNoRefundText")}
              selected={!cancelRefund}
              disabled={!choosing}
              onPress={() => setCancelRefund(false)}
            />
          </View>
          <InfoNote
            icon={cancelRefund ? "inventory-2" : "undo"}
            tone={cancelRefund ? "info" : "warm"}
            text={
              cancelRefund
                ? t("mpSelCancelStockNote")
                : `${t("mpSelCancelNoRefundNote")} ${t("mpSelCancelStockNote")}`
            }
          />
        </ScrollView>
        <View>
          <FlowFooter
            primary={{
              label: cancelRefund
                ? t("mpSelCancelAndRefund")
                : t("mpSelCancelNoRefund"),
              icon: cancelRefund ? "currency-exchange" : "cancel",
              loading: busy === "cancelled",
              onPress: confirmCancel,
            }}
            tertiary={{
              label: t("orderKeepOrder"),
              disabled: busy !== null,
              onPress: () => {
                if (busyRef.current) return;
                setView("overview");
              },
            }}
            hint={cancelRefund ? t("mpStripeFeeNotRefunded") : null}
          />
        </View>
      </>
    );
  };

  const renderDeclineStep = (current: BusinessShopOrder) => {
    const request = current.refundRequest;
    const canSend = declineDraft.trim().length > 0;
    return (
      <>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.stepContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(32)}
        >
          <FlowTitle
            title={
              request?.type === "cancellation"
                ? t("mpSelDeclineCancellationTitle")
                : t("mpSelDeclineRefundTitle")
            }
            subtitle={t("mpSelDeclineSubtitle")}
          />
          <FlowTextField
            label={t("mpSelDeclineReasonLabel")}
            required
            value={declineDraft}
            onChangeText={setDeclineDraft}
            multiline
            maxCount={DECLINE_RESPONSE_MAX_LENGTH}
            placeholder={t("mpSelDeclineReasonPlaceholder")}
            editable={busy === null}
            autoFocus
          />
          <InfoNote
            icon="gavel"
            text={t("mpSelDeclineEscalationNote")}
          />
        </KeyboardAwareScrollView>
        <View>
          <FlowFooter
            primary={{
              label: t("mpSelDeclineSend"),
              icon: "block",
              loading: busy === "decline",
              disabled: !canSend,
              onPress: () => void answerRequest("decline"),
            }}
            hint={canSend ? null : t("mpSelDeclineReasonRequired")}
          />
        </View>
      </>
    );
  };

  const renderView = (current: BusinessShopOrder) => {
    switch (view) {
      case "overview":
        return renderOverview(current);
      case "cancel":
        return renderCancelStep(current);
      case "decline":
        return renderDeclineStep(current);
      default:
        return renderDetailsStep(current);
    }
  };

  return (
    <View style={styles.root}>
      <FlowHeader
        title={headerTitle}
        step={order ? getOrderStepProgress(order) : null}
        onBack={onHeaderBack}
        backDisabled={busy !== null}
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
        renderView(order)
      )}
    </View>
  );
}

export default function BusinessOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const orderId = typeof id === "string" ? id : "";
  // Another order in the same screen (e.g. a link) starts clean: no leftover step or draft
  return <BusinessOrderDetail key={orderId} orderId={orderId} />;
}
