import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
import EmptyState from "@/src/components/emptyState";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import { OrderItemThumb } from "@/src/components/shopOrderParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  escalateOrderRefund,
  fetchCustomerOrder,
  requestOrderRefund,
} from "@/src/services/orderService";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import type { ShopOrder } from "@/src/types/shopOrder";
import {
  CANCELLATION_REASONS,
  REFUND_REASONS,
  getItemsSummary,
  getOrderErrorMessage,
  getRefundReasonLabelKey,
} from "@/src/utils/shopOrderHelpers";
import {
  prepareReviewPhoto,
  ReviewFileTooLargeError,
} from "@/src/utils/reviewMedia";

/**
 * Customer cancellation / refund request, one step at a time:
 * - refund: reason (required) → note + photo → review & send
 * - cancellation: reason (optional) → note + photo → review & send
 * - escalate ("Ask FreshPass to review"): message (required) + photo → review & send
 * Opened from the order screen only when the order's refundActions allow it.
 */

type Mode = "cancellation" | "refund" | "escalate";
type Step = "reason" | "details" | "escalate" | "review";
type IconName = keyof typeof MaterialIcons.glyphMap;

const NOTE_MAX = 1000;

const REASON_ICONS: Record<string, IconName> = {
  changed_mind: "undo",
  damaged: "broken-image",
  wrong_item: "swap-horiz",
  never_arrived: "local-shipping",
  other: "more-horiz",
};

const REASON_SUB_KEYS: Record<string, string> = {
  changed_mind: "mpRefReasonChangedMindSub",
  damaged: "mpRefReasonDamagedSub",
  wrong_item: "mpRefReasonWrongItemSub",
  never_arrived: "mpRefReasonNeverArrivedSub",
  other: "mpRefReasonOtherSub",
};

function toMode(value: unknown): Mode | null {
  return value === "cancellation" || value === "refund" || value === "escalate"
    ? value
    : null;
}

function isAllowed(order: ShopOrder, mode: Mode): boolean {
  const actions = order.refundActions;
  if (!actions) return false;
  if (mode === "cancellation") return actions.canRequestCancellation;
  if (mode === "refund") return actions.canRequestRefund;
  return actions.canEscalate;
}

