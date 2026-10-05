import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import type { MediaLimits } from "@/src/types/media";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(12),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    iconBadge: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    title: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(8),
    },
    stepButton: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    stepButtonDisabled: {
      backgroundColor: theme.lightGreen015,
    },
    valueCol: {
      alignItems: "center",
    },
    value: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    valueUnit: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    helperRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(6),
    },
    helperText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    warnText: {
      color: theme.orangeBrown,
    },
    errorText: {
      color: theme.red,
    },
    usageTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    usageValue: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    usageLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    track: {
      height: moderateHeightScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.buttonBack,
    },
    fillFull: {
      backgroundColor: theme.orangeBrown,
    },
    statsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    stat: {
      flex: 1,
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
      gap: moderateHeightScale(2),
    },
    statValue: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    statLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    inlineText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    actionButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      minHeight: moderateHeightScale(36),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.buttonBack,
    },
    actionText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

/** Used / limit bar; turns orange when the limit is reached (text says so too). */
export function ReelUsageBar({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          ratio >= 1 && styles.fillFull,
          { width: `${Math.round(ratio * 100)}%` },
        ]}
      />
    </View>
  );
}

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Highest number the owner can give right now */
  max: number;
  /** Reels this staff member already posted this month */
  used: number;
  /** Reels still unassigned in the business (before this edit) */
  freeToGive: number | null;
  resetLabel: string | null;
  loading?: boolean;
  error?: string | null;
};

