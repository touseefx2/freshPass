import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { ShopProductVariant } from "@/src/types/shopProduct";

type Props = {
  variants: ShopProductVariant[];
  selectedId: number | null;
  onSelect: (variant: ShopProductVariant) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: moderateHeightScale(10),
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(6),
    },
    label: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    selected: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipOut: {
      borderStyle: "dashed",
      backgroundColor: theme.background,
    },
    chipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextOn: {
      color: theme.white,
    },
    chipTextOut: {
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
    },
    chipSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
  });

/**
 * Option chips (colour / model). Out-of-stock options stay visible, dimmed
 * with "Out of stock", and can't be picked. Active = dark green, white text.
 */
export default function VariantChips({ variants, selectedId, onSelect }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const selected = variants.find((v) => v.id === selectedId) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t("mpPdOptions")}</Text>
        <Text style={styles.selected} numberOfLines={1}>
          {selected ? selected.name : t("mpPdChooseOption")}
        </Text>
      </View>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {variants.map((variant) => {
          const on = variant.id === selectedId;
          const out = !variant.inStock;
          return (
            <TouchableOpacity
              key={variant.id}
              activeOpacity={0.75}
              disabled={out}
              onPress={() => onSelect(variant)}
              style={[styles.chip, on && styles.chipOn, out && styles.chipOut]}
              accessibilityRole="radio"
              accessibilityLabel={
                out ? `${variant.name}, ${t("mpOutOfStock")}` : variant.name
              }
              accessibilityState={{ checked: on, disabled: out }}
            >
              {on ? (
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(16)}
                  color={theme.white}
                />
              ) : null}
              <Text
                style={[
                  styles.chipText,
                  on && styles.chipTextOn,
                  out && styles.chipTextOut,
                ]}
              >
                {variant.name}
              </Text>
              {out ? <Text style={styles.chipSub}>{t("mpOutOfStock")}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
