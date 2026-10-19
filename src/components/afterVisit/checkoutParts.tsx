import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { resolveApiImageUrl } from "@/src/utils/media";
import { parseAmount, sanitizeAmountInput } from "./afterVisitParts";

/**
 * Business checkout pieces (Complete & Checkout → Review payment → done):
 * the visit summary card, tip presets and the Completed / Paid badges.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

export const CHECKOUT_TIP_PRESETS = [0, 5, 10, 15];
export const CHECKOUT_TIP_MAX = 1000;

export type CheckoutTip = { kind: "preset"; amount: number } | { kind: "custom" };

/** Tip in dollars (empty custom = 0); null when the custom amount is invalid. */
export function checkoutTipAmount(tip: CheckoutTip, customText: string): number | null {
  if (tip.kind === "preset") return tip.amount;
  if (!customText.trim()) return 0;
  const value = parseAmount(customText);
  if (value == null || value < 0 || value > CHECKOUT_TIP_MAX) return null;
  return value;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Visit summary
    summary: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    person: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(14),
    },
    avatar: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(24),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    personText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    name: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    meta: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    // Tip presets
    chips: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    chip: {
      flex: 1,
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(4),
    },
    chipWide: { flex: 1.5 },
    chipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chipTextOn: { color: theme.white },
    tipError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    // Badges
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
    },
    badgeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/** Customer, service and time on top; money rows (children) under a line. */
export function VisitSummaryCard({
  name,
  service,
  when,
  image,
  children,
  style,
}: {
  name: string;
  service?: string | null;
  when?: string | null;
  image?: string | null;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useStyles();
  const uri = resolveApiImageUrl(image);
  const icon = (
    <View style={styles.avatar}>
      <MaterialIcons
        name="person"
        size={moderateWidthScale(28)}
        color={theme.darkGreen}
      />
    </View>
  );
  return (
    <View style={[styles.summary, style]}>
      <View style={styles.person}>
        {uri ? (
          <AppImage uri={uri} style={styles.avatar} resizeMode="cover" fallback={icon} />
        ) : (
          icon
        )}
        <View style={styles.personText}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {service ? (
            <Text style={styles.meta} numberOfLines={2}>
              {service}
            </Text>
          ) : null}
          {when ? <Text style={styles.meta}>{when}</Text> : null}
        </View>
      </View>
      {children ? (
        <>
          <View style={styles.divider} />
          {children}
        </>
      ) : null}
    </View>
  );
}

export function SummaryDivider() {
  const { styles } = useStyles();
  return <View style={styles.divider} />;
}

/** $0 · $5 · $10 · $15 · Custom; the amount field opens under Custom. */
export function CheckoutTipPicker({
  tip,
  onTip,
  customText,
  onCustomText,
  error,
}: {
  tip: CheckoutTip;
  onTip: (tip: CheckoutTip) => void;
  customText: string;
  onCustomText: (text: string) => void;
  /** Range or server error; shown under the field (or the chips). */
  error?: string | null;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation();
  const chip = (
    key: string,
    label: string,
    on: boolean,
    onPress: () => void,
    wide = false,
  ) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, wide && styles.chipWide, on && styles.chipOn]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
    >
      <Text
        style={[styles.chipText, on && styles.chipTextOn]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ gap: moderateHeightScale(12) }}>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {CHECKOUT_TIP_PRESETS.map((amount) =>
          chip(
            `p-${amount}`,
            `$${amount}`,
            tip.kind === "preset" && tip.amount === amount,
            () => onTip({ kind: "preset", amount }),
          ),
        )}
        {chip(
          "custom",
          t("ckTipCustom"),
          tip.kind === "custom",
          () => onTip({ kind: "custom" }),
          true,
        )}
      </View>
      {tip.kind === "custom" ? (
        <FlowTextField
          label={t("ckTipCustomLabel")}
          prefix="$"
          value={customText}
          onChangeText={(text) => onCustomText(sanitizeAmountInput(text))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={error}
          helper={error ? null : t("ckTipRangeHelper")}
          autoFocus={!customText}
          returnKeyType="done"
        />
      ) : error ? (
        <Text style={styles.tipError} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** "Completed" / "Paid" / "Unpaid" pills; icon + text, never colour alone. */
export function StatusBadges({
  items,
}: {
  items: Array<{ label: string; tone: "success" | "warn" | "neutral"; icon: IconName }>;
}) {
  const { theme, styles } = useStyles();
  return (
    <View style={styles.badges}>
      {items.map((item) => {
        const bg =
          item.tone === "success"
            ? theme.mintTintStrong
            : item.tone === "warn"
              ? theme.tilePeach
              : theme.lightGreen07;
        const fg =
          item.tone === "success"
            ? theme.darkGreen
            : item.tone === "warn"
              ? theme.orangeBrownText
              : theme.darkGreen;
        return (
          <View key={item.label} style={[styles.badge, { backgroundColor: bg }]}>
            <MaterialIcons name={item.icon} size={moderateWidthScale(16)} color={fg} />
            <Text style={[styles.badgeText, { color: fg }]}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