/** 422 `errors.order` first, then the first field error, then the message. */
function getRequestError(
  err: unknown,
  fallback: string,
): { message: string; field: string | null } {
  const errors = (err as any)?.data?.errors;
  if (errors && typeof errors === "object") {
    const pick = (value: unknown) =>
      Array.isArray(value) ? value[0] : value;
    const orderError = pick(errors.order);
    if (typeof orderError === "string" && orderError.trim()) {
      return { message: orderError, field: "order" };
    }
    for (const [field, value] of Object.entries(errors)) {
      const message = pick(value);
      if (typeof message === "string" && message.trim()) {
        return { message, field };
      }
    }
  }
  return { message: getOrderErrorMessage(err, fallback), field: null };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    // ── Reason cards
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    optionSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    optionIcon: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(14),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    optionIconSelected: { backgroundColor: theme.buttonBack },
    optionText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    optionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    radio: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      borderWidth: 2,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    // ── Photo
    photoBlock: { gap: moderateHeightScale(10) },
    photoAdd: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderMedium,
      backgroundColor: theme.white,
    },
    photoAddError: { borderColor: theme.red },
    photoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    photoThumb: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.lightGreen05,
    },
    photoImage: { width: "100%", height: "100%" },
    photoActions: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: moderateWidthScale(8),
    },
    chipBtn: {
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(20),
      backgroundColor: theme.lightGreen07,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    chipBtnText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.red,
    },
    // ── Quote (seller's answer on the escalate step)
    quoteCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(4),
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
    // ── Review
    reviewCard: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(14),
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    orderText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    orderTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    orderSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    divider: { height: 1, backgroundColor: theme.borderLight },
    reviewRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    reviewRowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    reviewValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    reviewEmpty: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    editBtn: {
      minHeight: heightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    editText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export default function RefundRequestScreen() {
  const params = useLocalSearchParams<{ orderId?: string; mode?: string }>();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const mode = toMode(params.mode) ?? "refund";

  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();

  const steps: Step[] = useMemo(
    () =>
      mode === "escalate" ? ["escalate", "review"] : ["reason", "details", "review"],
    [mode],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const noteRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setLoadError(t("orderLoadFailed"));
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setOrder(await fetchCustomerOrder(orderId));
    } catch (err) {
      setLoadError(getOrderErrorMessage(err, t("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const goBack = useCallback(() => {
    if (submittingRef.current) return;
    Keyboard.dismiss();
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.back();
  }, [router, stepIndex]);

  // Android back follows the steps too
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (submittingRef.current) return true;
        if (stepIndex > 0) {
          goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [goBack, stepIndex]),
  );

  const goToStep = (target: Step) => {
    const index = steps.indexOf(target);
    if (index >= 0) setStepIndex(index);
  };

  const next = () => {
    Keyboard.dismiss();
    if (step === "reason" && mode === "refund" && !reason) return;
    if (step === "escalate" && !note.trim()) {
      setNoteError(t("mpRefEscalateNoteRequired"));
      noteRef.current?.focus();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (submittingRef.current || !orderId) return;
    if (mode === "escalate" && !note.trim()) {
      setNoteError(t("mpRefEscalateNoteRequired"));
      goToStep("escalate");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      let photo = null;
      if (photoUri) {
        try {
          photo = await prepareReviewPhoto(photoUri);
        } catch (error) {
          setPhotoError(
            error instanceof ReviewFileTooLargeError
              ? t("rvPhotoTooLarge")
              : t("failedToSelectMedia"),
          );
          goToStep(mode === "escalate" ? "escalate" : "details");
          return;
        }
      }
      const trimmed = note.trim();
      if (mode === "escalate") {
        await escalateOrderRefund(orderId, { note: trimmed, photo });
      } else {
        await requestOrderRefund(orderId, {
          type: mode,
          reason,
          note: trimmed || null,
          photo,
        });
      }
      showBanner(
        t("mpRefSentTitle"),
        t(
          mode === "escalate"
            ? "mpRefSentEscalate"
            : mode === "cancellation"
              ? "mpRefSentCancellation"
              : "mpRefSentRefund",
        ),
        "success",
      );
      router.back();
    } catch (err: any) {
      if (err?.isNoInternet) return;
      const { message, field } = getRequestError(err, t("somethingWentWrong"));
      if (field === "photo") {
        setPhotoError(message);
        goToStep(mode === "escalate" ? "escalate" : "details");
        return;
      }
      if (field === "note") {
        setNoteError(message);
        goToStep(mode === "escalate" ? "escalate" : "details");
        return;
      }
      if (field === "reason") {
        goToStep("reason");
      }
      showBanner(t("mpRefSendFailed"), message, "error");
      // Already asked / past 7 days / refunded: the order screen shows why
      if (field === "order") router.back();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const title =
    mode === "escalate"
      ? t("mpOrdAskReview")
      : mode === "cancellation"
        ? t("mpOrdRequestCancellation")
        : t("mpOrdRequestRefund");

  const allowed = !!order && isAllowed(order, mode);
  const header = (
    <FlowHeader
      title={title}
      step={allowed ? { current: stepIndex + 1, total: steps.length } : null}
      onBack={goBack}
      backDisabled={submitting}
      backIcon={stepIndex === 0 ? "close" : "back"}
    />
  );

  if (loading && !order) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        {header}
        <EmptyState
          icon="error-outline"
          title={t("orderLoadFailed")}
          subtitle={loadError ?? undefined}
          actionTitle={orderId ? t("orderRetry") : undefined}
          onActionPress={orderId ? () => void load() : undefined}
        />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.container}>
        {header}
        <View style={[styles.contentContainer, styles.flex]}>
          <InfoNote
            tone="warm"
            icon="info-outline"
            title={t("mpRefNotAvailableTitle")}
            text={t("mpRefNotAvailableText")}
          />
        </View>
        <FlowFooter
          primary={{ label: t("mpRefBackToOrder"), onPress: () => router.back() }}
        />
      </View>
    );
  }

  const reasons: readonly string[] =
    mode === "cancellation" ? CANCELLATION_REASONS : REFUND_REASONS;

  // ── Photo (details + escalate steps)
  const renderPhoto = () => (
    <View style={styles.photoBlock}>
      <SectionLabel label={t("rvPhoto")} meta={t("optional")} />
      {photoUri ? (
        <View style={styles.photoRow}>
          <TouchableOpacity
            style={styles.photoThumb}
            activeOpacity={0.85}
            onPress={() => dispatch(openFullImageModal({ images: [photoUri] }))}
            accessibilityRole="imagebutton"
            accessibilityLabel={t("rvViewPhoto")}
          >
            <AppImage uri={photoUri} style={styles.photoImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.chipBtn}
              activeOpacity={0.75}
              hitSlop={{ top: 4, bottom: 4 }}
              onPress={() => setPickerOpen(true)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("productChangePhoto")}
            >
              <MaterialIcons
                name="sync"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.chipBtnText}>{t("productChangePhoto")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chipBtn}
              activeOpacity={0.75}
              hitSlop={{ top: 4, bottom: 4 }}
              onPress={() => {
                setPhotoUri(null);
                setPhotoError(null);
              }}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("rvRemovePhoto")}
            >
              <MaterialIcons
                name="delete-outline"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.photoAdd, !!photoError && styles.photoAddError]}
          activeOpacity={0.8}
          onPress={() => {
            Keyboard.dismiss();
            setPickerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${t("rvAddPhoto")}, ${t("mpRefPhotoHint")}`}
        >
          <View style={styles.optionIcon}>
            <MaterialIcons
              name="add-a-photo"
              size={moderateWidthScale(24)}
              color={theme.selectCard}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t("rvAddPhoto")}</Text>
            <Text style={styles.optionSub}>{t("mpRefPhotoHint")}</Text>
          </View>
        </TouchableOpacity>
      )}
      {photoError ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(16)}
            color={theme.red}
          />
          <Text style={styles.errorText}>{photoError}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderNote = (required: boolean) => (
    <TouchableWithoutFeedback
      accessible={false}
      focusable={false}
      onPress={() => noteRef.current?.focus()}
    >
      <View>
        <FlowTextField
          ref={noteRef}
          label={
            required ? t("mpOrdYourReviewRequest") : t("mpRefNoteLabel")
          }
          required={required}
          placeholder={
            required ? t("mpRefEscalateNotePlaceholder") : t("mpRefNotePlaceholder")
          }
          value={note}
          onChangeText={(text) => {
            setNote(text);
            if (noteError) setNoteError(null);
          }}
          maxCount={NOTE_MAX}
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
          error={noteError}
          editable={!submitting}
        />
      </View>
    </TouchableWithoutFeedback>
  );

  const formScroll = (children: React.ReactNode) => (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={moderateHeightScale(32)}
    >
      {children}
    </KeyboardAwareScrollView>
  );

  const renderReasonStep = () => (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <FlowTitle
          title={
            mode === "refund"
              ? t("mpRefReasonTitleRefund")
              : t("mpRefReasonTitleCancellation")
          }
          subtitle={
            mode === "refund"
              ? t("mpRefReasonSubRefund")
              : t("mpRefReasonSubCancellation")
          }
        />
        <View accessibilityRole="radiogroup" style={{ gap: moderateHeightScale(12) }}>
          {reasons.map((key) => {
            const selected = reason === key;
            const label = t(getRefundReasonLabelKey(key));
            const sub = t(REASON_SUB_KEYS[key] ?? "mpRefReasonOtherSub");
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.85}
                style={[styles.option, selected && styles.optionSelected]}
                // Cancellation reason is optional: tap again to clear it
                onPress={() =>
                  setReason((prev) =>
                    prev === key && mode === "cancellation" ? null : key,
                  )
                }
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={`${label}, ${sub}`}
              >
                <View
                  style={[styles.optionIcon, selected && styles.optionIconSelected]}
                >
                  <MaterialIcons
                    name={REASON_ICONS[key] ?? "more-horiz"}
                    size={moderateWidthScale(24)}
                    color={selected ? theme.white : theme.selectCard}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{label}</Text>
                  <Text style={styles.optionSub} numberOfLines={2}>
                    {sub}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? (
                    <MaterialIcons
                      name="check"
                      size={moderateWidthScale(16)}
                      color={theme.white}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <FlowFooter
        primary={{
          label: mode === "cancellation" && !reason ? t("skip") : t("continue"),
          onPress: next,
          disabled: mode === "refund" && !reason,
          trailingIcon: "arrow-forward",
        }}
        hint={mode === "refund" && !reason ? t("mpRefReasonRequired") : null}
      />
    </>
  );

  const renderDetailsStep = () => (
    <>
      {formScroll(
        <>
          <FlowTitle
            title={t("mpRefDetailsTitle")}
            subtitle={t("mpRefDetailsSub")}
          />
          {renderNote(false)}
          {renderPhoto()}
        </>,
      )}
      <FlowFooter
        primary={{
          label: t("continue"),
          onPress: next,
          trailingIcon: "arrow-forward",
        }}
      />
    </>
  );

  const renderEscalateStep = () => (
    <>
      {formScroll(
        <>
          <FlowTitle
            title={t("mpOrdAskReview")}
            subtitle={t("mpRefEscalateSub")}
          />
          {order.refundRequest?.sellerResponse ? (
            <FlowCard style={styles.quoteCard}>
              <Text style={styles.quoteLabel}>{t("mpOrdSellerReason")}</Text>
              <Text style={styles.quoteText}>
                {order.refundRequest.sellerResponse}
              </Text>
            </FlowCard>
          ) : null}
          {renderNote(true)}
          {renderPhoto()}
          <InfoNote tone="warm" icon="looks-one" text={t("mpRefEscalateOnce")} />
        </>,
      )}
      <FlowFooter
        primary={{
          label: t("continue"),
          onPress: next,
          trailingIcon: "arrow-forward",
        }}
      />
    </>
  );

  const editButton = (target: Step, label: string) => (
    <TouchableOpacity
      style={styles.editBtn}
      activeOpacity={0.75}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={() => goToStep(target)}
      disabled={submitting}
      accessibilityRole="button"
      accessibilityLabel={`${t("edit")}, ${label}`}
    >
      <MaterialIcons
        name="edit"
        size={moderateWidthScale(16)}
        color={theme.darkGreen}
      />
      <Text style={styles.editText}>{t("edit")}</Text>
    </TouchableOpacity>
  );

  const renderReviewStep = () => {
    const { first, moreCount } = getItemsSummary(order.items);
    const detailsStep: Step = mode === "escalate" ? "escalate" : "details";
    const noteLabel =
      mode === "escalate" ? t("mpOrdYourReviewRequest") : t("bkFlowNote");
    const typeLabel =
      mode === "escalate"
        ? t("mpOrdAskReview")
        : mode === "cancellation"
          ? t("mpOrdRequestTypeCancellation")
          : t("mpOrdRequestTypeRefund");
    return (
      <>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("mpRefReviewTitle")}
            subtitle={t("mpRefReviewSub")}
          />
          <FlowCard style={styles.reviewCard}>
            <View style={styles.orderRow}>
              <OrderItemThumb uri={first?.productImageUrl ?? null} />
              <View style={styles.orderText}>
                <Text style={styles.orderTitle} numberOfLines={1}>
                  {t("orderNumberTitle", { id: order.id })}
                </Text>
                {first ? (
                  <Text style={styles.orderSub} numberOfLines={1}>
                    {[
                      first.variantName
                        ? `${first.productName} · ${first.variantName}`
                        : first.productName,
                      moreCount > 0
                        ? t("orderItemsMore", { count: moreCount })
                        : null,
                    ]
                      .filter(Boolean)
                      .join("  ")}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowText}>
                <Text style={styles.reviewLabel}>{t("mpRefRequestType")}</Text>
                <Text style={styles.reviewValue}>{typeLabel}</Text>
              </View>
            </View>

            {mode !== "escalate" ? (
              <>
                <View style={styles.divider} />
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowText}>
                    <Text style={styles.reviewLabel}>{t("reason")}</Text>
                    {reason ? (
                      <Text style={styles.reviewValue}>
                        {t(getRefundReasonLabelKey(reason))}
                      </Text>
                    ) : (
                      <Text style={styles.reviewEmpty}>{t("mpRefNoReason")}</Text>
                    )}
                  </View>
                  {editButton("reason", t("reason"))}
                </View>
              </>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowText}>
                <Text style={styles.reviewLabel}>{noteLabel}</Text>
                {note.trim() ? (
                  <Text style={styles.reviewValue}>{note.trim()}</Text>
                ) : (
                  <Text style={styles.reviewEmpty}>{t("mpRefNoNote")}</Text>
                )}
              </View>
              {editButton(detailsStep, noteLabel)}
            </View>

            <View style={styles.divider} />
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowText}>
                <Text style={styles.reviewLabel}>{t("rvPhoto")}</Text>
                {photoUri ? (
                  <TouchableOpacity
                    style={styles.photoThumb}
                    activeOpacity={0.85}
                    onPress={() =>
                      dispatch(openFullImageModal({ images: [photoUri] }))
                    }
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t("rvViewPhoto")}
                  >
                    <AppImage
                      uri={photoUri}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.reviewEmpty}>{t("mpRefNoPhoto")}</Text>
                )}
              </View>
              {editButton(detailsStep, t("rvPhoto"))}
            </View>
          </FlowCard>

          <InfoNote
            text={t(
              mode === "escalate"
                ? "mpRefReviewInfoEscalate"
                : mode === "cancellation"
                  ? "mpRefReviewInfoCancellation"
                  : "mpRefReviewInfoRefund",
            )}
          />
        </ScrollView>
        <FlowFooter
          primary={{
            label:
              mode === "escalate" ? t("mpRefSendToFreshpass") : t("mpRefSendRequest"),
            onPress: () => void submit(),
            loading: submitting,
            disabled: submitting,
            icon: "send",
          }}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {header}
      {step === "reason"
        ? renderReasonStep()
        : step === "details"
          ? renderDetailsStep()
          : step === "escalate"
            ? renderEscalateStep()
            : renderReviewStep()}
      <ImagePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("rvAddPhoto")}
        quality={1}
        onImageSelected={(uri) => {
          setPhotoError(null);
          setPhotoUri(uri);
        }}
      />
    </View>
  );
}
