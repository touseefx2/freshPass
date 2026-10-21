import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Portal } from "@gorhom/portal";
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
} from "@/src/theme/dimensions";
import {
  addService,
  updateService,
} from "@/src/state/slices/completeProfileSlice";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";

interface EditServiceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string | null;
  /** Called after a save is written to the list (e.g. to sync it to the server). */
  onSaved?: () => void;
  /** Shown as "Delete Service" when editing; called after the user confirms. */
  onDelete?: (serviceId: string) => void;
  deleting?: boolean;
}

const PRESETS = [15, 30, 45, 60];
// Old hour/minute steppers allowed up to 12 h 59 min.
const MAX_MINUTES = 12 * 60 + 59;

const formatDuration = (total: number) => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return parts.join(" ");
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
    chipRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    chip: {
      flex: 1,
      minHeight: heightScale(44),
      borderRadius: moderateWidthScale(22),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(2),
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.white,
    },
    customLink: {
      alignSelf: "flex-start",
      paddingVertical: moderateHeightScale(4),
    },
    customLinkText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
    },
    customLinkTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
  onSaved,
  onDelete,
  deleting = false,
}: EditServiceBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { services } = useAppSelector((state) => state.completeProfile);
  const customInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const service = serviceId ? services.find((s) => s.id === serviceId) : null;

  const [serviceName, setServiceName] = useState(service?.name || "");
  const [serviceDescription, setServiceDescription] = useState(
    service?.description ?? service?.name ?? "",
  );
  const [preset, setPreset] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [price, setPrice] = useState("");
  const [currency] = useState(service?.currency || "USD");
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
      setPreset(30);
      setCustomMinutes("");
      setPrice("");
      setErrors({});
    } else if (service) {
      setServiceName(service.name);
      setServiceDescription(service.description ?? service.name);
      const total = Math.min(
        Math.max((service.hours || 0) * 60 + (service.minutes || 0), 0),
        MAX_MINUTES,
      );
      if (PRESETS.includes(total)) {
        setPreset(total);
        setCustomMinutes("");
      } else {
        setPreset("custom");
        setCustomMinutes(total ? total.toString() : "");
      }
      setPrice(service.price.toString());
      setErrors({});
    }
  }, [visible, serviceId, service]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const totalMinutes =
    preset === "custom" ? parseInt(customMinutes, 10) || 0 : preset;

  const handleSelectPreset = (value: number | "custom") => {
    setErrors((e) => ({ ...e, duration: undefined }));
    if (value === "custom") {
      if (preset !== "custom" && !customMinutes) {
        setCustomMinutes(String(preset));
      }
      setPreset("custom");
      setTimeout(() => customInputRef.current?.focus(), 50);
    } else {
      setPreset(value);
    }
  };

  const handleCustomChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 3);
    const num = parseInt(cleaned, 10);
    setCustomMinutes(
      !isNaN(num) && num > MAX_MINUTES ? String(MAX_MINUTES) : cleaned,
    );
    setErrors((e) => ({ ...e, duration: undefined }));
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

  const handleSave = () => {
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

    if (serviceId === null) {
      dispatch(
        addService({
          id: `custom-${Date.now()}`,
          name: serviceName.trim(),
          description: descriptionValue,
          hours,
          minutes,
          price: priceValue,
          currency,
        }),
      );
    } else if (serviceId && service) {
      dispatch(
        updateService({
          id: serviceId,
          name: isNameEditable ? serviceName.trim() : service.name,
          description: descriptionValue,
          hours,
          minutes,
          price: priceValue,
          currency,
        }),
      );
    }

    onSaved?.();
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
        <StatusBar barStyle="dark-content" />
        <StackHeader
          variant="light"
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
            <Text style={styles.label}>Duration</Text>
            <View style={styles.chipRow} accessibilityRole="radiogroup">
              {PRESETS.map((value) => {
                const active = preset === value;
                return (
                  <TouchableOpacity
                    key={value}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPreset(value)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {`${value} min`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.customLink}
              onPress={() => handleSelectPreset("custom")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="radio"
              accessibilityState={{ selected: preset === "custom" }}
            >
              <Text
                style={[
                  styles.customLinkText,
                  preset === "custom" && styles.customLinkTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
            {preset !== "custom" && errors.duration ? (
              <Text style={styles.errorText}>{errors.duration}</Text>
            ) : null}
          </View>

          {preset === "custom" ? (
            <View style={styles.field}>
              <Text style={styles.label}>Duration in minutes</Text>
              <View
                style={[styles.affixRow, errors.duration && styles.inputError]}
              >
                <TextInput
                  ref={customInputRef}
                  style={styles.affixInput}
                  value={customMinutes}
                  onChangeText={handleCustomChange}
                  keyboardType="number-pad"
                  placeholder="90"
                  placeholderTextColor={theme.lightGreen4}
                  maxLength={3}
                  accessibilityLabel="Duration in minutes"
                />
                <Text style={styles.affixText}>min</Text>
              </View>
              {errors.duration ? (
                <Text style={styles.errorText}>{errors.duration}</Text>
              ) : totalMinutes > 0 ? (
                <Text style={styles.helper}>{formatDuration(totalMinutes)}</Text>
              ) : null}
            </View>
          ) : null}

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
              disabled={deleting}
              backgroundColor={theme.darkGreen}
            />
            {serviceId && onDelete ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                disabled={deleting}
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
      </Animated.View>
    </Portal>
  );
}
