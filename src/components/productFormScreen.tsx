import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CloseIcon } from "@/assets/icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import ImagePickerModal from "@/src/components/imagePickerModal";
import { setDeliveryOptions } from "@/src/state/slices/inventorySlice";
import { fetchDeliveryOptions } from "@/src/services/productService";
import { describeDelivery } from "@/src/utils/shopProductHelpers";
import {
  SHOP_PRODUCT_CATEGORIES,
  type ShopProduct,
  type ShopProductCategory,
} from "@/src/types/shopProduct";

export type ProductFormDraft = Omit<
  ShopProduct,
  "id" | "createdAt" | "updatedAt" | "published" | "delivery"
>;

type Props = {
  initial: ProductFormDraft;
  mode: "add" | "edit";
  /** Edit mode: whether the product is currently live. */
  published?: boolean;
  submitting?: boolean;
  onSubmit: (draft: ProductFormDraft, publish: boolean) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),
    },
    actions: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(10),
    },
    label: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    imagePicker: {
      width: "100%",
      height: heightScale(180),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    imagePlaceholderText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen5,
    },
    categoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    categoryChip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    categoryChipSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    categoryChipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    textAreaWrap: {
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(10),
      minHeight: heightScale(110),
    },
    textAreaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
    },
    textArea: {
      flex: 1,
      minHeight: heightScale(90),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlignVertical: "top",
      padding: 0,
    },
    clearBtn: {
      paddingTop: moderateHeightScale(2),
      padding: moderateWidthScale(4),
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      gap: moderateWidthScale(12),
    },
    toggleTextWrap: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    toggleTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    toggleHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    row2: { flexDirection: "row", gap: moderateWidthScale(10) },
    half: { flex: 1 },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(8),
    },
    deliveryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    deliveryCardWarning: {
      borderColor: theme.selectCard,
      backgroundColor: theme.orangeBrown015,
    },
    deliveryLine: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    deliveryEdit: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

