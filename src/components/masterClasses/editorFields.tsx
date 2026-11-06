// Form pieces for the Create / Edit Class screen (client sample, Design 3):
// small bold labels above white boxes with a thin grey border, red asterisk
// for required-to-publish, inline error under the field.

import React, { forwardRef, useMemo, useRef, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { IoniconName } from "@/src/components/masterClasses/parts";

const FIELD_HEIGHT = heightScale(48);

const useEditorStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Label / error / helper ──────────────────────────────────────────

export function EditorLabel({
  label,
  required = false,
  right,
  style,
}: {
  label: string;
  required?: boolean;
  /** e.g. a "12 / 150" counter */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useEditorStyles();
  return (
    <View style={[styles.labelRow, style]}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {right}
    </View>
  );
}

export function EditorFieldError({ message }: { message?: string | null }) {
  const { theme, styles } = useEditorStyles();
  if (!message) return null;
  return (
    <View style={styles.errorRow} accessibilityLiveRegion="polite">
      <Ionicons
        name="alert-circle"
        size={iconScale(15)}
        color={theme.red}
        style={styles.errorIcon}
      />
      <Text style={styles.errorText} accessibilityRole="alert">
        {message}
      </Text>
    </View>
  );
}

export function EditorHelper({
  text,
  icon,
}: {
  text?: string | null;
  icon?: IoniconName;
}) {
  const { theme, styles } = useEditorStyles();
  if (!text) return null;
  return (
    <View style={styles.helperRow}>
      {icon ? (
        <Ionicons
          name={icon}
          size={iconScale(14)}
          color={theme.lightGreen}
          style={styles.helperIcon}
        />
      ) : null}
      <Text style={styles.helperText}>{text}</Text>
    </View>
  );
}

// ── Text input ──────────────────────────────────────────────────────

type EditorTextInputProps = Omit<TextInputProps, "style" | "onChangeText"> & {
  label?: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  helper?: string | null;
  /** Leading text inside the box (e.g. "$"). */
  prefix?: string;
  /** Shows "n / max" next to the label. */
  counterMax?: number;
  multiline?: boolean;
  /** Visible lines for multiline boxes. */
  minLines?: number;
  style?: StyleProp<ViewStyle>;
};

export const EditorTextInput = forwardRef<TextInput, EditorTextInputProps>(
  function EditorTextInput(
    {
      label,
      required = false,
      value,
      onChangeText,
      error,
      helper,
      prefix,
      counterMax,
      multiline = false,
      minLines = 4,
      style,
      onFocus,
      onBlur,
      accessibilityLabel,
      ...inputProps
    },
    ref,
  ) {
    const { theme, styles } = useEditorStyles();
    const innerRef = useRef<TextInput | null>(null);
    const [focused, setFocused] = useState(false);

    const setRefs = (node: TextInput | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
    };

    const counter =
      counterMax != null ? (
        <Text
          style={[
            styles.counter,
            value.length > counterMax && { color: theme.red },
          ]}
        >
          {value.length} / {counterMax}
        </Text>
      ) : null;

    return (
      <View style={[styles.field, style]}>
        {label ? (
          <EditorLabel label={label} required={required} right={counter} />
        ) : null}
        <TouchableWithoutFeedback
          accessible={false}
          focusable={false}
          onPress={() => innerRef.current?.focus()}
        >
          <View
            style={[
              styles.box,
              multiline && {
                minHeight: Math.max(
                  FIELD_HEIGHT,
                  moderateHeightScale(22) * minLines + moderateHeightScale(20),
                ),
                alignItems: "flex-start",
              },
              focused && styles.boxFocused,
              !!error && styles.boxError,
            ]}
          >
            {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
            <TextInput
              ref={setRefs}
              value={value}
              onChangeText={onChangeText}
              multiline={multiline}
              placeholderTextColor={theme.lightGreen5}
              selectionColor={theme.darkGreen}
              cursorColor={theme.darkGreen}
              style={[styles.input, multiline && styles.inputMultiline]}
              textAlignVertical={multiline ? "top" : "center"}
              accessibilityLabel={
                accessibilityLabel ?? (label ? (required ? `${label}, required` : label) : undefined)
              }
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              {...inputProps}
            />
          </View>
        </TouchableWithoutFeedback>
        <EditorFieldError message={error} />
        {!error ? <EditorHelper text={helper} /> : null}
      </View>
    );
  },
);

// ── Picker box (opens a sheet) ──────────────────────────────────────

export function EditorPickerBox({
  label,
  required = false,
  icon,
  value,
  placeholder,
  onPress,
  error,
  invalid = false,
  helper,
  trailingIcon = "chevron-down",
  numberOfLines = 1,
  style,
}: {
  label?: string;
  required?: boolean;
  icon?: IoniconName;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  error?: string | null;
  /** Red outline without a message (the message is shown elsewhere). */
  invalid?: boolean;
  helper?: string | null;
  trailingIcon?: IoniconName | null;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useEditorStyles();
  const hasValue = !!value;
  return (
    <View style={[styles.field, style]}>
      {label ? <EditorLabel label={label} required={required} /> : null}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[styles.box, styles.pickerBox, (!!error || invalid) && styles.boxError]}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}${required ? ", required" : ""}, ${
          hasValue ? value : placeholder
        }`}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={iconScale(18)}
            color={hasValue ? theme.darkGreen : theme.lightGreen}
            style={styles.leadingIcon}
          />
        ) : null}
        <Text
          style={[styles.pickerText, !hasValue && styles.pickerPlaceholder]}
          numberOfLines={numberOfLines}
        >
          {hasValue ? value : placeholder}
        </Text>
        {trailingIcon ? (
          <Ionicons
            name={trailingIcon}
            size={iconScale(18)}
            color={theme.darkGreen}
          />
        ) : null}
      </TouchableOpacity>
      <EditorFieldError message={error} />
      {!error ? <EditorHelper text={helper} /> : null}
    </View>
  );
}

// ── Two columns with aligned labels ─────────────────────────────────

/**
 * Two fields side by side. Labels sit in their own row (bottom-aligned)
 * so the boxes line up even when one label wraps.
 */
export function EditorRow({
  labels,
  children,
  style,
}: {
  labels: [{ label: string; required?: boolean }, { label: string; required?: boolean }];
  children: [React.ReactNode, React.ReactNode];
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useEditorStyles();
  return (
    <View style={[styles.rowWrap, style]}>
      <View style={styles.rowLabels}>
        <EditorLabel {...labels[0]} style={styles.rowCol} />
        <EditorLabel {...labels[1]} style={styles.rowCol} />
      </View>
      <View style={styles.rowFields}>
        <View style={styles.rowCol}>{children[0]}</View>
        <View style={styles.rowCol}>{children[1]}</View>
      </View>
    </View>
  );
}

// ── Segmented control (Format) ──────────────────────────────────────

export function EditorSegmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string; icon?: IoniconName }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const { theme, styles } = useEditorStyles();
  return (
    <View
      style={styles.segment}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, on && styles.segmentItemOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={option.label}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={iconScale(17)}
                color={on ? theme.white : theme.darkGreen}
              />
            ) : null}
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Equal-width chips (cancellation window) ─────────────────────────

export function EditorChips<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const { styles } = useEditorStyles();
  return (
    <View
      style={styles.chips}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Radio card (Location: business / custom) ────────────────────────

export function EditorRadioCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  icon: IoniconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme, styles } = useEditorStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.radioCard, selected && styles.radioCardOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={[styles.radioIcon, selected && styles.radioIconOn]}>
        <Ionicons
          name={icon}
          size={iconScale(18)}
          color={selected ? theme.white : theme.darkGreen}
        />
      </View>
      <View style={styles.radioBody}>
        <Text style={styles.radioTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.radioSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={iconScale(22)}
        color={selected ? theme.darkGreen : theme.lightGreen4}
      />
    </TouchableOpacity>
  );
}

// ── Read-only row (published class) ─────────────────────────────────

export function EditorReadOnlyRow({
  icon,
  label,
  value,
  numberOfLines = 2,
  last = false,
}: {
  icon: IoniconName;
  label: string;
  value?: string | null;
  numberOfLines?: number;
  last?: boolean;
}) {
  const { theme, styles } = useEditorStyles();
  if (!value) return null;
  return (
    <View
      style={[styles.readRow, !last && styles.readRowBorder]}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <Ionicons
        name={icon}
        size={iconScale(17)}
        color={theme.darkGreenLight}
        style={styles.readIcon}
      />
      <View style={styles.readBody}>
        <Text style={styles.readLabel}>{label}</Text>
        <Text style={styles.readValue} numberOfLines={numberOfLines}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      gap: moderateHeightScale(7),
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    label: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.3,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    required: {
      color: theme.red,
      fontFamily: fonts.fontBold,
    },
    counter: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    box: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: FIELD_HEIGHT,
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
    },
    boxFocused: {
      borderColor: theme.darkGreen,
      borderWidth: 1.5,
    },
    boxError: {
      borderColor: theme.red,
      borderWidth: 1.5,
    },
    prefix: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(4),
    },
    input: {
      flex: 1,
      minHeight: FIELD_HEIGHT - 2,
      paddingVertical: moderateHeightScale(10),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputMultiline: {
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      lineHeight: fontSize.size15 * 1.4,
    },
    pickerBox: {
      gap: moderateWidthScale(8),
    },
    leadingIcon: {
      marginRight: moderateWidthScale(2),
    },
    pickerText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    pickerPlaceholder: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    errorIcon: {
      marginRight: moderateWidthScale(5),
      marginTop: moderateHeightScale(1),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.35,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    helperRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    helperIcon: {
      marginRight: moderateWidthScale(5),
      marginTop: moderateHeightScale(1),
    },
    helperText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    rowWrap: {
      gap: moderateHeightScale(7),
    },
    rowLabels: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(12),
    },
    rowFields: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    rowCol: {
      flex: 1,
      minWidth: 0,
    },
    segment: {
      flexDirection: "row",
      padding: moderateWidthScale(4),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      gap: moderateWidthScale(4),
    },
    segmentItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      minHeight: heightScale(44),
      borderRadius: moderateWidthScale(9),
    },
    segmentItemOn: {
      backgroundColor: theme.darkGreen,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    segmentTextOn: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    chips: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    chip: {
      flex: 1,
      minHeight: heightScale(44),
      borderRadius: heightScale(22),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    radioCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(56),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    radioCardOn: {
      borderColor: theme.darkGreen,
      borderWidth: 1.5,
      backgroundColor: theme.tileMint,
    },
    radioIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    radioIconOn: {
      backgroundColor: theme.darkGreen,
    },
    radioBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    radioTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    radioSub: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.35,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    readRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(11),
    },
    readRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderNormal,
    },
    readIcon: {
      marginRight: moderateWidthScale(10),
      marginTop: moderateHeightScale(2),
    },
    readBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    readLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    readValue: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.35,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });
