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

/**
 * Pieces shared by the after-visit step screens (customer View & Pay, the
 * pro's Update Status / payment confirmation). Built on the reel-flow look:
 * big type, one decision per screen, 48dp+ targets.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

/** "$35.00" — prices always keep cents so totals line up. */
export function formatVisitMoney(
  amount: number | null | undefined,
  currency = "usd",
): string {
  const value = Number.isFinite(amount) ? (amount as number) : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function to12h(date: Date): string {
  const h = date.getHours() % 12 || 12;
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m} ${date.getHours() >= 12 ? "PM" : "AM"}`;
}

/** API date "MM/DD/YYYY" + "HH:mm" → Date (null when malformed). */
export function parseVisitDate(date?: string | null, time?: string | null) {
  if (!date) return null;
  const [month, day, year] = date.split("/").map(Number);
  const [hours, minutes] = (time ?? "00:00").split(":").map(Number);
  if (!month || !day || !year) return null;
  const d = new Date(year, month - 1, day, hours || 0, minutes || 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Thu, Sep 10, 2026 · 2:00 PM" (date only when there is no time). */
export function formatVisitDateTime(
  date?: string | null,
  time?: string | null,
): string {
  const d = parseVisitDate(date, time);
  if (!d) return [date, time].filter(Boolean).join(" ");
  const dayPart = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return time ? `${dayPart} · ${to12h(d)}` : dayPart;
}

/** ISO timestamp → same format as formatVisitDateTime. */
export function formatIsoDateTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${to12h(d)}`;
}

