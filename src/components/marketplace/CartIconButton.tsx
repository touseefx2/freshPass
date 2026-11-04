import React, { useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateWidthScale, widthScale } from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useCartBadgeCount } from "@/src/hooks/useMarketCart";

type Props = {
  /** Icon colour (dark green on cream headers, white on green headers). */
  color?: string;
  /** Default: open the cart (guests → sign-in popup). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const BADGE = widthScale(18);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: widthScale(44),
      height: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: widthScale(4),
      right: widthScale(2),
      minWidth: BADGE,
      height: BADGE,
      paddingHorizontal: moderateWidthScale(4),
      borderRadius: BADGE / 2,
      backgroundColor: theme.selectCard,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.white,
    },
    badgeText: {
      color: theme.white,
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
  });

/** Cart icon with the orange item-count badge (Marketplace headers, home). */
export default function CartIconButton({ color, onPress, style }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((s) => s.user.isGuest);
  const count = useCartBadgeCount();

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    router.push("/(main)/marketplace/cart" as any);
  }, [dispatch, isGuest, onPress, router]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? t("mpCartWithCount", { count }) : t("mpCart")
      }
    >
      <MaterialCommunityIcons
        name="cart-outline"
        size={moderateWidthScale(26)}
        color={color ?? theme.darkGreen}
      />
      {count > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} allowFontScaling={false}>
            {count > 9 ? "9+" : String(count)}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