export default function ProductFormScreen({
  initial,
  mode,
  published = false,
  submitting = false,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const delivery = useAppSelector((s) => s.inventory.deliveryOptions);

  const [draft, setDraft] = useState<ProductFormDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Refresh on focus so returning from Delivery options shows the new setting.
  useFocusEffect(
    useCallback(() => {
      fetchDeliveryOptions()
        .then((options) => dispatch(setDeliveryOptions(options)))
        .catch(() => {});
    }, [dispatch]),
  );

  const deliveryConfigured = !!delivery?.configured;
  const deliveryLines = describeDelivery(delivery, t);

  const sellingPriceText =
    draft.sellingPrice > 0 ? String(draft.sellingPrice) : "";
  const costText =
    draft.cost != null && draft.cost > 0 ? String(draft.cost) : "";

  const update = <K extends keyof ProductFormDraft>(
    key: K,
    value: ProductFormDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validate = () => {
    if (!draft.name.trim()) return t("productNameRequired");
    if (!draft.brand.trim()) return t("productBrandRequired");
    if (!Number.isFinite(draft.sellingPrice) || draft.sellingPrice <= 0) {
      return t("productPriceRequired");
    }
    if (draft.inventoryCount < 0) return t("productInventoryInvalid");
    return null;
  };

  // Live product: one Save button. New or draft: Publish + Save as draft.
  const isLive = mode === "edit" && published;
  const primaryLabel = isLive ? t("saveChanges") : t("publishProduct");

  const submit = (publish: boolean) => {
    Keyboard.dismiss();
    if (submitting) return;
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    if (publish && !isLive && !deliveryConfigured) {
      setError(t("setDeliveryBeforePublish"));
      return;
    }
    onSubmit(draft, publish);
  };

  return (
    <View style={styles.container}>
      <StackHeader title={mode === "edit" ? t("editProduct") : t("addProduct")} />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(24)}
        extraKeyboardSpace={moderateHeightScale(16)}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <TouchableOpacity
          style={styles.imagePicker}
          activeOpacity={0.85}
          onPress={() => setPickerOpen(true)}
        >
          {draft.imageUri ? (
            <AppImage
              uri={draft.imageUri}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <>
              <MaterialIcons
                name="photo-camera"
                size={moderateWidthScale(32)}
                color={theme.lightGreen5}
              />
              <Text style={styles.imagePlaceholderText}>
                {t("addProductPhoto")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <FloatingInput
          label={t("productName")}
          value={draft.name}
          onChangeText={(v) => update("name", v)}
          placeholder={t("productNamePlaceholder")}
          autoCapitalize="words"
          showClearButton
          onClear={() => update("name", "")}
        />

        <FloatingInput
          label={t("productBrand")}
          value={draft.brand}
          onChangeText={(v) => update("brand", v)}
          placeholder={t("productBrandPlaceholder")}
          autoCapitalize="words"
          showClearButton
          onClear={() => update("brand", "")}
        />

        <Text style={styles.label}>{t("productCategory")}</Text>
        <View style={styles.categoryRow}>
          {SHOP_PRODUCT_CATEGORIES.map((cat) => {
            const selected = draft.category === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  selected && styles.categoryChipSelected,
                ]}
                onPress={() => update("category", cat as ShopProductCategory)}
              >
                <Text style={styles.categoryChipText}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t("productDescription")}</Text>
        <View style={styles.textAreaWrap}>
          <View style={styles.textAreaRow}>
            <TextInput
              style={styles.textArea}
              value={draft.description}
              onChangeText={(v) => update("description", v)}
              placeholder={t("productDescriptionPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              multiline
            />
            {!!draft.description ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => update("description", "")}
                hitSlop={8}
              >
                <CloseIcon color={theme.darkGreen} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("productPricingTitle")}</Text>
        <View style={styles.row2}>
          <View style={styles.half}>
            <FloatingInput
              label={t("sellingPrice")}
              value={sellingPriceText}
              onChangeText={(v) =>
                update("sellingPrice", parseFloat(v.replace(/[^0-9.]/g, "")) || 0)
              }
              keyboardType="decimal-pad"
              placeholder="20.00"
            />
          </View>
          <View style={styles.half}>
            <FloatingInput
              label={t("yourCostOptional")}
              value={costText}
              onChangeText={(v) => {
                const n = parseFloat(v.replace(/[^0-9.]/g, ""));
                update("cost", Number.isFinite(n) && n > 0 ? n : null);
              }}
              keyboardType="decimal-pad"
              placeholder="12.00"
            />
          </View>
        </View>

        <FloatingInput
          label={t("inventoryCount")}
          value={String(draft.inventoryCount)}
          onChangeText={(v) =>
            update("inventoryCount", parseInt(v.replace(/\D/g, ""), 10) || 0)
          }
          keyboardType="number-pad"
          placeholder="25"
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>{t("lowStockAlert")}</Text>
            <Text style={styles.toggleHint}>{t("lowStockAlertHint")}</Text>
          </View>
          <Switch
            value={draft.lowStockAlertEnabled}
            onValueChange={(v) => update("lowStockAlertEnabled", v)}
            trackColor={{ false: theme.lightGreen2, true: theme.buttonBack }}
            thumbColor={theme.white}
          />
        </View>

        {draft.lowStockAlertEnabled ? (
          <FloatingInput
            label={t("lowStockThreshold")}
            value={String(draft.lowStockThreshold)}
            onChangeText={(v) =>
              update(
                "lowStockThreshold",
                parseInt(v.replace(/\D/g, ""), 10) || 0,
              )
            }
            keyboardType="number-pad"
            placeholder="5"
          />
        ) : null}

        <Text style={styles.sectionTitle}>{t("delivery")}</Text>
        <TouchableOpacity
          style={[
            styles.deliveryCard,
            !deliveryConfigured && styles.deliveryCardWarning,
          ]}
          activeOpacity={0.85}
          onPress={() =>
            router.push(
              "/(main)/dashboard/(account)/(businessProfileSettings)/deliveryOptions" as any,
            )
          }
        >
          <MaterialIcons
            name={deliveryConfigured ? "local-shipping" : "warning-amber"}
            size={moderateWidthScale(20)}
            color={deliveryConfigured ? theme.darkGreen : theme.selectCard}
          />
          <View style={styles.toggleTextWrap}>
            {deliveryConfigured ? (
              deliveryLines.map((line) => (
                <Text key={line.label} style={styles.deliveryLine}>
                  {line.label}
                </Text>
              ))
            ) : (
              <Text style={styles.deliveryLine}>
                {t("deliveryNotSetHint")}
              </Text>
            )}
            <Text style={styles.toggleHint}>{t("deliveryAppliesToAll")}</Text>
          </View>
          <Text style={styles.deliveryEdit}>
            {deliveryConfigured ? t("edit") : t("setUp")}
          </Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actions}>
          {submitting ? (
            <ActivityIndicator size="small" color={theme.darkGreen} />
          ) : (
            <>
              <Button title={primaryLabel} onPress={() => submit(true)} />
              {!isLive ? (
                <Button
                  title={t("saveAsDraft")}
                  onPress={() => submit(false)}
                  backgroundColor={theme.white}
                  textColor={theme.darkGreen}
                  containerStyle={{
                    borderWidth: 1,
                    borderColor: theme.buttonBack,
                  }}
                />
              ) : null}
            </>
          )}
        </View>
      </KeyboardAwareScrollView>

      <ImagePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onImageSelected={(uri) => {
          update("imageUri", uri);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}
