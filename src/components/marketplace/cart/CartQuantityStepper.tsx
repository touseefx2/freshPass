import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale, widthScale } from "@/src/theme/dimensions";

type Props = {
  value: number;
  /** Highest allowed (line maxQuantity). */
  max: number;
  min?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** A save is running: number replaced by a spinner, buttons locked. */
  loading?: boolean;
  /** Product name for screen readers. */
  name: string;
  style?: StyleProp<ViewStyle>;
};

const BTN = widthScale(44);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      height: BTN,
    },
    btn: {
      width: BTN,
      height: BTN,
      alignItems: "center",
      justifyContent: "center",
    },
    btnDisabled: { opacity: 0.3 },
    valueBox: {
      minWidth: widthScale(30),
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
  });

/** − qty + pill (Reference C style), 44pt targets, capped by stock. */
export default function CartQuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  disabled = false,
  loading = false,
  name,
  style,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const locked = disabled || loading;
  const canLess = !locked && value > min;
  const canMore = !locked && value < max;

  return (
    <View style={[styles.wrap, disabled && styles.btnDisabled, style]}>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.btn, !canLess && !disabled && styles.btnDisabled]}
        onPress={() => onChange(value - 1)}
        disabled={!canLess}
        accessibilityRole="button"
        accessibilityLabel={t("mpCartDecreaseA11y", { name })}
        accessibilityState={{ disabled: !canLess }}
      >
        <MaterialIcons
          name="remove"
          size={moderateWidthScale(20)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
      <View
        style={styles.valueBox}
        accessible
        accessibilityLabel={t("mpCartQuantityA11y", { count: value })}
        accessibilityLiveRegion="polite"
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.darkGreen} />
        ) : (
          <Text style={styles.value}>{value}</Text>
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.btn, !canMore && !disabled && styles.btnDisabled]}
        onPress={() => onChange(value + 1)}
        disabled={!canMore}
        accessibilityRole="button"
        accessibilityLabel={t("mpCartIncreaseA11y", { name })}
        accessibilityState={{ disabled: !canMore }}
      >
        <MaterialIcons
          name="add"
          size={moderateWidthScale(20)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
    </View>
  );
}
