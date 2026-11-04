import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Props = {
  /** MaterialCommunityIcons name, e.g. "shopping-search", "cart-outline", "wifi-off". */
  icon: IconName;
  title: string;
  message?: string;
  /** e.g. "Retry", "Clear search", "Browse Marketplace". */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

const ICON_DISC = widthScale(72);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(28),
      paddingVertical: moderateHeightScale(32),
      gap: moderateHeightScale(10),
    },
    iconDisc: {
      width: ICON_DISC,
      height: ICON_DISC,
      borderRadius: ICON_DISC / 2,
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size14 * 1.45,
    },
    action: {
      marginTop: moderateHeightScale(8),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(24),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });

/** Empty / error state for Marketplace lists (icon, title, text, one action). */
export default function MarketplaceEmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconDisc}>
        <MaterialCommunityIcons
          name={icon}
          size={moderateWidthScale(34)}
          color={theme.selectCard}
        />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
