import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

/**
 * Small presentational pieces shared by the step-by-step reel flows.
 * Large type and 48dp+ targets — the flows are used one-handed in a salon.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    titleBlock: {
      gap: moderateHeightScale(6),
    },
    title: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size32,
    },
    titleCompact: {
      fontSize: fontSize.size24,
      lineHeight: fontSize.size30,
    },
    subtitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size22,
    },
    sectionLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionMeta: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: moderateWidthScale(8),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    disabled: { opacity: 0.45 },
    // ── Source card ("Choose from gallery" / "Record a video"): layered
    // card, soft white→cream wash, warm + olive glows, gradient icon tile.
    sourceShadow: {
      borderRadius: moderateWidthScale(24),
      backgroundColor: theme.white,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(18),
      elevation: 5,
    },
    sourceCard: {
      borderRadius: moderateWidthScale(24),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(18),
      gap: moderateHeightScale(12),
      minHeight: heightScale(150),
    },
    sourceGlow: {
      position: "absolute",
      borderRadius: 999,
    },
    sourceGlowWarm: {
      width: widthScale(170),
      height: widthScale(170),
      top: -widthScale(70),
      right: -widthScale(50),
      backgroundColor: theme.orangeBrown01,
    },
    sourceGlowCool: {
      width: widthScale(130),
      height: widthScale(130),
      bottom: -widthScale(60),
      left: -widthScale(40),
      backgroundColor: theme.lightGreen05,
    },
    sourceHalo: {
      width: widthScale(92),
      height: widthScale(92),
      borderRadius: widthScale(30),
      backgroundColor: theme.orangeBrown01,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceIcon: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    sourceBadge: {
      position: "absolute",
      top: -widthScale(4),
      right: -widthScale(4),
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: widthScale(14),
      backgroundColor: theme.selectCard,
      borderWidth: 2.5,
      borderColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceLabel: {
      fontSize: fontSize.size19,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    sourcePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: -moderateHeightScale(2),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: 999,
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sourcePillText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: heightScale(74),
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(10),
    },
    optionIcon: {
      width: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
    optionText: { flex: 1, minWidth: 0 },
    optionTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionSub: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    optionDoneDot: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
    },
    mediaThumb: {
      width: widthScale(88),
      height: widthScale(88),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    mediaThumbImage: {
      ...StyleSheet.absoluteFillObject,
    },
    mediaText: { flex: 1, minWidth: 0 },
    mediaTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    mediaSub: {
      marginTop: moderateHeightScale(3),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    mediaAction: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(23),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
    },
    noteInfo: {
      backgroundColor: theme.lightGreen07,
      borderColor: theme.borderLight,
    },
    noteWarm: {
      backgroundColor: theme.upcomingCard,
      borderColor: theme.upcomingBorder,
    },
    noteError: {
      backgroundColor: theme.lightRed,
      borderColor: theme.lightRedBorder,
    },
    noteText: { flex: 1, minWidth: 0 },
    noteTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    noteBody: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
  });

function useFlowStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export function FlowTitle({
  title,
  subtitle,
  compact = false,
  style,
}: {
  title: string;
  subtitle?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useFlowStyles();
  return (
    <View style={[styles.titleBlock, style]}>
      <Text
        style={[styles.title, compact && styles.titleCompact]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({
  label,
  meta,
  required = false,
  style,
}: {
  label: string;
  meta?: string | null;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useFlowStyles();
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionLabel}>
        {label}
        {required ? <Text style={{ color: theme.selectCard }}> *</Text> : null}
      </Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export function FlowCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useFlowStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Big tappable card with a round icon — "Choose from gallery", "Record a video". */
