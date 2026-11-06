// Small presentational pieces shared by every Master Classes screen.
// Theme tokens only; sizes through the dimension helpers.

import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import type {
  MasterClass,
  MasterClassMedia,
  MasterClassType,
} from "@/src/types/masterClass";
import {
  ClassBadgeMeta,
  ClassBadgeTone,
  formatClassPrice,
  getClassTypeLabel,
  getToneColors,
} from "@/src/utils/masterClassHelpers";

export type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const useMcTheme = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  return { theme, styles };
};

// ── ClassTypePill ───────────────────────────────────────────────────

type ClassTypePillProps = {
  /** Server label wins; else the translated type. */
  label?: string | null;
  type?: MasterClassType | null;
  /** `green` = pro screens / detail; `orange` = Deals card on dark green. */
  variant?: "green" | "orange";
  size?: "sm" | "md";
  /** Leading graduation-cap glyph. */
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ClassTypePill({
  label,
  type,
  variant = "green",
  size = "sm",
  showIcon = false,
  style,
}: ClassTypePillProps) {
  const { theme, styles } = useMcTheme();
  const text = label || getClassTypeLabel({ label: null, type: type ?? null });
  const isOrange = variant === "orange";
  const fg = isOrange ? theme.darkGreen : theme.white;
  return (
    <View
      style={[
        styles.typePill,
        size === "md" && styles.typePillMd,
        { backgroundColor: isOrange ? theme.orangeBrown : theme.marketGreen },
        style,
      ]}
    >
      {showIcon ? (
        <MaterialCommunityIcons
          name="school-outline"
          size={iconScale(size === "md" ? 14 : 12)}
          color={fg}
        />
      ) : null}
      <Text
        style={[styles.typePillText, size === "md" && styles.typePillTextMd, { color: fg }]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

// ── ClassMediaThumb ─────────────────────────────────────────────────

type ClassMediaThumbProps = {
  media?: MasterClassMedia | null;
  /** Local preview (editor) — overrides `media`. */
  uri?: string | null;
  isVideo?: boolean;
  /** Square size; ignored when width/height are given. */
  size?: number;
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  /** Play glyph size for videos. */
  playSize?: number;
  /** Placeholder for a dark card (Deals row): lighter tile, light icon. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ClassMediaThumb({
  media,
  uri,
  isVideo,
  size = moderateWidthScale(88),
  width,
  height,
  radius = moderateWidthScale(10),
  playSize,
  onDark = false,
  style,
}: ClassMediaThumbProps) {
  const { theme, styles } = useMcTheme();
  const video = isVideo ?? media?.type === "video";
  const source =
    uri ??
    (media
      ? video
        ? media.thumbnail_url
        : media.url || media.thumbnail_url
      : null);
  const box: ViewStyle = {
    width: width ?? size,
    height: height ?? size,
    borderRadius: radius,
  };
  const glyph = playSize ?? Math.max(iconScale(14), Math.min(iconScale(28), (height ?? size) * 0.22));

  const placeholder = (
    <View
      style={[
        styles.thumbPlaceholder,
        onDark && { backgroundColor: theme.darkGreenLight },
        box,
      ]}
    >
      <MaterialCommunityIcons
        name="school-outline"
        size={Math.min(iconScale(40), (height ?? size) * 0.38)}
        color={onDark ? theme.orangeBrown : theme.lightGreen4}
      />
    </View>
  );

  return (
    <View style={[styles.thumbWrap, box, style]}>
      <AppImage
        uri={source}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        contentFit="cover"
        fallback={placeholder}
        accessibilityIgnoresInvertColors
      />
      {video ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View
            style={[
              styles.playCircle,
              { width: glyph * 1.9, height: glyph * 1.9, borderRadius: glyph },
            ]}
          >
            <Ionicons
              name="play"
              size={glyph}
              color={theme.white}
              style={{ marginLeft: glyph * 0.12 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── MetaRow ─────────────────────────────────────────────────────────

type MetaRowProps = {
  icon: IoniconName;
  text: string;
  /** Text + icon colour (defaults to muted dark green). */
  color?: string;
  iconColor?: string;
  numberOfLines?: number;
  size?: "sm" | "md";
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function MetaRow({
  icon,
  text,
  color,
  iconColor,
  numberOfLines = 1,
  size = "sm",
  textStyle,
  style,
}: MetaRowProps) {
  const { theme, styles } = useMcTheme();
  if (!text) return null;
  const fg = color ?? theme.textMuted;
  return (
    <View style={[styles.metaRow, style]}>
      <Ionicons
        name={icon}
        size={iconScale(size === "md" ? 17 : 14)}
        color={iconColor ?? (color ? fg : theme.darkGreenLight)}
        style={styles.metaIcon}
      />
      <Text
        style={[styles.metaText, size === "md" && styles.metaTextMd, { color: fg }, textStyle]}
        numberOfLines={numberOfLines}
      >
        {text}
      </Text>
    </View>
  );
}

// ── StatusChip ──────────────────────────────────────────────────────

type StatusChipProps = {
  /** From getListingBadge / getClassStatusMeta / getEnrollmentStatusMeta. */
  meta?: ClassBadgeMeta;
  tone?: ClassBadgeTone;
  label?: string;
  icon?: string;
  /** Hide the leading glyph. */
  hideIcon?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({
  meta,
  tone,
  label,
  icon,
  hideIcon = false,
  style,
}: StatusChipProps) {
  const { theme, styles } = useMcTheme();
  const resolvedTone = tone ?? meta?.tone ?? "neutral";
  const text = label ?? meta?.label ?? "";
  const glyph = (icon ?? meta?.icon) as IoniconName | undefined;
  const c = getToneColors(theme, resolvedTone);
  if (!text) return null;
  return (
    <View
      style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }, style]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      {glyph && !hideIcon ? (
        <Ionicons name={glyph} size={iconScale(12)} color={c.fg} />
      ) : null}
      <Text style={[styles.chipText, { color: c.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// ── SectionCard ─────────────────────────────────────────────────────

type SectionCardProps = {
  title?: string;
  icon?: IoniconName;
  /** Right side of the title row (e.g. a "View all" link). */
  right?: React.ReactNode;
  /** Thin orange outline (promotion / highlight cards). */
  highlighted?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionCard({
  title,
  icon,
  right,
  highlighted = false,
  children,
  style,
}: SectionCardProps) {
  const { theme, styles } = useMcTheme();
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted, style]}>
      {title ? (
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            {icon ? (
              <Ionicons
                name={icon}
                size={iconScale(18)}
                color={theme.darkGreen}
                style={styles.cardTitleIcon}
              />
            ) : null}
            <Text style={styles.cardTitle} accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ── CertificationNotice ─────────────────────────────────────────────

type CertificationNoticeProps = {
  /** Server `certification_notice`; falls back to the standard wording. */
  text?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CertificationNotice({
  text,
  compact = false,
  style,
}: CertificationNoticeProps) {
  const { theme, styles } = useMcTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.notice, compact && styles.noticeCompact, style]}>
      <Ionicons
        name="ribbon-outline"
        size={iconScale(compact ? 16 : 20)}
        color={theme.goldTextDark}
        style={styles.noticeIcon}
      />
      <View style={styles.noticeBody}>
        {!compact ? (
          <Text style={styles.noticeTitle}>{t("mcCertificationNoticeTitle")}</Text>
        ) : null}
        <Text style={styles.noticeText}>
          {text || t("mcCertificationNoticeDefault")}
        </Text>
      </View>
    </View>
  );
}

// ── PriceTag ────────────────────────────────────────────────────────

type PriceTagProps = {
  /** What the student pays (enrollment_price). */
  amount: number | null | undefined;
  /** Struck-through original price (only when discounted). */
  original?: number | null;
  size?: "sm" | "md" | "lg";
  /** Light text for dark green backgrounds. */
  inverted?: boolean;
  /** Override the main price colour (e.g. gold on the Deals card). */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function PriceTag({
  amount,
  original,
  size = "md",
  inverted = false,
  color,
  style,
}: PriceTagProps) {
  const { theme, styles } = useMcTheme();
  const main = formatClassPrice(amount);
  if (!main) return null;
  const struck = original != null && amount != null && original > amount
    ? formatClassPrice(original)
    : "";
  const mainSize =
    size === "lg" ? fontSize.size26 : size === "sm" ? fontSize.size15 : fontSize.size18;
  const mainColor = color ?? (inverted ? theme.white : theme.darkGreen);
  return (
    <View
      style={[styles.priceRow, style]}
      accessibilityLabel={struck ? `${main}, was ${struck}` : main}
    >
      <Text style={[styles.priceMain, { fontSize: mainSize, color: mainColor }]}>
        {main}
      </Text>
      {struck ? (
        <Text
          style={[
            styles.priceStruck,
            { color: inverted ? theme.white70 : theme.lightGreen5 },
            size === "lg" && { fontSize: fontSize.size16 },
          ]}
        >
          {struck}
        </Text>
      ) : null}
    </View>
  );
}

// ── ClassStateView (loading / empty / error) ────────────────────────

type ClassStateViewProps = {
  loading?: boolean;
  icon?: IoniconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Leading icon of the action button. */
  actionIcon?: IoniconName;
  style?: StyleProp<ViewStyle>;
};

/** Centered state block used for loading, empty lists and errors with retry. */
export function ClassStateView({
  loading = false,
  icon = "school-outline",
  title,
  message,
  actionLabel,
  onAction,
  actionIcon,
  style,
}: ClassStateViewProps) {
  const { theme, styles } = useMcTheme();
  if (loading) {
    return (
      <View style={[styles.state, style]}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
      </View>
    );
  }
  return (
    <View style={[styles.state, style]}>
      <View style={styles.stateIconCircle}>
        <Ionicons name={icon} size={iconScale(30)} color={theme.darkGreen} />
      </View>
      {title ? (
        <Text style={styles.stateTitle} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          style={styles.stateButton}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {actionIcon ? (
            <Ionicons name={actionIcon} size={iconScale(18)} color={theme.white} />
          ) : null}
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── ClassSummaryRow (media + pill + title + when) ───────────────────

type ClassSummaryRowProps = {
  masterClass: Pick<MasterClass, "media" | "label" | "type" | "title">;
  /** Lines under the title (MetaRows). */
  children?: React.ReactNode;
  thumbSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Thumb on the left, type pill + title + meta on the right (preview cards). */
export function ClassSummaryRow({
  masterClass,
  children,
  thumbSize = moderateWidthScale(88),
  style,
}: ClassSummaryRowProps) {
  const { styles } = useMcTheme();
  return (
    <View style={[styles.summaryRow, style]}>
      <ClassMediaThumb media={masterClass.media} size={thumbSize} />
      <View style={styles.summaryBody}>
        <ClassTypePill label={masterClass.label} type={masterClass.type} />
        <Text style={styles.summaryTitle} numberOfLines={2}>
          {masterClass.title}
        </Text>
        {children}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Type pill
    typePill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(9),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      maxWidth: "100%",
    },
    typePillMd: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
    },
    typePillText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      letterSpacing: 0.2,
    },
    typePillTextMd: {
      fontSize: fontSize.size13,
    },

    // Media thumb
    thumbWrap: {
      overflow: "hidden",
      backgroundColor: theme.lightGreen07,
    },
    thumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    playCircle: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen4,
      borderWidth: 1.5,
      borderColor: theme.white80,
    },

    // Meta row
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: moderateHeightScale(20),
    },
    metaIcon: {
      marginRight: moderateWidthScale(6),
    },
    metaText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
    },
    metaTextMd: {
      fontSize: fontSize.size15,
    },

    // Status chip
    chip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
    },
    chipText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
    },

    // Section card
    card: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(16),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHighlighted: {
      borderColor: theme.orangeBrown,
      borderWidth: 1.5,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(10),
      gap: moderateWidthScale(8),
    },
    cardTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    cardTitleIcon: {
      marginRight: moderateWidthScale(8),
    },
    cardTitle: {
      flexShrink: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Certification notice
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.noticeCream,
      borderColor: theme.goldBorder,
      borderWidth: 1,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(14),
    },
    noticeCompact: {
      padding: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10),
    },
    noticeIcon: {
      marginRight: moderateWidthScale(10),
      marginTop: moderateHeightScale(1),
    },
    noticeBody: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    noticeTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.goldTextDark,
    },
    noticeText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.goldTextDark,
    },

    // Price tag
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: moderateWidthScale(6),
    },
    priceMain: {
      fontFamily: fonts.fontBold,
    },
    priceStruck: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      textDecorationLine: "line-through",
    },

    // State view
    state: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      paddingVertical: moderateHeightScale(40),
      gap: moderateHeightScale(10),
    },
    stateIconCircle: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
      marginBottom: moderateHeightScale(4),
    },
    stateTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    stateMessage: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
    stateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(46),
      paddingHorizontal: moderateWidthScale(22),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      marginTop: moderateHeightScale(8),
    },
    stateButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // Summary row
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    summaryBody: {
      flex: 1,
      gap: moderateHeightScale(5),
    },
    summaryTitle: {
      fontSize: fontSize.size16,
      lineHeight: fontSize.size16 * 1.3,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });
