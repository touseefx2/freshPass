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
import type { CheckoutMethod } from "@/src/types/afterVisit";
import { parseAmount, sanitizeAmountInput } from "./afterVisitParts";

/**
 * Business checkout pieces (Complete & Checkout → Review payment → done):
 * the visit summary card, tip presets and the Completed / Paid badges.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

/** The register's five options, always listed in this order. */
export const CHECKOUT_METHODS: CheckoutMethod[] = [
  "cash",
  "card_terminal",
  "freshpass",
  "membership",
  "not_paid",
];

/**
 * Option label ("Card – Store Terminal") or the short receipt / transaction
 * label ("Card"). Unknown methods fall back to the raw value.
 */
export function checkoutMethodLabel(
  t: (key: string) => string,
  method: string | null | undefined,
  short = false,
): string {
  switch (method) {
    case "cash":
      return t("ckMethodCash");
    case "card_terminal":
      return short ? t("ckMethodCardShort") : t("ckMethodCard");
    case "freshpass":
      return short ? t("ckMethodFreshPassShort") : t("ckMethodFreshPass");
    case "membership":
      return short ? t("ckBadgeMembership") : t("ckMethodMembership");
    case "not_paid":
      return t("ckMethodUnpaid");
    default:
      return method ?? "";
  }
}

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
    // Payment option rows (radio dot on the left, like the register)
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(54),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    optionOn: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    optionOff: {
      backgroundColor: theme.surfaceRaised,
    },
    dot: {
      width: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(11),
      borderWidth: 2,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
    },
    dotOn: { borderColor: theme.darkGreen },
    dotFill: {
      width: widthScale(10),
      height: widthScale(10),
      borderRadius: widthScale(5),
      backgroundColor: theme.darkGreen,
    },
    optionText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    optionLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionLabelOff: { color: theme.lightGreen },
    optionReason: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
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

/** One register option. Greyed out (with the server's reason) when unavailable. */
export function PaymentOptionRow({
  label,
  selected,
  available,
  reason,
  onPress,
}: {
  label: string;
  selected: boolean;
  available: boolean;
  reason?: string | null;
  onPress: () => void;
}) {
  const { styles } = useStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!available}
      style={[
        styles.option,
        selected && styles.optionOn,
        !available && styles.optionOff,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={!available && reason ? `${label}, ${reason}` : label}
      accessibilityState={{ checked: selected, disabled: !available }}
    >
      <View style={[styles.dot, selected && styles.dotOn, !available && { opacity: 0.5 }]}>
        {selected ? <View style={styles.dotFill} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, !available && styles.optionLabelOff]}>
          {label}
        </Text>
        {!available && reason ? (
          <Text style={styles.optionReason}>{reason}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/** Cash / Card chips: how the tip was given on a FreshPass / membership visit. */
export function TipMethodToggle({
  value,
  onChange,
}: {
  value: "cash" | "card_terminal";
  onChange: (value: "cash" | "card_terminal") => void;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation();
  const options: Array<{ key: "cash" | "card_terminal"; label: string }> = [
    { key: "cash", label: t("ckMethodCash") },
    { key: "card_terminal", label: t("ckMethodCardShort") },
  ];
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((option) => {
        const on = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.85}
            onPress={() => onChange(option.key)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
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
