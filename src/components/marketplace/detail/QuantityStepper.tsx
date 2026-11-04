import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale, widthScale } from "@/src/theme/dimensions";

type Props = {
  value: number;
  /** 0 = nothing can be bought (both buttons off). */
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const BTN = widthScale(44);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      height: BTN + moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(2),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    btn: {
      width: BTN,
      height: BTN,
      alignItems: "center",
      justifyContent: "center",
    },
    btnOff: {
      opacity: 0.3,
    },
    value: {
      minWidth: widthScale(26),
      textAlign: "center",
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
  });

/** "− 1 +" quantity picker with 44pt buttons (product page bottom bar). */
export default function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const lessOff = disabled || value <= 1;
  const moreOff = disabled || value >= max;

  return (
    <View
      style={[styles.wrap, disabled && styles.btnOff]}
      accessibilityLabel={t("quantity")}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.btn, lessOff && styles.btnOff]}
        disabled={lessOff}
        onPress={() => onChange(value - 1)}
        accessibilityRole="button"
        accessibilityLabel={t("shopQtyLess")}
        accessibilityState={{ disabled: lessOff }}
      >
        <MaterialIcons
          name="remove"
          size={moderateWidthScale(22)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
      <Text
        style={styles.value}
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("mpPdQuantityA11y", { count: value })}
      >
        {value}
      </Text>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.btn, moreOff && styles.btnOff]}
        disabled={moreOff}
        onPress={() => onChange(value + 1)}
        accessibilityRole="button"
        accessibilityLabel={t("shopQtyMore")}
        accessibilityState={{ disabled: moreOff }}
      >
        <MaterialIcons
          name="add"
          size={moderateWidthScale(22)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>
    </View>
  );
}