/** Edit Staff → how many of the business's monthly reels this staff member gets. */
export function MonthlyReelsStepper({
  value,
  onChange,
  max,
  used,
  freeToGive,
  resetLabel,
  loading,
  error,
}: StepperProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const canDecrease = !loading && value > 0;
  const canIncrease = !loading && value < max;

  const helper = [
    freeToGive != null ? t("monthlyReelsFreeToGive", { count: freeToGive }) : null,
    resetLabel ? t("monthlyReelsResets", { date: resetLabel }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <MaterialIcons
            name="movie-filter"
            size={moderateWidthScale(18)}
            color={theme.buttonBack}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t("monthlyReels")}
          </Text>
          <Text style={styles.subtitle}>{t("monthlyReelsStaffSubtitle")}</Text>
        </View>
      </View>

      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepButton, !canDecrease && styles.stepButtonDisabled]}
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={!canDecrease}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t("monthlyReelsDecrease")}
          accessibilityState={{ disabled: !canDecrease }}
        >
          <MaterialIcons
            name="remove"
            size={moderateWidthScale(22)}
            color={canDecrease ? theme.buttonText : theme.lightGreen5}
          />
        </TouchableOpacity>

        <View
          style={styles.valueCol}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("monthlyReels")}
          accessibilityValue={{ min: 0, max, now: value }}
          accessibilityActions={[
            { name: "increment" },
            { name: "decrement" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment" && canIncrease) {
              onChange(value + 1);
            }
            if (event.nativeEvent.actionName === "decrement" && canDecrease) {
              onChange(value - 1);
            }
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.buttonBack} />
          ) : (
            <Text style={styles.value}>{value}</Text>
          )}
          <Text style={styles.valueUnit}>{t("monthlyReelsPerMonth")}</Text>
        </View>

        <TouchableOpacity
          style={[styles.stepButton, !canIncrease && styles.stepButtonDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={!canIncrease}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t("monthlyReelsIncrease")}
          accessibilityState={{ disabled: !canIncrease }}
        >
          <MaterialIcons
            name="add"
            size={moderateWidthScale(22)}
            color={canIncrease ? theme.buttonText : theme.lightGreen5}
          />
        </TouchableOpacity>
      </View>

      {helper ? (
        <View style={styles.helperRow}>
          <MaterialIcons
            name="info-outline"
            size={moderateWidthScale(14)}
            color={theme.lightGreen}
          />
          <Text style={styles.helperText}>{helper}</Text>
        </View>
      ) : null}

      {used > 0 ? (
        <View style={{ gap: moderateHeightScale(6) }}>
          <Text style={styles.helperText}>
            {t("monthlyReelsUsedOf", { used, limit: value })}
          </Text>
          <ReelUsageBar used={used} limit={value} />
        </View>
      ) : null}

      {!loading && value === 0 ? (
        <View style={styles.helperRow}>
          <MaterialIcons
            name="block"
            size={moderateWidthScale(14)}
            color={theme.orangeBrown}
          />
          <Text style={[styles.helperText, styles.warnText]}>
            {t("monthlyReelsZeroHint")}
          </Text>
        </View>
      ) : !loading && value < used ? (
        <View style={styles.helperRow}>
          <MaterialIcons
            name="warning-amber"
            size={moderateWidthScale(14)}
            color={theme.orangeBrown}
          />
          <Text style={[styles.helperText, styles.warnText]}>
            {t("monthlyReelsBelowUsedHint", { used })}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.helperRow} accessibilityRole="alert">
          <MaterialIcons
            name="error-outline"
            size={moderateWidthScale(14)}
            color={theme.red}
          />
          <Text style={[styles.helperText, styles.errorText]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

type UsageCardProps = {
  /** null = none given */
  limit: number | null;
  used: number;
  resetLabel: string | null;
  onChangePress?: () => void;
};

/** Staff detail (owner view): "2 of 4 used this month". */
export function StaffReelUsageCard({
  limit,
  used,
  resetLabel,
  onChangePress,
}: UsageCardProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const hasLimit = (limit ?? 0) > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <MaterialIcons
            name="movie-filter"
            size={moderateWidthScale(18)}
            color={theme.buttonBack}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t("monthlyReels")}
          </Text>
          {resetLabel ? (
            <Text style={styles.subtitle}>
              {t("monthlyReelsResets", { date: resetLabel })}
            </Text>
          ) : null}
        </View>
      </View>

      {hasLimit ? (
        <View style={{ gap: moderateHeightScale(6) }}>
          <View style={styles.usageTop}>
            <Text style={styles.usageValue}>
              {used} / {limit}
            </Text>
            <Text style={styles.usageLabel}>
              {used >= (limit ?? 0)
                ? t("monthlyReelsAllUsed")
                : t("monthlyReelsLeft", { count: (limit ?? 0) - used })}
            </Text>
          </View>
          <ReelUsageBar used={used} limit={limit ?? 0} />
        </View>
      ) : (
        <View style={styles.helperRow}>
          <MaterialIcons
            name="block"
            size={moderateWidthScale(14)}
            color={theme.orangeBrown}
          />
          <Text style={[styles.helperText, styles.warnText]}>
            {t("monthlyReelsNoneGiven")}
          </Text>
        </View>
      )}

      {onChangePress ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onChangePress}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <MaterialIcons
            name={hasLimit ? "tune" : "add"}
            size={moderateWidthScale(14)}
            color={theme.darkGreen}
          />
          <Text style={styles.actionText}>
            {hasLimit ? t("monthlyReelsChange") : t("monthlyReelsGive")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Team screen (owner): the business's shared 12 and how they are split. */
export function BusinessReelsSummaryCard({
  limits,
  resetLabel,
}: {
  limits: MediaLimits;
  resetLabel: string | null;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const max = limits.max_reels_per_month ?? 12;
  const used = limits.business_reels_used_this_month ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <MaterialIcons
            name="movie-filter"
            size={moderateWidthScale(18)}
            color={theme.buttonBack}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t("monthlyReels")}
          </Text>
          <Text style={styles.subtitle}>
            {t("monthlyReelsBusinessSubtitle", { count: max })}
          </Text>
        </View>
      </View>

      <View style={{ gap: moderateHeightScale(6) }}>
        <View style={styles.usageTop}>
          <Text style={styles.usageValue}>
            {used} / {max}
          </Text>
          <Text style={styles.usageLabel}>
            {resetLabel
              ? t("monthlyReelsResets", { date: resetLabel })
              : t("monthlyReelsUsedThisMonth")}
          </Text>
        </View>
        <ReelUsageBar used={used} limit={max} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{limits.assigned_to_staff ?? 0}</Text>
          <Text style={styles.statLabel}>{t("monthlyReelsGivenToStaff")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{limits.unassigned ?? 0}</Text>
          <Text style={styles.statLabel}>{t("monthlyReelsForYou")}</Text>
        </View>
      </View>
    </View>
  );
}

/** One line under a staff member in the team list: "Reels: 2 of 4 used". */
export function StaffReelUsageInline({
  limit,
  used,
}: {
  limit: number | null;
  used: number;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const hasLimit = (limit ?? 0) > 0;
  return (
    <View style={styles.inlineRow}>
      <MaterialIcons
        name={hasLimit ? "movie-filter" : "block"}
        size={moderateWidthScale(12)}
        color={hasLimit ? theme.buttonBack : theme.orangeBrown}
      />
      <Text
        style={[styles.inlineText, !hasLimit && styles.warnText]}
        numberOfLines={1}
      >
        {hasLimit
          ? t("monthlyReelsInline", { used, limit })
          : t("monthlyReelsNoneGivenShort")}
      </Text>
    </View>
  );
}
