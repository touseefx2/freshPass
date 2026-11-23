import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Portal } from "@gorhom/portal";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Animated, { ReduceMotion, SlideInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  addService,
  CompleteProfileState,
  updateService,
} from "@/src/state/slices/completeProfileSlice";

export type EditableService = CompleteProfileState["services"][number];
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";

interface EditServiceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string | null;
  /**
   * Saves to the server instead of the local list. The editor shows a loader
   * and closes only when this resolves true; on false it stays open as typed.
   */
  onSubmit?: (service: EditableService, isNew: boolean) => Promise<boolean>;
  /** Shown as "Delete Service" when editing; called after the user confirms. */
  onDelete?: (serviceId: string) => void;
  deleting?: boolean;
}

// Same slot lengths the customer picks from on the booking time step.
const SLOT_MINUTE_OPTIONS = [5, 15, 30, 45] as const;
type SlotMinutes = (typeof SLOT_MINUTE_OPTIONS)[number];
const DEFAULT_STEP: SlotMinutes = 15;
const DEFAULT_MINUTES = 30;
// Old hour/minute steppers allowed up to 12 h 59 min.
const MAX_MINUTES = 12 * 60 + 59;

const formatDuration = (total: number) => {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(22),
    },
    field: {
      gap: moderateHeightScale(8),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    labelHint: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    input: {
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputReadOnly: {
      backgroundColor: theme.lightGreen07,
      color: theme.lightGreen,
    },
    inputError: {
      borderColor: theme.link,
    },
    multiline: {
      minHeight: heightScale(72),
      textAlignVertical: "top",
    },
    affixRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(14),
    },
    affixInput: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    affixText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    prefixText: {
      color: theme.darkGreen,
      marginRight: moderateWidthScale(2),
    },
    durationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    intervalLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: heightScale(28),
    },
    intervalLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    menu: {
      position: "absolute",
      minWidth: widthScale(170),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    menuInner: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
    },
    menuItemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    menuItemOn: {
      backgroundColor: theme.upcomingCard,
    },
    menuText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    menuTextOn: {
      fontFamily: fonts.fontBold,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(30),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(7),
    },
    stepperButton: {
      width: moderateWidthScale(46),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperButtonDisabled: {
      opacity: 0.35,
    },
    stepperValue: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      marginTop: moderateHeightScale(6),
      gap: moderateHeightScale(8),
    },
    deleteButton: {
      minHeight: heightScale(48),
      alignItems: "center",
      justifyContent: "center",
    },
    deleteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    helper: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    errorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.link,
    },
  });

