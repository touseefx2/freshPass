import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { setDeliveryOptions } from "@/src/state/slices/inventorySlice";
import {
  fetchDeliveryOptions,
  updateDeliveryOptions,
} from "@/src/services/productService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import type { ShopDeliveryShipping } from "@/src/types/shopProduct";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1 },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      lineHeight: fontSize.size18,
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(8),
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      gap: moderateWidthScale(12),
    },
    optionRowSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    radioOuter: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOuterSelected: { borderColor: theme.buttonBack },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.buttonBack,
    },
    optionTextWrap: { flex: 1, gap: moderateHeightScale(2) },
    optionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
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
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    actions: { marginTop: moderateHeightScale(12) },
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
  const [error, setError] = useState<string | null>(null);

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
  }[] = [
    { key: "paid", title: t("paidShipping"), hint: t("paidShippingHint") },
    { key: "free", title: t("freeShipping"), hint: t("freeShippingHint") },
    { key: "none", title: t("noShipping"), hint: t("noShippingHint") },
  ];

  const handleSave = async () => {
    Keyboard.dismiss();
    const price = parseFloat(priceText);
    if (shipping === "paid") {
      if (!priceText.trim() || !Number.isFinite(price)) {
        setError(t("shippingAmountRequired"));
        return;
      }
      if (price < 0.01) {
        setError(t("shippingAmountTooLow"));
        return;
      }
    }
    if (shipping === "none" && !pickup) {
      setError(t("offerShippingOrPickup"));
      return;
    }
    setSaving(true);
    try {
      const options = await updateDeliveryOptions({
        shipping,
        ...(shipping === "paid" ? { shipping_price: price } : {}),
        pickup_available: pickup,
      });
      dispatch(setDeliveryOptions(options));
      router.back();
    } catch (err: any) {
      const fieldErrors = err?.data?.errors as
        | Record<string, string[]>
        | undefined;
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

  return (
    <View style={styles.container}>
      <StackHeader title={t("deliveryOptions")} />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + moderateHeightScale(24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(24)}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Text style={styles.subtitle}>{t("deliveryOptionsSubtitle")}</Text>

          <Text style={styles.sectionTitle}>{t("shipping")}</Text>
          {shippingOptions.map((opt) => {
            const selected = shipping === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => {
                  setShipping(opt.key);
                  setError(null);
                }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{opt.title}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
              </Pressable>
            );
          })}

          {shipping === "paid" ? (
            <>
              <FloatingInput
                label={t("shippingAmountPerOrder")}
                value={priceText}
                onChangeText={(v) => {
                  setPriceText(v.replace(/[^0-9.]/g, ""));
                  setError(null);
                }}
                keyboardType="decimal-pad"
                placeholder="7.50"
                showClearButton
                onClear={() => setPriceText("")}
              />
              <View style={styles.note}>
                <MaterialIcons
                  name="info-outline"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
                <Text style={styles.noteText}>
                  {saved?.note || t("shippingOncePerOrderNote")}
                </Text>
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t("pickup")}</Text>
          <View style={styles.optionRow}>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>{t("pickupAtSalon")}</Text>
              <Text style={styles.optionHint}>{t("pickupAtSalonHint")}</Text>
            </View>
            <Switch
              value={pickup}
              onValueChange={(v) => {
                setPickup(v);
                setError(null);
              }}
              trackColor={{ false: theme.lightGreen2, true: theme.buttonBack }}
              thumbColor={theme.white}
            />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.darkGreen} />
            ) : (
              <Button title={t("save")} onPress={handleSave} />
            )}
          </View>
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}
