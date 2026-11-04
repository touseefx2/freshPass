import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { heightScale, moderateWidthScale } from "@/src/theme/dimensions";
import type { MarketplaceFilter } from "@/src/types/marketplace";

type Props = {
  selected: MarketplaceFilter | null;
  /** null = all products, newest first. */
  onSelect: (filter: MarketplaceFilter | null) => void;
};

const FILTERS: { value: MarketplaceFilter; labelKey: string }[] = [
  { value: "featured", labelKey: "mpCatFilterFeatured" },
  { value: "new", labelKey: "mpCatFilterNew" },
  { value: "best_sellers", labelKey: "mpCatFilterBestSellers" },
  { value: "on_sale", labelKey: "mpCatFilterOnSale" },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateWidthScale(8),
    },
    pill: {
      minHeight: heightScale(40),
      paddingHorizontal: moderateWidthScale(18),
      borderRadius: moderateWidthScale(999),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    pillActive: {
      backgroundColor: theme.marketGreen,
      borderColor: theme.marketGreen,
    },
    text: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    textActive: {
      color: theme.white,
    },
  });

/** Featured / New Arrivals / Best Sellers / On Sale — tap the active one to clear. */
function FilterPills({ selected, onSelect }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {FILTERS.map(({ value, labelKey }) => {
        const active = selected === value;
        return (
          <TouchableOpacity
            key={value}
            activeOpacity={0.75}
            onPress={() => onSelect(active ? null : value)}
            style={[styles.pill, active && styles.pillActive]}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="button"
            accessibilityLabel={t(labelKey)}
            accessibilityState={{ selected: active }}
            accessibilityHint={active ? t("mpCatFilterClearHint") : undefined}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default memo(FilterPills);
