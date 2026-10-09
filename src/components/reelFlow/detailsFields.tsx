import React, { forwardRef, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import CustomToggle from "@/src/components/customToggle";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

/**
 * Large form fields for the reel flows' "details" / "publish" steps:
 * visible labels, 52dp+ inputs, 17pt text.
 */

type Option = { id: number; name: string };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      gap: moderateHeightScale(8),
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    label: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    required: { color: theme.selectCard },
    counter: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    input: {
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      fontSize: fontSize.size17,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputMultiline: {
      minHeight: heightScale(124),
      textAlignVertical: "top",
    },
    inputError: { borderColor: theme.red },
    prefixWrap: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(56),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      paddingLeft: moderateWidthScale(16),
    },
    prefix: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(4),
    },
    prefixInput: {
      flex: 1,
      minHeight: heightScale(56),
      paddingRight: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      fontSize: fontSize.size17,
      fontFamily: fonts.fontRegular,
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
      fontFamily: fonts.fontMedium,
      color: theme.red,
      lineHeight: fontSize.size20,
    },
    helper: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    select: {
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    selectOpen: { borderColor: theme.buttonBack },
    selectHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(56),
      paddingHorizontal: moderateWidthScale(16),
    },
    selectValue: {
      flex: 1,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    selectPlaceholder: {
      color: theme.lightGreen,
    },
    selectOption: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(52),
      paddingHorizontal: moderateWidthScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    selectOptionActive: { backgroundColor: theme.lightGreen07 },
    selectOptionText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    selectOptionTextActive: { fontFamily: fonts.fontBold },
    selectLoading: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(64),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
    },
    toggleText: { flex: 1, minWidth: 0 },
    toggleTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    toggleSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
  });

function useFieldStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export function FieldLabel({
  label,
  required = false,
  counter,
}: {
  label: string;
  required?: boolean;
  counter?: string | null;
}) {
  const { styles } = useFieldStyles();
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {counter ? <Text style={styles.counter}>{counter}</Text> : null}
    </View>
  );
}

type TextFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
  /** Shows "12/2200" when set. */
  maxCount?: number;
  helper?: string | null;
  /** Red border + message under the field. */
  error?: string | null;
  /** Fixed text inside the field before the value (e.g. "$"). */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const FlowTextField = forwardRef<TextInput, TextFieldProps>(
  function FlowTextField(
    {
      label,
      required = false,
      maxCount,
      helper,
      error,
      prefix,
      containerStyle,
      multiline,
      style,
      value,
      ...rest
    },
    ref,
  ) {
    const { theme, styles } = useFieldStyles();
    return (
      <View style={[styles.field, containerStyle]}>
        <FieldLabel
          label={label}
          required={required}
          counter={
            maxCount != null ? `${(value ?? "").length}/${maxCount}` : null
          }
        />
        {prefix ? (
          <View style={[styles.prefixWrap, !!error && styles.inputError]}>
            <Text style={styles.prefix}>{prefix}</Text>
            <TextInput
              ref={ref}
              value={value}
              maxLength={maxCount}
              placeholderTextColor={theme.lightGreen5}
              accessibilityLabel={label}
              accessibilityHint={error ?? undefined}
              style={[styles.prefixInput, style]}
              {...rest}
            />
          </View>
        ) : (
          <TextInput
            ref={ref}
            value={value}
            multiline={multiline}
            maxLength={maxCount}
            placeholderTextColor={theme.lightGreen5}
            accessibilityLabel={label}
            accessibilityHint={error ?? undefined}
            style={[
              styles.input,
              multiline && styles.inputMultiline,
              !!error && styles.inputError,
              style,
            ]}
            {...rest}
          />
        )}
        {error ? (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <MaterialIcons
              name="error-outline"
              size={moderateWidthScale(18)}
              color={theme.red}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : helper ? (
          <Text style={styles.helper}>{helper}</Text>
        ) : null}
      </View>
    );
  },
);

/** Dropdown-style list (category). Keeps the list inline — no nested scroll. */
export function SelectField({
  label,
  required = false,
  value,
  placeholder,
  open,
  loading = false,
  options,
  selectedId,
  onToggle,
  onSelect,
  helper,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  placeholder: string;
  open: boolean;
  loading?: boolean;
  options: Option[];
  selectedId: number | null;
  onToggle: () => void;
  onSelect: (option: Option) => void;
  helper?: string | null;
}) {
  const { theme, styles } = useFieldStyles();
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <View style={[styles.select, open && styles.selectOpen]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.selectHead}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || placeholder}`}
          accessibilityState={{ expanded: open }}
        >
          <Text
            style={[styles.selectValue, !value && styles.selectPlaceholder]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.buttonBack} />
          ) : (
            <MaterialIcons
              name={open ? "expand-less" : "expand-more"}
              size={moderateWidthScale(28)}
              color={theme.darkGreen}
            />
          )}
        </TouchableOpacity>
        {open && !loading
          ? options.map((option) => {
              const active = option.id === selectedId;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={option.id}
                  style={[styles.selectOption, active && styles.selectOptionActive]}
                  onPress={() => onSelect(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      active && styles.selectOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {option.name}
                  </Text>
                  {active ? (
                    <MaterialIcons
                      name="check"
                      size={moderateWidthScale(22)}
                      color={theme.darkGreen}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })
          : null}
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

/** Single choice chips with a "None" chip first (service tag). */
export function ChoiceChips({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: Option[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const { styles } = useFieldStyles();
  const { t } = useTranslation();
  const all: { id: number | null; name: string }[] = [
    { id: null, name: t("none") },
    ...options,
  ];
  return (
    <View style={styles.field}>
      <FieldLabel label={label} />
      <View style={styles.chips}>
        {all.map((option) => {
          const active = option.id === selectedId;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              key={option.id ?? "none"}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string | null;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { styles } = useFieldStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSub}>{subtitle}</Text> : null}
      </View>
      <CustomToggle value={value} onValueChange={onValueChange} />
    </View>
  );
}