/** Parse a typed amount ("12", "12.5"); null when empty or not a number. */
export function parseAmount(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Keep digits and one dot, at most two decimals. */
export function sanitizeAmountInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Success / status hero
    hero: {
      alignItems: "center",
      gap: moderateHeightScale(10),
      paddingTop: moderateHeightScale(8),
    },
    heroRing: {
      width: widthScale(116),
      height: widthScale(116),
      borderRadius: widthScale(58),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(4),
    },
    heroCircle: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: fontSize.size32,
    },
    heroAmount: {
      fontSize: fontSize.size36,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    heroSubtitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size22,
    },
    // Person row (pro or customer)
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    avatar: {
      width: widthScale(64),
      height: widthScale(64),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.emptyProfileImage,
    },
    avatarEmpty: {
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    personText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    personName: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    personSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    // Label / amount rows
    moneyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      minHeight: heightScale(30),
    },
    moneyLabel: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    moneyValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    moneyLabelTotal: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    moneyValueTotal: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(6),
    },
    // Radio cards
    radio: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      minHeight: heightScale(76),
    },
    radioSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.mintTint,
    },
    radioSelectedDanger: {
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
    },
    radioIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    radioText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    radioTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    radioSub: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    radioDot: {
      width: widthScale(26),
      height: widthScale(26),
      borderRadius: widthScale(13),
      borderWidth: 2,
      borderColor: theme.borderMedium,
      alignItems: "center",
      justifyContent: "center",
    },
    radioDotOn: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.buttonBack,
    },
    radioDotOnDanger: {
      borderColor: theme.red,
      backgroundColor: theme.red,
    },
    // Amount chips (tips)
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    amountChip: {
      flexGrow: 1,
      flexBasis: "28%",
      minHeight: heightScale(64),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    amountChipHalf: { flexBasis: "45%" },
    amountChipOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    amountChipText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    amountChipTextSmall: {
      fontSize: fontSize.size16,
    },
    amountChipTextOn: { color: theme.white },
    // Stars
    stars: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    starBtn: {
      width: widthScale(52),
      height: widthScale(52),
      alignItems: "center",
      justifyContent: "center",
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export function SuccessHero({
  icon = "check",
  tone = "success",
  title,
  amount,
  subtitle,
  lines,
}: {
  icon?: IconName;
  /** success = olive check, pending = amber, danger = red */
  tone?: "success" | "pending" | "danger";
  title: string;
  amount?: string | null;
  subtitle?: string | null;
  /** Extra muted lines under the subtitle (e.g. the date). */
  lines?: Array<string | null | undefined>;
}) {
  const { theme, styles } = useStyles();
  const ringColor =
    tone === "pending"
      ? theme.orangeBrown015
      : tone === "danger"
        ? theme.lightRed
        : theme.lightGreen07;
  const fill =
    tone === "pending"
      ? theme.selectCard
      : tone === "danger"
        ? theme.red
        : theme.darkGreen;
  return (
    <View style={styles.hero}>
      <View
        style={[styles.heroRing, { backgroundColor: ringColor }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.heroCircle, { backgroundColor: fill }]}>
          <MaterialIcons
            name={icon}
            size={moderateWidthScale(44)}
            color={theme.white}
          />
        </View>
      </View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {title}
      </Text>
      {amount ? <Text style={styles.heroAmount}>{amount}</Text> : null}
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      {(lines ?? []).filter(Boolean).map((line, i) => (
        <Text key={i} style={styles.heroSubtitle}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function PersonRow({
  name,
  subtitle,
  image,
  style,
}: {
  name: string;
  subtitle?: string | null;
  image?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useStyles();
  const uri = resolveApiImageUrl(image);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const fallback = (
    <View style={[styles.avatar, styles.avatarEmpty]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
  return (
    <View style={[styles.person, style]}>
      {uri ? (
        <AppImage
          uri={uri}
          style={styles.avatar}
          resizeMode="cover"
          fallback={fallback}
        />
      ) : (
        fallback
      )}
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={2}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.personSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function MoneyRow({
  label,
  value,
  total = false,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.moneyRow} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={[styles.moneyLabel, total && styles.moneyLabelTotal]}>
        {label}
      </Text>
      <Text style={[styles.moneyValue, total && styles.moneyValueTotal]}>
        {value}
      </Text>
    </View>
  );
}

export function RowDivider() {
  const { styles } = useStyles();
  return <View style={styles.divider} />;
}

/** One option of a single choice ("Pay in the app" / "Completed" …). */
export function RadioCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  danger = false,
  disabled = false,
}: {
  title: string;
  subtitle?: string | null;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  /** Red selected state (e.g. No-show). */
  danger?: boolean;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.radio,
        selected && (danger ? styles.radioSelectedDanger : styles.radioSelected),
        disabled && { opacity: 0.45 },
      ]}
      accessibilityRole="radio"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ checked: selected, disabled }}
    >
      <View style={styles.radioIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(24)}
          color={danger ? theme.red : theme.buttonBack}
        />
      </View>
      <View style={styles.radioText}>
        <Text style={styles.radioTitle}>{title}</Text>
        {subtitle ? <Text style={styles.radioSub}>{subtitle}</Text> : null}
      </View>
      <View
        style={[
          styles.radioDot,
          selected && (danger ? styles.radioDotOnDanger : styles.radioDotOn),
        ]}
      >
        {selected ? (
          <MaterialIcons
            name="check"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export type TipChoice =
  | { kind: "none" }
  | { kind: "amount"; amount: number }
  | { kind: "custom" };

/**
 * Suggested tip amounts (from the API), "Custom" and "No tip" as big chips;
 * the custom amount field appears under them when "Custom" is picked.
 */
export function TipPicker({
  suggestedAmounts,
  currency,
  choice,
  onChoice,
  customText,
  onCustomText,
  customError,
  noTipLabel,
  customLabel,
  showNoTip = true,
}: {
  suggestedAmounts: number[];
  currency: string;
  choice: TipChoice;
  onChoice: (choice: TipChoice) => void;
  customText: string;
  onCustomText: (text: string) => void;
  customError?: string | null;
  noTipLabel: string;
  customLabel: string;
  /** Off when tipping is the whole point of the step (tip after paying). */
  showNoTip?: boolean;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation();
  // Four chips read better as 2×2 than 3 + one stretched chip.
  const chipCount = suggestedAmounts.length + 1 + (showNoTip ? 1 : 0);
  const chipBasis = chipCount === 4 ? styles.amountChipHalf : null;
  const chip = (
    key: string,
    label: string,
    on: boolean,
    onPress: () => void,
    small = false,
  ) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.amountChip, chipBasis, on && styles.amountChipOn]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
    >
      <Text
        style={[
          styles.amountChipText,
          small && styles.amountChipTextSmall,
          on && styles.amountChipTextOn,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ gap: moderateHeightScale(14) }}>
      <View style={styles.chipsRow} accessibilityRole="radiogroup">
        {suggestedAmounts.map((amount) =>
          chip(
            `a-${amount}`,
            formatVisitMoney(amount, currency).replace(/\.00$/, ""),
            choice.kind === "amount" && choice.amount === amount,
            () => onChoice({ kind: "amount", amount }),
          ),
        )}
        {chip(
          "custom",
          customLabel,
          choice.kind === "custom",
          () => onChoice({ kind: "custom" }),
          true,
        )}
        {showNoTip
          ? chip(
              "none",
              noTipLabel,
              choice.kind === "none",
              () => onChoice({ kind: "none" }),
              true,
            )
          : null}
      </View>
      {choice.kind === "custom" ? (
        <FlowTextField
          label={t("avCustomTipLabel")}
          prefix="$"
          value={customText}
          onChangeText={(text) => onCustomText(sanitizeAmountInput(text))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={customError}
          autoFocus
          returnKeyType="done"
        />
      ) : null}
    </View>
  );
}

/** Tip picked in a TipPicker, or null for "No tip" / an empty custom field. */
export function tipFromChoice(
  choice: TipChoice,
  customText: string,
): number | null {
  if (choice.kind === "amount") return choice.amount;
  if (choice.kind === "custom") return parseAmount(customText);
  return null;
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { theme, styles } = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.stars} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          activeOpacity={0.7}
          onPress={() => onChange(star)}
          style={styles.starBtn}
          accessibilityRole="radio"
          accessibilityLabel={t("avStarsLabel", { count: star })}
          accessibilityState={{ checked: value === star }}
        >
          <MaterialIcons
            name={star <= value ? "star" : "star-border"}
            size={moderateWidthScale(44)}
            color={star <= value ? theme.orangeBrown : theme.lightGreen2}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
