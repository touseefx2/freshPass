import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import CustomToggle from "@/src/components/customToggle";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import FlowFooter, {
  flowFooterBottomPad,
} from "@/src/components/reelFlow/flowFooter";
import { setDeliveryOptions } from "@/src/state/slices/inventorySlice";
import {
  fetchDeliveryOptions,
  updateDeliveryOptions,
} from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import type { ShopDeliveryShipping } from "@/src/types/shopProduct";

type IconName = keyof typeof MaterialIcons.glyphMap;

// Keeps "12." while typing; one decimal point, two decimals max.
const cleanMoney = (v: string) => {
  const digits = v.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    section: {
      marginTop: moderateHeightScale(24),
      gap: moderateHeightScale(10),
    },
    group: { gap: moderateHeightScale(10) },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    card: {
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    cardSelected: {
      borderColor: theme.buttonBack,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: moderateHeightScale(72),
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      gap: moderateWidthScale(12),
    },
    iconTile: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    iconTileSelected: { backgroundColor: theme.buttonBack },
    textWrap: { flex: 1, gap: moderateHeightScale(2) },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    hint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    radioOuter: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOuterSelected: { borderColor: theme.buttonBack },
    radioInner: {
      width: moderateWidthScale(11),
      height: moderateWidthScale(11),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.buttonBack,
    },
    expand: {
      borderTopWidth: 1,
      borderTopColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(14),
      paddingBottom: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    note: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    preview: {
      marginTop: moderateHeightScale(24),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen05,
      gap: moderateHeightScale(10),
    },
    previewTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    previewText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    previewWarnText: { color: theme.orangeBrownText },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  });

export default function DeliveryOptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const saved = useAppSelector((s) => s.inventory.deliveryOptions);

  const [loading, setLoading] = useState(!saved);
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState<ShopDeliveryShipping>(
    saved?.shipping ?? "none",
  );
  const [priceText, setPriceText] = useState(
    saved?.shippingPrice != null ? String(saved.shippingPrice) : "",
  );
  const [pickup, setPickup] = useState(saved?.pickupAvailable ?? false);
  const [priceError, setPriceError] = useState<string | null>(null);
  // Focus the amount only when the owner picks "Paid" themselves.
  const [focusPrice, setFocusPrice] = useState(false);

  useEffect(() => {
    fetchDeliveryOptions()
      .then((options) => {
        dispatch(setDeliveryOptions(options));
        setShipping(options.shipping);
        setPriceText(
          options.shippingPrice != null ? String(options.shippingPrice) : "",
        );
        setPickup(options.pickupAvailable);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  const shippingOptions: {
    key: ShopDeliveryShipping;
    title: string;
    hint: string;
    icon: IconName;
  }[] = [
    {
      key: "paid",
      title: t("paidShipping"),
      hint: t("paidShippingHint"),
      icon: "local-shipping",
    },
    {
      key: "free",
      title: t("freeShipping"),
      hint: t("freeShippingHint"),
      icon: "card-giftcard",
    },
    {
      key: "none",
      title: t("noShipping"),
      hint: t("noShippingHint"),
      icon: "block",
    },
  ];

  const price = parseFloat(priceText);
  const nothingOffered = shipping === "none" && !pickup;

  const selectShipping = (key: ShopDeliveryShipping) => {
    if (key === shipping) return;
    void Haptics.selectionAsync();
    if (key !== "paid") Keyboard.dismiss();
    setFocusPrice(key === "paid" && !priceText);
    setShipping(key);
    setPriceError(null);
  };

  const togglePickup = (v: boolean) => {
    void Haptics.selectionAsync();
    setPickup(v);
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (shipping === "paid") {
      if (!priceText.trim() || !Number.isFinite(price)) {
        setPriceError(t("shippingAmountRequired"));
        return;
      }
      if (price < 0.01) {
        setPriceError(t("shippingAmountTooLow"));
        return;
      }
    }
    if (nothingOffered) return;
    setSaving(true);
    try {
      const options = await updateDeliveryOptions({
        shipping,
        ...(shipping === "paid" ? { shipping_price: price } : {}),
        pickup_available: pickup,
      });
      dispatch(setDeliveryOptions(options));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      const fieldErrors = err?.data?.errors as
        Record<string, string[]> | undefined;
      const first = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      showBanner(
        t("deliveryOptions"),
        first || err?.message || t("somethingWentWrong"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // What the customer will see at checkout, built from the current choices.
  const previewLines: { icon: IconName; text: string }[] = [];
  if (shipping === "paid") {
    previewLines.push({
      icon: "local-shipping",
      text:
        Number.isFinite(price) && price > 0
          ? t("shippingPerOrder", { amount: formatShopPrice(price) })
          : t("paidShipping"),
    });
  } else if (shipping === "free") {
    previewLines.push({ icon: "local-shipping", text: t("freeShipping") });
  }
  if (pickup) {
    previewLines.push({
      icon: "storefront",
      text: `${t("pickupAtSalon")} · ${t("pickupAtSalonHint")}`,
    });
  }

  // FlowFooter pads for the home indicator; under an open keyboard that
  // padding would be a gap, so the sticky view tucks it behind the keyboard.
  const stickyOpened =
    flowFooterBottomPad(insets.bottom) - moderateHeightScale(10);

  const renderRadio = (selected: boolean) => (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("deliveryOptions")} />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <>
          <KeyboardAwareScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={moderateHeightScale(110)}
            extraKeyboardSpace={moderateHeightScale(8)}
          >
            <Text style={styles.subtitle}>{t("deliveryOptionsSubtitle")}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t("shipping")}
              </Text>
              <View accessibilityRole="radiogroup" style={styles.group}>
                {shippingOptions.map((opt) => {
                  const selected = shipping === opt.key;
                  return (
                    <View
                      key={opt.key}
                      style={[styles.card, selected && styles.cardSelected]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.cardRow}
                        onPress={() => selectShipping(opt.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`${opt.title}. ${opt.hint}`}
                      >
                        <View
                          style={[
                            styles.iconTile,
                            selected && styles.iconTileSelected,
                          ]}
                        >
                          <MaterialIcons
                            name={opt.icon}
                            size={moderateWidthScale(22)}
                            color={selected ? theme.white : theme.darkGreen}
                          />
                        </View>
                        <View style={styles.textWrap}>
                          <Text style={styles.title}>{opt.title}</Text>
                          <Text style={styles.hint}>{opt.hint}</Text>
                        </View>
                        {renderRadio(selected)}
                      </TouchableOpacity>

                      {opt.key === "paid" && selected ? (
                        <Animated.View
                          style={styles.expand}
                          entering={FadeIn.duration(200).reduceMotion(
                            ReduceMotion.System,
                          )}
                        >
                          <FlowTextField
                            label={t("shippingAmountPerOrder")}
                            required
                            prefix="$"
                            value={priceText}
                            onChangeText={(v) => {
                              setPriceText(cleanMoney(v));
                              setPriceError(null);
                            }}
                            keyboardType="decimal-pad"
                            placeholder="7.50"
                            autoFocus={focusPrice}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            error={priceError}
                          />
                          <View style={styles.note}>
                            <MaterialIcons
                              name="info-outline"
                              size={moderateWidthScale(18)}
                              color={theme.darkGreen}
                            />
                            <Text style={styles.noteText}>
                              {saved?.note || t("shippingOncePerOrderNote")}
                            </Text>
                          </View>
                        </Animated.View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t("pickup")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.card,
                  styles.cardRow,
                  pickup && styles.cardSelected,
                ]}
                onPress={() => togglePickup(!pickup)}
                accessibilityRole="switch"
                accessibilityState={{ checked: pickup }}
                accessibilityLabel={`${t("pickupAtSalon")}. ${t("pickupAtSalonHint")}`}
              >
                <View
                  style={[styles.iconTile, pickup && styles.iconTileSelected]}
                >
                  <MaterialIcons
                    name="storefront"
                    size={moderateWidthScale(22)}
                    color={pickup ? theme.white : theme.darkGreen}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.title}>{t("pickupAtSalon")}</Text>
                  <Text style={styles.hint}>{t("pickupAtSalonHint")}</Text>
                </View>
                <CustomToggle
                  value={pickup}
                  onValueChange={togglePickup}
                  activeTrackColor={theme.buttonBack}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.preview} accessibilityLiveRegion="polite">
              <Text style={styles.previewTitle}>
                {t("deliveryCheckoutPreview")}
              </Text>
              {nothingOffered ? (
                <View style={styles.previewRow}>
                  <MaterialIcons
                    name="warning-amber"
                    size={moderateWidthScale(20)}
                    color={theme.orangeBrownText}
                  />
                  <Text style={[styles.previewText, styles.previewWarnText]}>
                    {t("offerShippingOrPickup")}
                  </Text>
                </View>
              ) : (
                previewLines.map((line) => (
                  <View key={line.text} style={styles.previewRow}>
                    <MaterialIcons
                      name="check-circle"
                      size={moderateWidthScale(20)}
                      color={theme.buttonBack}
                    />
                    <Text style={styles.previewText}>{line.text}</Text>
                  </View>
                ))
              )}
            </View>
          </KeyboardAwareScrollView>

          <KeyboardStickyView offset={{ closed: 0, opened: stickyOpened }}>
            <FlowFooter
              primary={{
                label: t("save"),
                onPress: handleSave,
                loading: saving,
                disabled: saving || nothingOffered,
              }}
            />
          </KeyboardStickyView>
        </>
      )}
    </View>
  );
}