export default function EditServiceBottomSheet({
  visible,
  onClose,
  serviceId,
  onSubmit,
  onDelete,
  deleting = false,
}: EditServiceBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { services } = useAppSelector((state) => state.completeProfile);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const intervalLinkRef = useRef<View>(null);
  const [step, setStep] = useState<SlotMinutes>(DEFAULT_STEP);
  const [intervalMenu, setIntervalMenu] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const openIntervalMenu = () => {
    // Overlay fills the screen from 0,0, so page coords place the menu.
    intervalLinkRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
      setIntervalMenu({
        top: pageY + h + moderateHeightScale(4),
        right: Math.max(moderateWidthScale(20), windowWidth - (pageX + w)),
      });
    });
  };

  const service = serviceId ? services.find((s) => s.id === serviceId) : null;

  const [serviceName, setServiceName] = useState(service?.name || "");
  const [serviceDescription, setServiceDescription] = useState(
    service?.description ?? service?.name ?? "",
  );
  const [totalMinutes, setTotalMinutes] = useState(DEFAULT_MINUTES);
  const [price, setPrice] = useState("");
  const [currency] = useState(service?.currency || "USD");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    duration?: string;
    price?: string;
  }>({});

  const isNameEditable = !serviceId || (service?.id?.startsWith?.("custom-") ?? false);

  useEffect(() => {
    if (!visible) return;
    if (serviceId === null) {
      setServiceName("");
      setServiceDescription("");
      setTotalMinutes(DEFAULT_MINUTES);
      setPrice("");
      setErrors({});
    } else if (service) {
      setServiceName(service.name);
      setServiceDescription(service.description ?? service.name);
      const total = Math.min(
        Math.max((service.hours || 0) * 60 + (service.minutes || 0), 0),
        MAX_MINUTES,
      );
      setTotalMinutes(total || DEFAULT_MINUTES);
      setPrice(service.price.toString());
      setErrors({});
    }
  }, [visible, serviceId, service]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (intervalMenu) setIntervalMenu(null);
      else onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, intervalMenu]);

  // Snap to the slot grid, so an old 5 or 50 min service steps cleanly.
  const canDecrease = totalMinutes > step;
  const canIncrease = totalMinutes + step <= MAX_MINUTES;
  const changeDuration = (dir: 1 | -1) => {
    setErrors((e) => ({ ...e, duration: undefined }));
    setTotalMinutes((cur) => {
      const next =
        dir === 1
          ? Math.floor(cur / step) * step + step
          : Math.ceil(cur / step) * step - step;
      return Math.min(Math.max(next, step), MAX_MINUTES);
    });
  };

  const handlePriceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const dot = cleaned.indexOf(".");
    const oneDot =
      dot >= 0
        ? cleaned.slice(0, dot + 1) +
          cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2)
        : cleaned;
    setPrice(oneDot);
    setErrors((e) => ({ ...e, price: undefined }));
  };

  const handleSave = async () => {
    if (saving || deleting) return;
    const newErrors: typeof errors = {};

    if (isNameEditable) {
      const trimmedName = serviceName.trim();
      if (!trimmedName) {
        newErrors.name = "Service name is required";
      }
    }

    if (totalMinutes <= 0) {
      newErrors.duration = "Enter how many minutes this service takes";
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const descriptionValue =
      serviceDescription.trim() || serviceName.trim();

    const isNew = serviceId === null;
    if (!isNew && !service) return;
    const next: EditableService = {
      id: isNew ? `custom-${Date.now()}` : serviceId!,
      name: isNew || isNameEditable ? serviceName.trim() : service!.name,
      description: descriptionValue,
      hours,
      minutes,
      price: priceValue,
      currency,
    };

    if (onSubmit) {
      setSaving(true);
      const ok = await onSubmit(next, isNew);
      setSaving(false);
      if (ok) onClose();
      return;
    }

    dispatch(isNew ? addService(next) : updateService(next));
    onClose();
  };

  const confirmDelete = () => {
    if (!serviceId || !onDelete || deleting) return;
    Alert.alert(
      "Delete service",
      `Are you sure you want to delete "${service?.name ?? "this service"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(serviceId),
        },
      ],
    );
  };

  if (!visible) return null;

  const priceLabel = currency === "USD" ? "Price ($)" : `Price (${currency})`;

  return (
    <Portal>
      <Animated.View
        style={styles.overlay}
        entering={SlideInDown.duration(260).reduceMotion(ReduceMotion.System)}
      >
        <StatusBar barStyle="light-content" />
        <StackHeader
          title={serviceId ? "Edit Service" : "Add Service"}
          onBack={onClose}
        />

        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: moderateHeightScale(28) + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(32)}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Service name</Text>
            <TextInput
              style={[
                styles.input,
                !isNameEditable && styles.inputReadOnly,
                errors.name && styles.inputError,
              ]}
              value={serviceName}
              onChangeText={(text) => {
                setServiceName(text);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              editable={isNameEditable}
              placeholder="e.g. Adult Haircut"
              placeholderTextColor={theme.lightGreen4}
              returnKeyType="next"
              accessibilityLabel="Service name"
            />
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Description <Text style={styles.labelHint}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={serviceDescription}
              onChangeText={setServiceDescription}
              placeholder="e.g. Classic haircut and finish"
              placeholderTextColor={theme.lightGreen4}
              multiline
              accessibilityLabel="Description"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.durationHeader}>
              <Text style={styles.label}>Duration</Text>
              <TouchableOpacity
                ref={intervalLinkRef}
                style={styles.intervalLink}
                onPress={openIntervalMenu}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("bkFlowSlotLength", { count: step })}
                accessibilityState={{ expanded: intervalMenu != null }}
              >
                <Text style={styles.intervalLinkText}>
                  {t("bkFlowSlotLength", { count: step })}
                </Text>
                <MaterialIcons
                  name={intervalMenu ? "expand-less" : "expand-more"}
                  size={moderateWidthScale(18)}
                  color={theme.orangeBrownText}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => changeDuration(-1)}
                disabled={!canDecrease}
                style={[
                  styles.stepperButton,
                  !canDecrease && styles.stepperButtonDisabled,
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`Decrease duration by ${step} minutes`}
              >
                <Feather name="minus" size={22} color={theme.darkGreen} />
              </TouchableOpacity>
              <Text
                style={styles.stepperValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                accessibilityLiveRegion="polite"
              >
                {formatDuration(totalMinutes)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => changeDuration(1)}
                disabled={!canIncrease}
                style={[
                  styles.stepperButton,
                  !canIncrease && styles.stepperButtonDisabled,
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`Increase duration by ${step} minutes`}
              >
                <Feather name="plus" size={22} color={theme.darkGreen} />
              </TouchableOpacity>
            </View>
            {errors.duration ? (
              <Text style={styles.errorText}>{errors.duration}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{priceLabel}</Text>
            <View style={[styles.affixRow, errors.price && styles.inputError]}>
              <Text style={[styles.affixText, styles.prefixText]}>$</Text>
              <TextInput
                style={styles.affixInput}
                value={price}
                onChangeText={handlePriceChange}
                onBlur={() => {
                  const v = parseFloat(price);
                  if (!isNaN(v)) setPrice(v.toFixed(2));
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.lightGreen4}
                accessibilityLabel={priceLabel}
              />
            </View>
            {errors.price ? (
              <Text style={styles.errorText}>{errors.price}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button
              title={serviceId ? "Save Changes" : "Add Service"}
              onPress={handleSave}
              loading={saving}
              disabled={deleting}
              backgroundColor={theme.darkGreen}
            />
            {serviceId && onDelete ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                disabled={deleting || saving}
                accessibilityRole="button"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={theme.red} />
                ) : (
                  <Text style={styles.deleteText}>Delete Service</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        {intervalMenu ? (
          <>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setIntervalMenu(null)}
              accessibilityLabel={t("close")}
            />
            <View
              style={[
                styles.menu,
                { top: intervalMenu.top, right: intervalMenu.right },
              ]}
              accessibilityRole="menu"
            >
              <View style={styles.menuInner}>
                {SLOT_MINUTE_OPTIONS.map((minutes, index) => {
                  const isSelected = step === minutes;
                  return (
                    <TouchableOpacity
                      key={minutes}
                      activeOpacity={0.7}
                      style={[
                        styles.menuItem,
                        index > 0 && styles.menuItemBorder,
                        isSelected && styles.menuItemOn,
                      ]}
                      onPress={() => {
                        setIntervalMenu(null);
                        setStep(minutes);
                      }}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.menuText,
                          isSelected && styles.menuTextOn,
                        ]}
                      >
                        {t("bkFlowSlotLength", { count: minutes })}
                      </Text>
                      {isSelected ? (
                        <MaterialIcons
                          name="check"
                          size={moderateWidthScale(18)}
                          color={theme.selectCard}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </Animated.View>
    </Portal>
  );
}
