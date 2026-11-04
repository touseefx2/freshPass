import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useStripe } from "@stripe/stripe-react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import FloatingInput from "@/src/components/floatingInput";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import MarketplaceEmptyState from "@/src/components/marketplace/MarketplaceEmptyState";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import { setShippingAddress } from "@/src/state/slices/shopCartSlice";
import {
  setMarketCheckout,
  setMarketLastOrderId,
} from "@/src/state/slices/marketCartSlice";
import { canShip, type ShopShippingMethod } from "@/src/types/shopProduct";
import type { MarketCheckoutDraft } from "@/src/types/marketplace";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  startProductCheckout,
  useStripeAccount,
  type ProductCheckoutResult,
} from "@/src/services/stripeService";
import { fetchCart, fetchCartCount } from "@/src/services/cartService";

/** Marketplace checkout: 1 delivery → 2 review (server totals) & pay. */
const STEP_TOTAL = 2;
type Step = "delivery" | "review";

/** 422 keys that mean the lines themselves changed (guide §6 Step 4). */
const ITEM_ERROR_KEY = /^items(\.\d+\.(product_id|variant_id|quantity))?$/;

type Prepared = { key: string; result: ProductCheckoutResult };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(24),
      gap: moderateHeightScale(14),
    },
    // ── Delivery options (same cards as the reel Shop Now checkout)
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(76),
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
    },
    optionPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
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
    row2: { flexDirection: "row", gap: moderateWidthScale(10) },
    half: { flex: 1 },
    fields: { gap: moderateHeightScale(12) },
    // ── Review cards
    card: {
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    cardHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(10),
    },
    cardTitle: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.8,
      textTransform: "uppercase",
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
    sellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    sellerAvatar: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    sellerInitial: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.background,
    },
    sellerName: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    divider: { height: 1, backgroundColor: theme.borderLight },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    thumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    itemText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    itemName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    itemMeta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    itemPrice: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    deliveryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    deliveryIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    deliveryMain: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    deliveryAddress: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    priceKey: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    priceValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingTop: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalKey: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    totalValue: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
  });

function toAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function firstMessage(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first.trim() !== "" ? first : null;
}