export function SourceCard({
  icon,
  label,
  sublabel,
  sublabelIcon,
  badgeIcon,
  onPress,
  disabled = false,
  loading = false,
  style,
}: {
  icon: IconName;
  label: string;
  sublabel?: string | null;
  /** Small icon inside the sub-label pill. */
  sublabelIcon?: IconName;
  /** Little round badge on the icon tile ("+" for gallery, REC dot for camera). */
  badgeIcon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useFlowStyles();
  const inactive = disabled || loading;
  // Gentle press-down (skipped with Reduce Motion) + a light haptic tap
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.sourceShadow, pressStyle, disabled && styles.disabled, style]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        onPressIn={() => {
          if (!reduceMotion) scale.value = withTiming(0.97, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        disabled={inactive}
        style={styles.sourceCard}
        accessibilityRole="button"
        accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
        accessibilityState={{ disabled: inactive, busy: loading }}
      >
        <LinearGradient
          colors={[theme.white, theme.white, theme.background]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.sourceGlow, styles.sourceGlowWarm]} pointerEvents="none" />
        <View style={[styles.sourceGlow, styles.sourceGlowCool]} pointerEvents="none" />

        <View style={styles.sourceHalo}>
          <LinearGradient
            colors={[theme.buttonBack, theme.darkGreen]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sourceIcon}
          >
            {loading ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <MaterialIcons
                name={icon}
                size={moderateWidthScale(34)}
                color={theme.white}
              />
            )}
          </LinearGradient>
          {badgeIcon && !loading ? (
            <View style={styles.sourceBadge} pointerEvents="none">
              <MaterialIcons
                name={badgeIcon}
                size={moderateWidthScale(14)}
                color={theme.white}
              />
            </View>
          ) : null}
        </View>

        <Text style={styles.sourceLabel}>{label}</Text>
        {sublabel ? (
          <View style={styles.sourcePill}>
            {sublabelIcon ? (
              <MaterialIcons
                name={sublabelIcon}
                size={moderateWidthScale(16)}
                color={theme.buttonBack}
              />
            ) : null}
            <Text style={styles.sourcePillText}>{sublabel}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** List row with icon, title, value and chevron — the "Style / Music / Text" rows. */
export function OptionRow({
  icon,
  iconNode,
  title,
  subtitle,
  onPress,
  done = false,
  disabled = false,
  style,
  accessibilityHint,
}: {
  icon?: IconName;
  iconNode?: React.ReactNode;
  title: string;
  subtitle?: string | null;
  onPress: () => void;
  /** Shows a check instead of only the chevron once something is set. */
  done?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { theme, styles } = useFlowStyles();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.card,
        styles.optionRow,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <View style={styles.optionIcon}>
        {iconNode ??
          (icon ? (
            <MaterialIcons
              name={icon}
              size={moderateWidthScale(30)}
              color={theme.selectCard}
            />
          ) : null)}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.optionSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {done ? (
        <View style={styles.optionDoneDot}>
          <MaterialIcons
            name="check"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        </View>
      ) : null}
      <MaterialIcons
        name="chevron-right"
        size={moderateWidthScale(28)}
        color={theme.darkGreen}
      />
    </TouchableOpacity>
  );
}

/** Picked video / photo with a big remove (or other) action. */
export function SelectedMediaRow({
  thumbUri,
  title,
  subtitle,
  isPhoto = false,
  onAction,
  actionIcon = "close",
  actionLabel,
  secondaryAction,
  loading = false,
  style,
}: {
  thumbUri: string | null | undefined;
  title: string;
  subtitle?: string | null;
  isPhoto?: boolean;
  onAction?: (() => void) | null;
  actionIcon?: IconName;
  actionLabel?: string;
  /** Extra round button before the main one (e.g. edit a slot video). */
  secondaryAction?: { icon: IconName; label: string; onPress: () => void } | null;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useFlowStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.mediaRow, style]}>
      <View style={styles.mediaThumb}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.mediaThumbImage}
            contentFit="cover"
            transition={120}
          />
        ) : loading ? (
          <ActivityIndicator color={theme.white} />
        ) : (
          <MaterialIcons
            name={isPhoto ? "image" : "movie"}
            size={moderateWidthScale(28)}
            color={theme.white70}
          />
        )}
      </View>
      <View style={styles.mediaText}>
        <Text style={styles.mediaTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.mediaSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {secondaryAction ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={secondaryAction.onPress}
          hitSlop={6}
          style={styles.mediaAction}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
        >
          <MaterialIcons
            name={secondaryAction.icon}
            size={moderateWidthScale(22)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      ) : null}
      {onAction ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          hitSlop={6}
          style={styles.mediaAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? t("remove")}
        >
          <MaterialIcons
            name={actionIcon}
            size={moderateWidthScale(22)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Highlighted note: info (green), warm (amber, e.g. "You can leave this screen"), error. */
export function InfoNote({
  icon = "info-outline",
  title,
  text,
  tone = "info",
  style,
}: {
  icon?: IconName;
  title?: string | null;
  text: string;
  tone?: "info" | "warm" | "error";
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useFlowStyles();
  return (
    <View
      style={[
        styles.note,
        tone === "warm"
          ? styles.noteWarm
          : tone === "error"
            ? styles.noteError
            : styles.noteInfo,
        style,
      ]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
    >
      <MaterialIcons
        name={icon}
        size={moderateWidthScale(24)}
        color={
          tone === "error"
            ? theme.red
            : tone === "warm"
              ? theme.selectCard
              : theme.buttonBack
        }
      />
      <View style={styles.noteText}>
        {title ? <Text style={styles.noteTitle}>{title}</Text> : null}
        <Text style={styles.noteBody}>{text}</Text>
      </View>
    </View>
  );
}
