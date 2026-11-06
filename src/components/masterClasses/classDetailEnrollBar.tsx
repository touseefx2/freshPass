// Bottom bar of the customer class detail: price + Enroll Now, or
// "You're enrolled" + View my class, or a disabled button with the reason.

import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { PriceTag, StatusChip } from "./parts";

export type ClassEnrollBarMode = "enroll" | "enrolled" | "blocked";

type Props = {
  mode: ClassEnrollBarMode;
  price: { current: number | null; original: number | null };
  /** `blocked` only: why enrolling is off. */
  blockedReason?: string;
  /** "You'll pay $149 to Fade Lab. Full refund …" */
  summary?: string;
  /** Payment sheet is being prepared / shown. */
  busy?: boolean;
  /** Server message from the last enroll attempt. */
  error?: string | null;
  onDismissError?: () => void;
  onEnroll: () => void;
  onViewMine: () => void;
  /** Safe-area bottom inset. */
  bottomInset: number;
};

export function ClassDetailEnrollBar({
  mode,
  price,
  blockedReason,
  summary,
  busy = false,
  error,
  onDismissError,
  onEnroll,
  onViewMine,
  bottomInset,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const enrolled = mode === "enrolled";
  const blocked = mode === "blocked";

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: bottomInset + moderateHeightScale(12) },
      ]}
    >
      {error ? (
        <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons
            name="alert-circle-outline"
            size={iconScale(18)}
            color={theme.red}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
          {onDismissError ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDismissError}
              style={styles.errorClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Ionicons name="close" size={iconScale(18)} color={theme.red} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.priceBlock}>
          {enrolled ? (
            <StatusChip
              tone="live"
              icon="checkmark-circle"
              label={t("mcYoureEnrolled")}
              style={styles.enrolledChip}
            />
          ) : (
            <>
              <Text style={styles.priceLabel}>{t("price")}</Text>
              <PriceTag amount={price.current} original={price.original} size="lg" />
            </>
          )}
        </View>

        {enrolled ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onViewMine}
            style={styles.primary}
            accessibilityRole="button"
            accessibilityLabel={t("mcViewMyClass")}
          >
            <Text style={styles.primaryText} numberOfLines={1}>
              {t("mcViewMyClass")}
            </Text>
            <Ionicons name="arrow-forward" size={iconScale(18)} color={theme.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onEnroll}
            disabled={blocked || busy}
            style={[styles.primary, blocked && styles.primaryDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t("mcEnrollNow")}
            accessibilityHint={blocked ? blockedReason : summary}
            accessibilityState={{ disabled: blocked || busy, busy }}
          >
            {busy ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <>
                <Ionicons
                  name="school-outline"
                  size={iconScale(18)}
                  color={blocked ? theme.lightGreen5 : theme.white}
                />
                <Text
                  style={[styles.primaryText, blocked && styles.primaryTextDisabled]}
                  numberOfLines={1}
                >
                  {t("mcEnrollNow")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {blocked && blockedReason ? (
        <View style={styles.noteRow}>
          <Ionicons
            name="information-circle-outline"
            size={iconScale(16)}
            color={theme.orangeBrownText}
          />
          <Text style={[styles.noteText, styles.noteWarn]}>{blockedReason}</Text>
        </View>
      ) : null}

      {mode === "enroll" && summary ? (
        <View style={styles.noteRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={iconScale(15)}
            color={theme.darkGreenLight}
          />
          <Text style={styles.noteText}>{summary}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.surfaceRaised,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
      gap: moderateHeightScale(10),
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightRed30,
      backgroundColor: theme.lightRed,
    },
    errorIcon: {
      marginRight: moderateWidthScale(8),
      marginTop: moderateHeightScale(1),
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    errorClose: {
      marginLeft: moderateWidthScale(8),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    priceBlock: {
      flexShrink: 1,
      minWidth: moderateWidthScale(92),
    },
    priceLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(1),
    },
    enrolledChip: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
    },
    primary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      borderWidth: 1.5,
      borderColor: theme.orangeBrown30,
    },
    primaryDisabled: {
      backgroundColor: theme.lightGreen1,
      borderColor: theme.borderLight,
    },
    primaryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    primaryTextDisabled: {
      color: theme.lightGreen5,
    },
    noteRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(6),
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    noteWarn: {
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
  });
