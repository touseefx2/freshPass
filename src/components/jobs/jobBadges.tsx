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
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { JobPost, JobPostStatus } from "@/src/types/jobs";
import {
  JOB_EMPLOYMENT_LABEL_KEYS,
  JOB_EXPERIENCE_LABEL_KEYS,
  JOB_SCHEDULE_LABEL_KEYS,
  JOB_STATUS_LABEL_KEYS,
  getJobStatusTone,
} from "@/src/utils/jobHelpers";

/**
 * Small hiring pieces: the green HIRING ring around a business picture, the
 * HIRING tag for list cards, a post's status badge and its fact chips.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // ── HIRING ring (business logo on the dark green profile sheet)
    ringWrap: {
      alignItems: "center",
      paddingBottom: moderateHeightScale(8),
    },
    ring: {
      padding: moderateWidthScale(2.5),
      borderWidth: 2.5,
      borderColor: theme.green,
      borderRadius: moderateWidthScale(22),
    },
    ringPill: {
      position: "absolute",
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.green,
      borderWidth: 2,
      borderColor: theme.darkGreen,
    },
    ringPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      letterSpacing: 0.8,
      includeFontPadding: false,
    },
    // ── HIRING tag (list cards / light backgrounds)
    tag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.successGreen,
      borderWidth: 1.5,
      borderColor: theme.white,
    },
    tagText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
      letterSpacing: 0.8,
      includeFontPadding: false,
    },
    // ── Golden "We're Hiring" banner
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown,
    },
    bannerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    bannerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
    },
    bannerText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      includeFontPadding: false,
    },
    bannerLink: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      includeFontPadding: false,
    },
    // ── Golden briefcase circle badge
    badgeIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Status badge
    status: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    statusText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
    },
    statusOpen: { backgroundColor: theme.tileMint },
    statusOpenText: { color: theme.successGreen },
    statusNeutral: { backgroundColor: theme.lightGreen07 },
    statusNeutralText: { color: theme.darkGreen },
    statusWarn: { backgroundColor: theme.tilePeach },
    statusWarnText: { color: theme.orangeBrownText },
    statusDanger: { backgroundColor: theme.lightRed },
    statusDangerText: { color: theme.red },
    // ── Fact chips
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
      minHeight: heightScale(32),
      paddingHorizontal: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen05,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

function useJobBadgeStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/**
 * Green HIRING ring + label around a business picture (dark green sheet).
 * Tapping it opens the profile's Jobs section.
 */
export function HiringRing({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobBadgeStyles();
  const content = (
    <>
      <View style={styles.ring}>{children}</View>
      <View style={styles.ringPill}>
        <MaterialIcons
          name="work"
          size={moderateWidthScale(10)}
          color={theme.darkGreen}
        />
        <Text style={styles.ringPillText}>{t("jobHiringBadge")}</Text>
      </View>
    </>
  );
  if (!onPress) {
    return <View style={[styles.ringWrap, style]}>{content}</View>;
  }
  return (
    <TouchableOpacity
      style={[styles.ringWrap, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t("jobHiringBadgeA11y")}
    >
      {content}
    </TouchableOpacity>
  );
}

/** Compact HIRING tag for list cards (sits on photos or cream). */
export function HiringTag({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const { theme, styles } = useJobBadgeStyles();
  return (
    <View
      style={[styles.tag, style]}
      accessible
      accessibilityLabel={t("jobHiringBadgeShortA11y")}
    >
      <MaterialIcons
        name="work"
        size={moderateWidthScale(11)}
        color={theme.white}
      />
      <Text style={styles.tagText}>{t("jobHiringBadge")}</Text>
    </View>
  );
}

/** Golden "We're Hiring · View Jobs ›" banner for business detail / cards. */
export function HiringBanner({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobBadgeStyles();
  return (
    <TouchableOpacity
      style={[styles.banner, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t("jobHiringBadgeA11y")}
    >
      <View style={styles.bannerLeft}>
        <MaterialIcons
          name="work"
          size={moderateWidthScale(16)}
          color={theme.darkGreen}
        />
        <Text style={styles.bannerText}>{t("jobWeAreHiring")}</Text>
      </View>
      <View style={styles.bannerRight}>
        <Text style={styles.bannerLink}>{t("jobViewJobs")}</Text>
        <MaterialIcons
          name="chevron-right"
          size={moderateWidthScale(18)}
          color={theme.darkGreen}
        />
      </View>
    </TouchableOpacity>
  );
}

/** Small golden briefcase circle badge for card corners. */
export function HiringBadgeIcon({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme, styles } = useJobBadgeStyles();
  return (
    <View
      style={[styles.badgeIcon, style]}
      accessible
      accessibilityLabel="Hiring"
    >
      <MaterialIcons
        name="work"
        size={moderateWidthScale(14)}
        color={theme.darkGreen}
      />
    </View>
  );
}

const STATUS_ICONS: Record<JobPostStatus, IconName> = {
  open: "check-circle",
  closed: "lock-outline",
  expired: "schedule",
  removed: "block",
};

/** Status with icon + text (never colour alone). */
export function JobStatusBadge({
  status,
  style,
}: {
  status: JobPostStatus;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobBadgeStyles();
  const tone = getJobStatusTone(status);
  const [wrap, text, color] =
    tone === "open"
      ? [styles.statusOpen, styles.statusOpenText, theme.successGreen]
      : tone === "warn"
        ? [styles.statusWarn, styles.statusWarnText, theme.orangeBrownText]
        : tone === "danger"
          ? [styles.statusDanger, styles.statusDangerText, theme.red]
          : [styles.statusNeutral, styles.statusNeutralText, theme.darkGreen];
  return (
    <View style={[styles.status, wrap, style]}>
      <MaterialIcons
        name={STATUS_ICONS[status]}
        size={moderateWidthScale(14)}
        color={color}
      />
      <Text style={[styles.statusText, text]}>
        {t(JOB_STATUS_LABEL_KEYS[status])}
      </Text>
    </View>
  );
}

/** Schedule · employment type · experience · license, as chips. */
export function JobFactChips({
  post,
  showLicense = true,
  style,
}: {
  post: JobPost;
  showLicense?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useJobBadgeStyles();
  const facts: { icon: IconName; label: string }[] = [
    { icon: "schedule", label: t(JOB_SCHEDULE_LABEL_KEYS[post.schedule]) },
    ...(post.employmentType
      ? [
          {
            icon: "badge" as IconName,
            label: t(JOB_EMPLOYMENT_LABEL_KEYS[post.employmentType]),
          },
        ]
      : []),
    {
      icon: "trending-up",
      label: t(JOB_EXPERIENCE_LABEL_KEYS[post.experienceLevel]),
    },
    ...(showLicense && post.licenseRequired
      ? [{ icon: "verified" as IconName, label: t("jobLicenseRequired") }]
      : []),
  ];
  return (
    <View style={[styles.chips, style]}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.chip}>
          <MaterialIcons
            name={fact.icon}
            size={moderateWidthScale(15)}
            color={theme.buttonBack}
          />
          <Text style={styles.chipText}>{fact.label}</Text>
        </View>
      ))}
    </View>
  );
}
