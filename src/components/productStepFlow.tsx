import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import Animated, {
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AppImage from "@/src/components/AppImage";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter, {
  flowFooterBottomPad,
} from "@/src/components/reelFlow/flowFooter";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import {
  FlowTextField,
  ToggleRow,
} from "@/src/components/reelFlow/detailsFields";
import type { ProductFormDraft } from "@/src/components/productFormScreen";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { setDeliveryOptions } from "@/src/state/slices/inventorySlice";
import { fetchDeliveryOptions } from "@/src/services/productService";
import { describeDelivery } from "@/src/utils/shopProductHelpers";
import { formatShopPrice } from "@/src/constants/demoShopProduct";
import {
  SHOP_PRODUCT_CATEGORIES,
  type ShopProductCategory,
} from "@/src/types/shopProduct";

/**
 * Add / edit a shop product step by step, in the same look as the reel
 * flows: Photo & name → Category & description → Price & stock → Review.
 * Edit mode opens on Review; "Edit" on a section jumps there and back.
 */

type Props = {
  initial: ProductFormDraft;
  mode: "add" | "edit";
  /** Edit mode: whether the product is currently live. */
  published?: boolean;
  submitting?: boolean;
  onSubmit: (draft: ProductFormDraft, publish: boolean) => void;
};

type Step = 0 | 1 | 2 | 3;
const TOTAL_STEPS = 4;
const REVIEW: Step = 3;

type FieldKey = "name" | "brand" | "price" | "inventory" | "threshold";
type Errors = Partial<Record<FieldKey, string>>;

const CATEGORY_ICONS: Record<
  ShopProductCategory,
  keyof typeof MaterialIcons.glyphMap
> = {
  "Hair Styling": "auto-fix-high",
  "Hair Care": "spa",
  "Beard Care": "face",
  Tools: "content-cut",
  Other: "category",
};

// Keeps "12." while typing; one decimal point, two decimals max.
const cleanMoney = (v: string) => {
  const digits = v.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
const cleanInt = (v: string) => v.replace(/\D/g, "").slice(0, 6);
const toMoney = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(20),
    },
    stepBody: { gap: moderateHeightScale(20) },
    // ── Photo
    photo: {
      height: heightScale(210),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      gap: moderateHeightScale(10),
    },
    photoFilled: {
      borderStyle: "solid",
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    photoImage: { ...StyleSheet.absoluteFillObject },
    photoIcon: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: widthScale(32),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    photoTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    photoHint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    photoChange: {
      position: "absolute",
      right: moderateWidthScale(12),
      bottom: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: heightScale(20),
      backgroundColor: theme.darkGreen,
    },
    photoChangeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    // ── Category tiles (2 across)
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    categoryTile: {
      flexGrow: 1,
      flexBasis: "45%",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(60),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    categoryTileActive: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    categoryText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    categoryTextActive: { color: theme.white, fontFamily: fonts.fontBold },
    section: { gap: moderateHeightScale(10) },
    row2: { flexDirection: "row", gap: moderateWidthScale(12) },
    half: { flex: 1, minWidth: 0 },
    profit: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
    },
    profitText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // ── Stock stepper
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    stepperError: { borderColor: theme.red },
    stepperBtn: {
      width: widthScale(56),
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    stepperInput: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingVertical: moderateHeightScale(10),
      fontVariant: ["tabular-nums"],
    },
    fieldError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // ── Review
    reviewCard: { overflow: "hidden" },
    reviewHero: {
      flexDirection: "row",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(14),
      alignItems: "center",
    },
    reviewThumb: {
      width: widthScale(84),
      height: widthScale(84),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    reviewThumbImage: { ...StyleSheet.absoluteFillObject },
    reviewHeroText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    reviewName: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    reviewMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    reviewPrice: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    reviewRowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    reviewLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    reviewValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    reviewEdit: {
      minHeight: heightScale(36),
      minWidth: widthScale(56),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: heightScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    reviewEditText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    delivery: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(16),
    },
    deliveryWarn: {
      borderColor: theme.upcomingBorder,
      backgroundColor: theme.upcomingCard,
    },
    deliveryText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    deliveryLine: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    deliveryHint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function ProductStepFlow({
  initial,
  mode,
  published = false,
  submitting = false,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const delivery = useAppSelector((s) => s.inventory.deliveryOptions);

  const isEdit = mode === "edit";
  const isLive = isEdit && published;

  const [draft, setDraft] = useState<ProductFormDraft>(initial);
  // Number fields stay as text while typing ("12." must survive).
  const [priceText, setPriceText] = useState(
    initial.sellingPrice > 0 ? String(initial.sellingPrice) : "",
  );
  const [costText, setCostText] = useState(
    initial.cost != null && initial.cost > 0 ? String(initial.cost) : "",
  );
  const [stockText, setStockText] = useState(String(initial.inventoryCount));
  const [thresholdText, setThresholdText] = useState(
    String(initial.lowStockThreshold),
  );
  const [step, setStep] = useState<Step>(isEdit ? REVIEW : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Opened from Review's "Edit": the primary button goes back to Review.
  const [fromReview, setFromReview] = useState(isEdit);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const brandRef = useRef<TextInput>(null);
  const costRef = useRef<TextInput>(null);

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

  const price = toMoney(priceText);
  const cost = toMoney(costText);
  const stock = parseInt(stockText || "0", 10) || 0;
  const threshold = parseInt(thresholdText || "0", 10) || 0;

  const finalDraft = useMemo<ProductFormDraft>(
    () => ({
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      description: draft.description.trim(),
      sellingPrice: price,
      cost: cost > 0 ? cost : null,
      inventoryCount: stock,
      lowStockThreshold: threshold,
    }),
    [draft, price, cost, stock, threshold],
  );

  const dirty = useMemo(
    () =>
      JSON.stringify(finalDraft) !==
      JSON.stringify({
        ...initial,
        name: initial.name.trim(),
        brand: initial.brand.trim(),
        description: initial.description.trim(),
      }),
    [finalDraft, initial],
  );

  const update = <K extends keyof ProductFormDraft>(
    key: K,
    value: ProductFormDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  const clearError = (key: FieldKey) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const validateStep = (s: Step): Errors => {
    const e: Errors = {};
    if (s === 0 || s === REVIEW) {
      if (!draft.name.trim()) e.name = t("productNameRequired");
      if (!draft.brand.trim()) e.brand = t("productBrandRequired");
    }
    if (s === 2 || s === REVIEW) {
      if (!(price > 0)) e.price = t("productPriceRequired");
      if (stock < 0) e.inventory = t("productInventoryInvalid");
      // 0 would never warn before the product is sold out
      if (draft.lowStockAlertEnabled && threshold < 1) {
        e.threshold = t("productThresholdMin");
      }
    }
    return e;
  };

  const goTo = useCallback((next: Step, dir: 1 | -1) => {
    Keyboard.dismiss();
    setDirection(dir);
    setStep(next);
  }, []);

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(REVIEW, 1);
      return;
    }
    goTo(Math.min(step + 1, REVIEW) as Step, 1);
  };

  const editSection = (s: Step) => {
    setFromReview(true);
    goTo(s, -1);
  };

  const allowLeaveRef = useRef(false);

  /** One step back; false when there is nothing left to go back to. */
  const stepBack = useCallback((): boolean => {
    if (submitting) return true;
    if (step === REVIEW) {
      if (isEdit) return false;
      goTo(2, -1);
      return true;
    }
    if (fromReview) {
      setFromReview(isEdit);
      goTo(REVIEW, 1);
      return true;
    }
    if (step === 0) return false;
    goTo((step - 1) as Step, -1);
    return true;
  }, [fromReview, goTo, isEdit, step, submitting]);

  const leave = useCallback(() => {
    allowLeaveRef.current = true;
    router.back();
  }, [router]);

  const confirmLeave = useCallback(
    (onLeave: () => void) => {
      if (!dirty) {
        onLeave();
        return;
      }
      Alert.alert(
        isEdit ? t("productDiscardEditsTitle") : t("productDiscardTitle"),
        isEdit ? t("flowDiscardEditsMessage") : t("productDiscardMessage"),
        [
          { text: t("flowKeepEditing"), style: "cancel" },
          { text: t("flowDiscard"), style: "destructive", onPress: onLeave },
        ],
      );
    },
    [dirty, isEdit, t],
  );

  const onHeaderBack = useCallback(() => {
    if (stepBack()) return;
    confirmLeave(leave);
  }, [confirmLeave, leave, stepBack]);

  // Swipe-back / Android back: step back first, then confirm unsaved changes.
  const guardRef = useRef({ stepBack, confirmLeave, submitting });
  guardRef.current = { stepBack, confirmLeave, submitting };
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (allowLeaveRef.current) return;
      const type = event?.data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP") return;
      event.preventDefault();
      if (guardRef.current.stepBack()) return;
      guardRef.current.confirmLeave(() => {
        allowLeaveRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onHeaderBack();
        return true;
      });
      return () => sub.remove();
    }, [onHeaderBack]),
  );

  const submit = (publish: boolean) => {
    Keyboard.dismiss();
    if (submitting) return;
    const e = validateStep(REVIEW);
    if (Object.keys(e).length) {
      setErrors(e);
      // Jump to the first step with a problem
      setFromReview(true);
      goTo(e.name || e.brand ? 0 : 2, -1);
      return;
    }
    if (publish && !isLive && !deliveryConfigured) {
      setSubmitError(t("setDeliveryBeforePublish"));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    allowLeaveRef.current = true;
    onSubmit(finalDraft, publish);
  };

  // A failed save keeps the screen; let back guards work again.
  useEffect(() => {
    if (!submitting) allowLeaveRef.current = false;
  }, [submitting]);

  const openDelivery = () =>
    router.push(
      "/(main)/dashboard/(account)/(businessProfileSettings)/deliveryOptions" as any,
    );

  // ── Steps ───────────────────────────────────────────────────────────

  const renderPhotoAndName = () => (
    <>
      <FlowTitle
        title={t("productFlowNameTitle")}
        subtitle={t("productFlowNameSubtitle")}
      />
      <View style={styles.section}>
        <SectionLabel label={t("productPhoto")} meta={t("optional")} />
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.photo, !!draft.imageUri && styles.photoFilled]}
          onPress={() => {
            Keyboard.dismiss();
            setPickerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            draft.imageUri ? t("productChangePhoto") : t("addProductPhoto")
          }
        >
          {draft.imageUri ? (
            <>
              <AppImage
                uri={draft.imageUri}
                style={styles.photoImage}
                resizeMode="cover"
              />
              <View style={styles.photoChange}>
                <MaterialIcons
                  name="photo-camera"
                  size={moderateWidthScale(18)}
                  color={theme.white}
                />
                <Text style={styles.photoChangeText}>
                  {t("productChangePhoto")}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.photoIcon}>
                <MaterialIcons
                  name="add-a-photo"
                  size={moderateWidthScale(28)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.photoTitle}>{t("addProductPhoto")}</Text>
              <Text style={styles.photoHint}>{t("productPhotoHint")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <FlowTextField
        label={t("productName")}
        required
        value={draft.name}
        onChangeText={(v) => {
          update("name", v);
          clearError("name");
        }}
        placeholder={t("productNamePlaceholder")}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => brandRef.current?.focus()}
        maxLength={120}
        error={errors.name}
      />
      <FlowTextField
        ref={brandRef}
        label={t("productBrand")}
        required
        value={draft.brand}
        onChangeText={(v) => {
          update("brand", v);
          clearError("brand");
        }}
        placeholder={t("productBrandPlaceholder")}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={goNext}
        maxLength={80}
        error={errors.brand}
      />
    </>
  );

  const renderCategoryAndDescription = () => (
    <>
      <FlowTitle
        title={t("productFlowDetailsTitle")}
        subtitle={t("productFlowDetailsSubtitle")}
      />
      <View style={styles.section}>
        <SectionLabel label={t("productCategory")} required />
        <View style={styles.categoryGrid} accessibilityRole="radiogroup">
          {SHOP_PRODUCT_CATEGORIES.map((cat) => {
            const active = draft.category === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                style={[styles.categoryTile, active && styles.categoryTileActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  update("category", cat);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={cat}
              >
                <MaterialIcons
                  name={CATEGORY_ICONS[cat] ?? "category"}
                  size={moderateWidthScale(22)}
                  color={active ? theme.white : theme.selectCard}
                />
                <Text
                  style={[styles.categoryText, active && styles.categoryTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {cat}
                </Text>
                {active ? (
                  <MaterialIcons
                    name="check-circle"
                    size={moderateWidthScale(18)}
                    color={theme.white}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <FlowTextField
        label={t("productDescription")}
        value={draft.description}
        onChangeText={(v) => update("description", v)}
        placeholder={t("productDescriptionPlaceholder")}
        multiline
        maxCount={500}
        helper={t("productDescriptionHelper")}
        scrollEnabled={false}
      />
    </>
  );

  const bumpStock = (delta: number) => {
    void Haptics.selectionAsync();
    setStockText(String(Math.max(0, stock + delta)));
    clearError("inventory");
    clearError("threshold");
  };

  const renderPriceAndStock = () => {
    const profit = price > 0 && cost > 0 ? price - cost : null;
    return (
      <>
        <FlowTitle
          title={t("productFlowPriceTitle")}
          subtitle={t("productFlowPriceSubtitle")}
        />
        <View style={styles.row2}>
          <FlowTextField
            containerStyle={styles.half}
            label={t("sellingPrice")}
            required
            prefix="$"
            value={priceText}
            onChangeText={(v) => {
              setPriceText(cleanMoney(v));
              clearError("price");
            }}
            keyboardType="decimal-pad"
            placeholder="20.00"
            returnKeyType="next"
            onSubmitEditing={() => costRef.current?.focus()}
            error={errors.price}
          />
          <FlowTextField
            ref={costRef}
            containerStyle={styles.half}
            label={t("productYourCost")}
            prefix="$"
            value={costText}
            onChangeText={(v) => setCostText(cleanMoney(v))}
            keyboardType="decimal-pad"
            placeholder="12.00"
            helper={t("optional")}
          />
        </View>
        {profit != null ? (
          <View style={styles.profit}>
            <MaterialIcons
              name={profit >= 0 ? "trending-up" : "trending-down"}
              size={moderateWidthScale(20)}
              color={profit >= 0 ? theme.buttonBack : theme.red}
            />
            <Text style={styles.profitText}>
              {profit >= 0
                ? t("productProfitPerSale", { amount: formatShopPrice(profit) })
                : t("productLossPerSale", {
                    amount: formatShopPrice(Math.abs(profit)),
                  })}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel label={t("inventoryCount")} required />
          <View style={[styles.stepper, !!errors.inventory && styles.stepperError]}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => bumpStock(-1)}
              disabled={stock <= 0}
              accessibilityRole="button"
              accessibilityLabel={t("productStockLess")}
            >
              <MaterialIcons
                name="remove"
                size={moderateWidthScale(26)}
                color={stock <= 0 ? theme.lightGreen5 : theme.darkGreen}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              value={stockText}
              onChangeText={(v) => {
                setStockText(cleanInt(v));
                clearError("inventory");
                clearError("threshold");
              }}
              onBlur={() => !stockText && setStockText("0")}
              keyboardType="number-pad"
              selectTextOnFocus
              accessibilityLabel={t("inventoryCount")}
            />
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => bumpStock(1)}
              accessibilityRole="button"
              accessibilityLabel={t("productStockMore")}
            >
              <MaterialIcons
                name="add"
                size={moderateWidthScale(26)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          {errors.inventory ? (
            <Text style={styles.fieldError}>{errors.inventory}</Text>
          ) : null}
        </View>

        <ToggleRow
          title={t("lowStockAlert")}
          subtitle={t("lowStockAlertHint")}
          value={draft.lowStockAlertEnabled}
          onValueChange={(v) => {
            update("lowStockAlertEnabled", v);
            clearError("threshold");
          }}
        />
        {draft.lowStockAlertEnabled ? (
          <FlowTextField
            label={t("lowStockThreshold")}
            value={thresholdText}
            onChangeText={(v) => {
              setThresholdText(cleanInt(v));
              clearError("threshold");
            }}
            onBlur={() => !thresholdText && setThresholdText("0")}
            keyboardType="number-pad"
            placeholder="5"
            error={errors.threshold}
            // Allowed, but say so: the product is "Low stock" straight away
            helper={
              threshold >= 1 && stock <= threshold
                ? t("productThresholdAlreadyLow", { count: stock })
                : null
            }
          />
        ) : null}
      </>
    );
  };

  const reviewRow = (label: string, value: string, target: Step) => (
    <View key={label} style={styles.reviewRow}>
      <View style={styles.reviewRowText}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue} numberOfLines={4}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.reviewEdit}
        onPress={() => editSection(target)}
        hitSlop={6}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={`${t("edit")} ${label}`}
      >
        <Text style={styles.reviewEditText}>{t("edit")}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = () => {
    const stockLine = draft.lowStockAlertEnabled
      ? t("productStockWithAlert", { count: stock, threshold })
      : t("productStockCount", { count: stock });
    const priceLine =
      cost > 0
        ? `${formatShopPrice(price)} · ${t("productCostLine", {
            amount: formatShopPrice(cost),
          })}`
        : formatShopPrice(price);
    return (
      <>
        <FlowTitle
          title={isEdit ? t("editProduct") : t("productFlowReviewTitle")}
          subtitle={
            isEdit
              ? t("productFlowReviewSubtitleEdit")
              : t("productFlowReviewSubtitle")
          }
        />
        <FlowCard style={styles.reviewCard}>
          <TouchableOpacity
            style={styles.reviewHero}
            activeOpacity={0.85}
            onPress={() => editSection(0)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityHint={t("edit")}
          >
            <View style={styles.reviewThumb}>
              {draft.imageUri ? (
                <AppImage
                  uri={draft.imageUri}
                  style={styles.reviewThumbImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons
                  name="image"
                  size={moderateWidthScale(30)}
                  color={theme.lightGreen5}
                />
              )}
            </View>
            <View style={styles.reviewHeroText}>
              <Text style={styles.reviewName} numberOfLines={2}>
                {finalDraft.name}
              </Text>
              <Text style={styles.reviewMeta} numberOfLines={1}>
                {finalDraft.brand} · {draft.category}
              </Text>
              <Text style={styles.reviewPrice}>{formatShopPrice(price)}</Text>
            </View>
            <MaterialIcons
              name="edit"
              size={moderateWidthScale(20)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
          {reviewRow(
            t("productDescription"),
            finalDraft.description || t("productNoDescription"),
            1,
          )}
          {reviewRow(t("sellingPrice"), priceLine, 2)}
          {reviewRow(t("inventoryCount"), stockLine, 2)}
        </FlowCard>

        <View style={styles.section}>
          <SectionLabel label={t("delivery")} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openDelivery}
            disabled={submitting}
            accessibilityRole="button"
          >
            <FlowCard
              style={[styles.delivery, !deliveryConfigured && styles.deliveryWarn]}
            >
              <MaterialIcons
                name={deliveryConfigured ? "local-shipping" : "warning-amber"}
                size={moderateWidthScale(24)}
                color={deliveryConfigured ? theme.darkGreen : theme.selectCard}
              />
              <View style={styles.deliveryText}>
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
                <Text style={styles.deliveryHint}>
                  {t("deliveryAppliesToAll")}
                </Text>
              </View>
              <Text style={styles.reviewEditText}>
                {deliveryConfigured ? t("edit") : t("setUp")}
              </Text>
            </FlowCard>
          </TouchableOpacity>
        </View>

        {submitError ? (
          <InfoNote tone="error" icon="error-outline" text={submitError} />
        ) : null}
      </>
    );
  };

  // ── Footer ──────────────────────────────────────────────────────────

  const nextLabel =
    fromReview && step !== REVIEW
      ? t("productFlowBackToReview")
      : step === 0
        ? t("productFlowNextDetails")
        : step === 1
          ? t("productFlowNextPrice")
          : t("productFlowNextReview");

  type FooterAction = React.ComponentProps<typeof FlowFooter>["primary"];
  const footerPrimary: FooterAction =
    step === REVIEW
      ? {
          label: isLive ? t("saveChanges") : t("publishProduct"),
          icon: isLive ? "check" : "storefront",
          onPress: () => submit(true),
          loading: submitting,
        }
      : {
          label: nextLabel,
          icon: fromReview ? "check" : undefined,
          trailingIcon: fromReview ? undefined : "chevron-right",
          onPress: goNext,
        };

  // Review (new / draft): "Save as draft" and "Publish" share one row.
  const footerSecondary: FooterAction | null =
    step === REVIEW && !isLive
      ? {
          label: t("saveAsDraft"),
          onPress: () => submit(false),
          disabled: submitting,
        }
      : null;

  // FlowFooter pads for the home indicator; under an open keyboard that
  // padding would be a gap, so the sticky view tucks it behind the keyboard.
  const footerSafePad = flowFooterBottomPad(insets.bottom);
  const stickyOpened = footerSafePad - moderateHeightScale(10);

  const Entering = direction === 1 ? FadeInRight : FadeInLeft;

  return (
    <View style={styles.root}>
      <FlowHeader
        title={isEdit ? t("editProduct") : t("addProduct")}
        step={{ current: step + 1, total: TOTAL_STEPS }}
        onBack={onHeaderBack}
        backDisabled={submitting}
        backIcon={step === 0 || (isEdit && step === REVIEW) ? "close" : "back"}
      />
      <KeyboardAwareScrollView
        key={step}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(110)}
        extraKeyboardSpace={moderateHeightScale(8)}
      >
        <Animated.View
          style={styles.stepBody}
          entering={Entering.duration(240).reduceMotion(ReduceMotion.System)}
        >
          {step === 0
            ? renderPhotoAndName()
            : step === 1
              ? renderCategoryAndDescription()
              : step === 2
                ? renderPriceAndStock()
                : renderReview()}
        </Animated.View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: stickyOpened }}>
        <FlowFooter
          primary={footerPrimary}
          secondary={footerSecondary}
          row
        />
      </KeyboardStickyView>

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