export default function MarketplaceCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Keep the last draft on screen while leaving (it is cleared on success)
  const storeDraft = useAppSelector((s) => s.marketCart.checkout);
  const draftRef = useRef<MarketCheckoutDraft | null>(storeDraft);
  if (storeDraft) draftRef.current = storeDraft;
  const draft = storeDraft ?? draftRef.current;

  const address = useAppSelector((s) => s.shopCart.address);

  const [step, setStep] = useState<Step>("delivery");
  const [method, setMethod] = useState<ShopShippingMethod | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  // Sync guard: a double tap must never start two payments / orders
  const busyRef = useRef(false);
  const busy = preparing || paying;

  const streetRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);

  const delivery = draft?.delivery;
  const shippingLabel =
    delivery?.shipping === "free"
      ? t("free")
      : formatShopPrice(delivery?.shippingPrice ?? 0);

  // Only what this seller has turned on
  const methodOptions = useMemo(() => {
    const list: {
      key: ShopShippingMethod;
      icon: "local-shipping" | "storefront";
      label: string;
      sub: string;
      priceLabel: string;
    }[] = [];
    if (canShip(delivery)) {
      list.push({
        key: "standard",
        icon: "local-shipping",
        label: t("shipToMe"),
        sub: t("shopShipSub"),
        priceLabel: shippingLabel,
      });
    }
    if (delivery?.pickupAvailable) {
      list.push({
        key: "local_pickup",
        icon: "storefront",
        label: t("pickupAtSalon"),
        sub: t("shopPickupSub"),
        priceLabel: t("free"),
      });
    }
    return list;
  }, [delivery, shippingLabel, t]);

  const firstMethod = methodOptions[0]?.key ?? null;
  const methodOffered = methodOptions.some((m) => m.key === method);
  useEffect(() => {
    if (!methodOffered && firstMethod) setMethod(firstMethod);
  }, [firstMethod, methodOffered]);

  const isShipping = method === "standard";
  const trimmedAddress = useMemo(
    () => ({
      fullName: address.fullName.trim(),
      street: address.street.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zip: address.zip.trim(),
    }),
    [address],
  );

  // What the prepared payment was made for; any change → prepare again
  const prepareKey = useMemo(
    () =>
      JSON.stringify({
        method,
        address: isShipping ? trimmedAddress : null,
        lines: (draft?.lines ?? []).map((l) => [
          l.productId,
          l.variantId,
          l.quantity,
        ]),
      }),
    [draft, isShipping, method, trimmedAddress],
  );

  /** Back to the cart (cart mode) / product (Buy Now). */
  const leave = useCallback(() => {
    Keyboard.dismiss();
    router.back();
  }, [router]);

  /** Review → Delivery; Delivery → leave. */
  const goBack = useCallback(() => {
    if (busyRef.current) return;
    Keyboard.dismiss();
    if (step === "review") setStep("delivery");
    else leave();
  }, [leave, step]);

  // Android back follows the steps too
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "review" || busyRef.current) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack, step]);

  const validateDelivery = () => {
    if (!method) {
      showBanner(t("checkout"), t("selectShippingMethod"), "warning");
      return false;
    }
    if (
      isShipping &&
      (!trimmedAddress.fullName ||
        !trimmedAddress.street ||
        !trimmedAddress.city ||
        !trimmedAddress.state ||
        !trimmedAddress.zip)
    ) {
      showBanner(t("checkout"), t("fillShippingAddress"), "warning");
      return false;
    }
    return true;
  };

  const handleCheckoutError = (err: any) => {
    const fieldErrors = (err?.data?.errors ?? null) as Record<
      string,
      unknown
    > | null;
    const itemKeys = fieldErrors
      ? Object.keys(fieldErrors).filter((k) => ITEM_ERROR_KEY.test(k))
      : [];
    if (itemKeys.length > 0) {
      // Stock / option / product changed since the cart loaded: the lines
      // must be fixed in the cart (or on the product) first.
      const message =
        itemKeys.map((k) => firstMessage(fieldErrors![k])).find(Boolean) ||
        t("mpCoItemsChangedMessage");
      setPrepared(null);
      void fetchCart().catch(() => {});
      Alert.alert(
        t("mpCoItemsChangedTitle"),
        message,
        [
          {
            text: draft?.mode === "cart" ? t("mpCoBackToCart") : t("back"),
            onPress: leave,
          },
        ],
        { cancelable: false },
      );
      return;
    }
    const first = fieldErrors
      ? Object.values(fieldErrors).map(firstMessage).find(Boolean)
      : null;
    showBanner(
      t("checkout"),
      first || err?.message || t("somethingWentWrong"),
      "error",
    );
  };

  /** Creates the order + payment on the server and shows its full total. */
  const goToReview = async () => {
    Keyboard.dismiss();
    if (busyRef.current || !draft || !validateDelivery()) return;
    if (prepared?.key === prepareKey) {
      setStep("review");
      return;
    }
    busyRef.current = true;
    setPreparing(true);
    try {
      const result = await startProductCheckout({
        items: draft.lines.map((l) => ({
          product_id: Number(l.productId),
          ...(l.variantId != null ? { variant_id: l.variantId } : {}),
          quantity: l.quantity,
        })),
        source: "marketplace",
        shipping_method: method!,
        ...(isShipping ? { shipping_address: trimmedAddress } : {}),
      });
      setPrepared({ key: prepareKey, result });
      setStep("review");
    } catch (err: any) {
      handleCheckoutError(err);
    } finally {
      busyRef.current = false;
      setPreparing(false);
    }
  };

  const pay = async () => {
    Keyboard.dismiss();
    if (busyRef.current || !prepared) return;
    busyRef.current = true;
    setPaying(true);
    const { result } = prepared;
    try {
      await useStripeAccount(result.connectedAccountId);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshPass",
        customerId: result.customerId,
        customerSessionClientSecret: result.customerSessionClientSecret,
        paymentIntentClientSecret: result.paymentIntentClientSecret,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();

      await useStripeAccount(null);

      if (presentError) {
        // Closed the sheet: stay on the review, nothing to report
        if (presentError.code === "Canceled") return;
        throw new Error(presentError.message);
      }

      const orderId = String(result.orderId);
      dispatch(setMarketLastOrderId(orderId));
      // Bought lines leave the cart on the server; anything else stays
      void fetchCart().catch(() => {});
      void fetchCartCount().catch(() => {});
      dispatch(setMarketCheckout(null));
      router.replace({
        pathname: "/(main)/shop/orderConfirmed" as any,
        params: { orderId, source: "marketplace" },
      });
    } catch (err: any) {
      await useStripeAccount(null).catch(() => {});
      handleCheckoutError(err);
    } finally {
      busyRef.current = false;
      setPaying(false);
    }
  };

  const header = (
    <FlowHeader
      title={t("checkout")}
      step={
        draft && methodOptions.length > 0
          ? { current: step === "delivery" ? 1 : 2, total: STEP_TOTAL }
          : null
      }
      onBack={goBack}
      backDisabled={busy}
    />
  );

  if (!draft || draft.lines.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <MarketplaceEmptyState
          icon="cart-off"
          title={t("mpCoNothingTitle")}
          message={t("mpCoNothingMessage")}
          actionLabel={t("back")}
          onAction={leave}
        />
      </View>
    );
  }

  if (!delivery?.configured || methodOptions.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.contentContainer}>
          <InfoNote
            tone="warm"
            icon="storefront"
            text={t("salonNotTakingOrders")}
          />
        </View>
      </View>
    );
  }

  const sellerName = draft.seller.name || t("mpCartSellerFallback");
  const selectedMethod = methodOptions.find((m) => m.key === method);
  const addressText = [
    trimmedAddress.fullName,
    trimmedAddress.street,
    [trimmedAddress.city, trimmedAddress.state, trimmedAddress.zip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const renderDeliveryStep = () => (
    <>
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        <FlowTitle
          title={t("shopDeliveryTitle")}
          subtitle={t("mpCoDeliverySubtitle", { seller: sellerName })}
        />

        {methodOptions.map((opt) => {
          const selected = method === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.85}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setMethod(opt.key)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: busy }}
              accessibilityLabel={`${opt.label}, ${opt.priceLabel}`}
            >
              <View
                style={[styles.optionIcon, selected && styles.optionIconSelected]}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={moderateWidthScale(24)}
                  color={selected ? theme.white : theme.selectCard}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{opt.label}</Text>
                <Text style={styles.optionSub} numberOfLines={2}>
                  {opt.sub}
                </Text>
              </View>
              <Text style={styles.optionPrice}>{opt.priceLabel}</Text>
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

        {isShipping ? (
          <>
            <SectionLabel
              label={t("shippingAddress")}
              style={{ marginTop: moderateHeightScale(8) }}
            />
            <View style={styles.fields}>
              <FloatingInput
                label={t("fullName")}
                value={address.fullName}
                onChangeText={(v) => dispatch(setShippingAddress({ fullName: v }))}
                onClear={() => dispatch(setShippingAddress({ fullName: "" }))}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => streetRef.current?.focus()}
              />
              <FloatingInput
                ref={streetRef}
                label={t("streetAddress")}
                value={address.street}
                onChangeText={(v) => dispatch(setShippingAddress({ street: v }))}
                onClear={() => dispatch(setShippingAddress({ street: "" }))}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
              <View style={styles.row2}>
                <View style={styles.half}>
                  <FloatingInput
                    ref={cityRef}
                    label={t("city")}
                    value={address.city}
                    onChangeText={(v) => dispatch(setShippingAddress({ city: v }))}
                    onClear={() => dispatch(setShippingAddress({ city: "" }))}
                    autoCapitalize="words"
                    textContentType="addressCity"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => stateRef.current?.focus()}
                  />
                </View>
                <View style={styles.half}>
                  <FloatingInput
                    ref={stateRef}
                    label={t("state")}
                    value={address.state}
                    onChangeText={(v) => dispatch(setShippingAddress({ state: v }))}
                    onClear={() => dispatch(setShippingAddress({ state: "" }))}
                    autoCapitalize="characters"
                    textContentType="addressState"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => zipRef.current?.focus()}
                  />
                </View>
              </View>
              <FloatingInput
                ref={zipRef}
                label={t("zipCode")}
                value={address.zip}
                onChangeText={(v) => dispatch(setShippingAddress({ zip: v }))}
                onClear={() => dispatch(setShippingAddress({ zip: "" }))}
                keyboardType="number-pad"
                autoComplete="postal-code"
                textContentType="postalCode"
                returnKeyType="done"
              />
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollView>
      <FlowFooter
        primary={{
          label: t("shopNextReview"),
          onPress: () => void goToReview(),
          loading: preparing,
          disabled: busy,
          trailingIcon: "chevron-right",
        }}
      />
    </>
  );

  const renderReviewStep = () => {
    if (!prepared) return null;
    const totals = prepared.result.totals;
    const subtotal = toAmount(totals?.subtotal);
    const shipping = toAmount(totals?.shipping);
    const tax = toAmount(totals?.tax);
    const total = toAmount(totals?.total);

    return (
      <>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("shopReviewTitle")}
            subtitle={t("shopReviewSubtitle")}
          />

          {/* Seller + items */}
          <FlowCard style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t("orderItemsSection")}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.7}
                onPress={leave}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={
                  draft.mode === "cart" ? t("mpCoBackToCart") : t("edit")
                }
              >
                <MaterialIcons
                  name="edit"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <Text style={styles.editText}>{t("edit")}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                {draft.seller.imageUrl ? (
                  <AppImage
                    uri={draft.seller.imageUrl}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.sellerInitial}>
                    {sellerName.trim().charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.sellerName} numberOfLines={1}>
                {t("mpCoSoldBy", { seller: sellerName })}
              </Text>
            </View>
            {draft.lines.map((line) => (
              <React.Fragment
                key={`${line.productId}-${line.variantId ?? "base"}`}
              >
                <View style={styles.divider} />
                <View style={styles.itemRow}>
                  <View style={styles.thumb}>
                    {line.imageUrl ? (
                      <AppImage
                        uri={line.imageUrl}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcons
                        name="shopping-bag"
                        size={moderateWidthScale(24)}
                        color={theme.selectCard}
                      />
                    )}
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {line.name}
                    </Text>
                    {line.variantName ? (
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {line.variantName}
                      </Text>
                    ) : null}
                    <Text style={styles.itemMeta}>
                      {`${line.quantity} × ${formatShopPrice(line.unitPrice)}`}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatShopPrice(
                      Math.round(line.unitPrice * line.quantity * 100) / 100,
                    )}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </FlowCard>

          {/* Delivery */}
          {selectedMethod ? (
            <FlowCard style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{t("delivery")}</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  activeOpacity={0.7}
                  onPress={goBack}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("change")} ${t("delivery")}`}
                >
                  <MaterialIcons
                    name="edit"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.editText}>{t("change")}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.deliveryRow}>
                <View style={styles.deliveryIcon}>
                  <MaterialIcons
                    name={selectedMethod.icon}
                    size={moderateWidthScale(20)}
                    color={theme.selectCard}
                  />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.deliveryMain}>{selectedMethod.label}</Text>
                  <Text style={styles.deliveryAddress}>
                    {isShipping ? addressText : selectedMethod.sub}
                  </Text>
                </View>
              </View>
            </FlowCard>
          ) : null}

          {/* Server totals: the full amount, before the payment sheet */}
          <FlowCard style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceKey}>{t("orderSubtotal")}</Text>
              <Text style={styles.priceValue}>{formatShopPrice(subtotal)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceKey}>{t("orderShipping")}</Text>
              <Text style={styles.priceValue}>
                {shipping > 0 ? formatShopPrice(shipping) : t("free")}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceKey}>{t("orderTax")}</Text>
              <Text style={styles.priceValue}>{formatShopPrice(tax)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalKey}>{t("orderTotalLabel")}</Text>
              <Text style={styles.totalValue}>{formatShopPrice(total)}</Text>
            </View>
          </FlowCard>

          <InfoNote icon="assignment-return" text={t("mpRefundPolicyNote")} />
          <InfoNote icon="lock-outline" text={t("mpCoSecurePayment")} />
        </ScrollView>
        <FlowFooter
          primary={{
            label: t("avPayAmount", { amount: formatShopPrice(total) }),
            onPress: () => void pay(),
            loading: paying,
            disabled: busy,
            icon: "lock",
          }}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {header}
      {step === "review" && prepared ? renderReviewStep() : renderDeliveryStep()}
    </View>
  );
}
