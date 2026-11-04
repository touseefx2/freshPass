import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import type { ProductReviewSummary } from "@/src/types/marketplace";
import StarRow from "./StarRow";

type Props = {
  summary: ProductReviewSummary;
  /** 5…1 bars next to the big average (reviews screen). */
  showBreakdown?: boolean;
};

const STARS = ["5", "4", "3", "2", "1"] as const;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(18),
    },
    left: {
      alignItems: "center",
      minWidth: widthScale(92),
      gap: moderateHeightScale(4),
    },
    average: {
      fontSize: fontSize.size38,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
      lineHeight: fontSize.size38 * 1.1,
    },
    count: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    bars: {
      flex: 1,
      gap: moderateHeightScale(6),
    },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    barLabel: {
      width: widthScale(12),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    track: {
      flex: 1,
      height: heightScale(8),
      borderRadius: heightScale(4),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: heightScale(4),
      backgroundColor: theme.orangeBrown,
    },
    barCount: {
      minWidth: widthScale(26),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    empty: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    emptyText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
  });

/** Big average + stars + count, optionally with 5…1 bars. No reviews → "No reviews yet". */
export default function ReviewSummary({ summary, showBreakdown = false }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (summary.average == null || summary.count === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons
          name="star-outline"
          size={moderateWidthScale(22)}
          color={theme.orangeBrown}
        />
        <Text style={styles.emptyText}>{t("noReviewsYet")}</Text>
      </View>
    );
  }

  const average = summary.average;
  const total = Math.max(1, summary.count);

  return (
    <View style={styles.row}>
      <View
        style={styles.left}
        accessible
        accessibilityLabel={t("mpRatingA11y", {
          rating: average.toFixed(1),
          count: summary.count,
        })}
      >
        <Text style={styles.average}>{average.toFixed(1)}</Text>
        <StarRow value={average} size={moderateWidthScale(16)} />
        <Text style={styles.count}>
          {t("mpReviewsCount", { count: summary.count })}
        </Text>
      </View>
      {showBreakdown ? (
        <View style={styles.bars}>
          {STARS.map((star) => {
            const n = summary.breakdown[star] ?? 0;
            return (
              <View
                key={star}
                style={styles.barRow}
                accessible
                accessibilityLabel={t("mpRevBreakdownA11y", {
                  stars: star,
                  count: n,
                })}
              >
                <Text style={styles.barLabel}>{star}</Text>
                <MaterialIcons
                  name="star"
                  size={moderateWidthScale(13)}
                  color={theme.orangeBrown}
                />
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${n > 0 ? Math.max(4, (n / total) * 100) : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{n}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
