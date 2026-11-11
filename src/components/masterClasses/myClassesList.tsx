// Customer "My classes" list pieces: filter pills, enrollment card and
// its loading placeholder (same footprint, so nothing jumps on load).

import React, { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
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
import type {
  ClassEnrollment,
  ClassEnrollmentFilter,
} from "@/src/types/masterClass";
import {
  ENROLLMENT_FILTERS,
  formatClassPrice,
  getClassTypeLabel,
  getClassWhenText,
  getEnrollmentStatusMeta,
} from "@/src/utils/masterClassHelpers";
import {
  ClassMediaThumb,
  ClassTypePill,
  MetaRow,
  StatusChip,
} from "@/src/components/masterClasses/parts";

const THUMB = moderateWidthScale(84);

const useStyles = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── Filter pills ────────────────────────────────────────────────────

type FilterPillsProps = {
  value: ClassEnrollmentFilter;
  onChange: (value: ClassEnrollmentFilter) => void;
};

/** Upcoming / Cancelled / Refunded — selected pill is dark green. */
export function MyClassesFilterPills({ value, onChange }: FilterPillsProps) {
  const { t } = useTranslation();
  const { styles } = useStyles();
  return (
    <View style={styles.pills} accessibilityRole="tablist">
      {ENROLLMENT_FILTERS.map((filter) => {
        const selected = filter.value === value;
        const label = t(filter.labelKey);
        return (
          <TouchableOpacity
            key={filter.value}
            activeOpacity={0.75}
            onPress={() => {
              if (!selected) onChange(filter.value);
            }}
            style={[styles.pill, selected && styles.pillSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <Text
              style={[styles.pillText, selected && styles.pillTextSelected]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────────────

type CardProps = {
  enrollment: ClassEnrollment;
  onPress: (enrollment: ClassEnrollment) => void;
};

function MyClassesCardBase({ enrollment, onPress }: CardProps) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  const cls = enrollment.class;

  const status = getEnrollmentStatusMeta(enrollment.status);
  const showRescheduled =
    enrollment.rescheduled && enrollment.status === "confirmed";
  const when = cls ? getClassWhenText(cls) : "";
  const business = cls?.business?.title ?? "";
  const title = cls?.title || t("mcClassDetails");
  const typeLabel = cls ? getClassTypeLabel(cls) : "";

  // Refunded rows show what came back; the rest show what was paid
  const refundAmount =
    enrollment.status === "refunded"
      ? (enrollment.refund?.amount ?? enrollment.amount)
      : null;
  const amountText =
    refundAmount != null
      ? t("mcRefundAmount", { amount: formatClassPrice(refundAmount) })
      : enrollment.amount > 0
        ? formatClassPrice(enrollment.amount)
        : "";

  const a11yLabel = [
    typeLabel,
    title,
    when,
    business,
    status.label,
    showRescheduled ? t("mcRescheduled") : "",
    amountText,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(enrollment)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t("mcViewMyClass")}
    >
      <View style={styles.main}>
        <ClassMediaThumb media={cls?.media} size={THUMB} />
        <View style={styles.body}>
          {cls ? <ClassTypePill label={cls.label} /> : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <MetaRow icon="calendar-outline" text={when} />
          <MetaRow icon="storefront-outline" text={business} />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.chips}>
          <StatusChip meta={status} />
          {showRescheduled ? (
            <StatusChip
              tone="warning"
              label={t("mcRescheduled")}
              icon="swap-horizontal"
            />
          ) : null}
        </View>
        <View style={styles.footerRight}>
          {amountText ? (
            <Text
              style={[
                styles.amount,
                refundAmount != null && { color: theme.orangeBrownText },
              ]}
              numberOfLines={1}
            >
              {amountText}
            </Text>
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={iconScale(16)}
            color={theme.lightGreen4}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MyClassesCard = memo(MyClassesCardBase);

// ── Skeleton ────────────────────────────────────────────────────────

export function MyClassesCardSkeleton() {
  const { styles } = useStyles();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={styles.card}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.main, { opacity: pulse }]}>
        <View style={[styles.skel, styles.skelThumb]} />
        <View style={styles.body}>
          <View style={[styles.skel, styles.skelPill]} />
          <View style={[styles.skel, styles.skelLong]} />
          <View style={[styles.skel, styles.skelShort]} />
          <View style={[styles.skel, styles.skelShort]} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: pulse }]}>
        <View style={[styles.skel, styles.skelChip]} />
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Pills
    pills: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    pill: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
    },
    pillSelected: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    pillText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    pillTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // Card
    card: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    main: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(12),
      paddingBottom: moderateHeightScale(10),
    },
    body: {
      flex: 1,
      gap: moderateHeightScale(5),
      minHeight: THUMB,
    },
    title: {
      fontSize: fontSize.size16,
      lineHeight: fontSize.size16 * 1.3,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
      minHeight: 44,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: moderateWidthScale(6),
      flexShrink: 1,
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    amount: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Skeleton
    skel: {
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(6),
    },
    skelThumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(10),
    },
    skelPill: {
      width: moderateWidthScale(86),
      height: moderateHeightScale(18),
      borderRadius: moderateWidthScale(999),
    },
    skelLong: {
      width: "88%",
      height: moderateHeightScale(16),
    },
    skelShort: {
      width: "58%",
      height: moderateHeightScale(12),
    },
    skelChip: {
      width: moderateWidthScale(92),
      height: moderateHeightScale(20),
      borderRadius: moderateWidthScale(999),
    },
  });
