import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale } from "@/src/theme/dimensions";
import type { ShopRating } from "@/src/types/shopProduct";

type Props = {
  rating?: ShopRating | null;
  size?: "sm" | "md";
  /**
   * Show "No reviews yet" when there is no rating. Default: true for md,
   * false for sm (the card then shows nothing).
   */
  showNoReviews?: boolean;
  style?: StyleProp<ViewStyle>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    average: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    count: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    empty: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

/** Orange star + "4.9 (128)". No reviews → "No reviews yet", never 0 stars. */
export default function ProductRating({
  rating,
  size = "md",
  showNoReviews,
  style,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const textSize = size === "sm" ? fontSize.size13 : fontSize.size15;
  const average = rating?.average;
  const count = rating?.count ?? 0;
  const hasRating = average != null && count > 0;
  const showEmpty = showNoReviews ?? size === "md";

  if (!hasRating) {
    if (!showEmpty) return null;
    return (
      <View style={[styles.row, style]}>
        <MaterialIcons
          name="star-outline"
          size={textSize + 2}
          color={theme.orangeBrown}
        />
        <Text style={[styles.empty, { fontSize: textSize }]}>
          {t("noReviewsYet")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={t("mpRatingA11y", {
        rating: average.toFixed(1),
        count,
      })}
    >
      <MaterialIcons name="star" size={textSize + 3} color={theme.orangeBrown} />
      <Text style={[styles.average, { fontSize: textSize }]}>
        {average.toFixed(1)}
      </Text>
      <Text style={[styles.count, { fontSize: textSize }]}>
        {size === "md"
          ? `(${t("mpReviewsCount", { count })})`
          : `(${count})`}
      </Text>
    </View>
  );
}
