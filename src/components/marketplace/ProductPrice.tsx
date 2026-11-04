import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { formatShopPrice } from "@/src/constants/demoShopProduct";

type Size = "sm" | "md" | "lg";

type Props = {
  /** What the buyer pays for one. */
  price: number;
  /** Regular price, struck through when on sale. */
  regular?: number | null;
  onSale?: boolean;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

const PRICE_SIZE: Record<Size, number> = {
  sm: fontSize.size16,
  md: fontSize.size20,
  lg: fontSize.size28,
};

const REGULAR_SIZE: Record<Size, number> = {
  sm: fontSize.size12,
  md: fontSize.size14,
  lg: fontSize.size16,
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      columnGap: moderateWidthScale(6),
    },
    price: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    regular: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
  });

/** Current price in bold dark green; the regular price struck through when on sale. */
export default function ProductPrice({
  price,
  regular,
  onSale,
  size = "md",
  style,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const showRegular = !!onSale && regular != null && regular > price;

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={
        showRegular
          ? t("mpPriceOnSaleA11y", {
              price: formatShopPrice(price),
              regular: formatShopPrice(regular!),
            })
          : formatShopPrice(price)
      }
    >
      <Text
        style={[styles.price, { fontSize: PRICE_SIZE[size] }]}
        numberOfLines={1}
      >
        {formatShopPrice(price)}
      </Text>
      {showRegular ? (
        <Text
          style={[styles.regular, { fontSize: REGULAR_SIZE[size] }]}
          numberOfLines={1}
        >
          {formatShopPrice(regular!)}
        </Text>
      ) : null}
    </View>
  );
}
