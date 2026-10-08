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
    // ── Source cards ("Choose from gallery" / "Record a video"): two filled
    // brand tiles side by side — icon + action chip on top, label at the
    // bottom, a faint oversized icon as texture.
    sourceRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    sourceShadow: {
      flex: 1,
      minWidth: 0,
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.darkGreen,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.22,
      shadowRadius: moderateWidthScale(14),
      elevation: 6,
    },
    sourceShadowWarm: {
      backgroundColor: theme.orangeBrownText,
      shadowColor: theme.orangeBrownText,
    },
    sourceCard: {
      flexGrow: 1,
      borderRadius: moderateWidthScale(22),
      overflow: "hidden",
      justifyContent: "space-between",
      gap: moderateHeightScale(18),
      padding: moderateWidthScale(14),
      minHeight: heightScale(168),
    },
    sourceWatermark: {
      position: "absolute",
      right: -widthScale(18),
      bottom: -widthScale(20),
      opacity: 0.1,
      transform: [{ rotate: "-12deg" }],
    },
    sourceTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    sourceIcon: {
      width: widthScale(48),
      height: widthScale(48),
      borderRadius: widthScale(16),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceAction: {
      width: widthScale(30),
      height: widthScale(30),
      borderRadius: widthScale(15),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceText: {
      gap: moderateHeightScale(4),
    },
    sourceLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: fontSize.size22,
    },
    sourceMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    sourceMetaText: {
      flexShrink: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.white85,
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

/** Lays SourceCards out side by side at equal width and height. */
export function SourceCardRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useFlowStyles();
  return <View style={[styles.sourceRow, style]}>{children}</View>;
}

/**
 * Filled tappable tile — "Choose from gallery", "Record a video".
 * Fills its share of a SourceCardRow.
 */
export function SourceCard({
  icon,
  label,
  sublabel,
  sublabelIcon,
  badgeIcon,
  tone = "green",
  onPress,
  disabled = false,
  loading = false,
  style,
}: {
  icon: IconName;
  label: string;
  sublabel?: string | null;
  /** Small icon before the sub-label. */
  sublabelIcon?: IconName;
  /** Round white chip top-right ("+" for gallery, REC dot for camera). */
  badgeIcon?: IconName;
  /** Tile colour: olive green, or warm burnt orange. */
  tone?: "green" | "warm";
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, styles } = useFlowStyles();
  const inactive = disabled || loading;
  const warm = tone === "warm";
  const fill = warm
    ? ([theme.selectCard, theme.orangeBrownText] as const)
    : ([theme.buttonBack, theme.darkGreen] as const);
  // Gentle press-down (skipped with Reduce Motion) + a light haptic tap
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sourceShadow,
        warm && styles.sourceShadowWarm,
        pressStyle,
        disabled && styles.disabled,
        style,
      ]}
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
          colors={fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(108)}
          color={theme.white}
          style={styles.sourceWatermark}
          pointerEvents="none"
        />

        <View style={styles.sourceTop}>
          <View style={styles.sourceIcon}>
            {loading ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <MaterialIcons
                name={icon}
                size={moderateWidthScale(26)}
                color={theme.white}
              />
            )}
          </View>
          {badgeIcon ? (
            <View style={styles.sourceAction} pointerEvents="none">
              <MaterialIcons
                name={badgeIcon}
                size={moderateWidthScale(warm ? 14 : 18)}
                color={warm ? theme.selectCard : theme.darkGreen}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.sourceText}>
          <Text style={styles.sourceLabel} numberOfLines={2}>
            {label}
          </Text>
          {sublabel ? (
            <View style={styles.sourceMeta}>
              {sublabelIcon ? (
                <MaterialIcons
                  name={sublabelIcon}
                  size={moderateWidthScale(14)}
                  color={theme.white85}
                />
              ) : null}
              <Text style={styles.sourceMetaText} numberOfLines={2}>
                {sublabel}
              </Text>
            </View>
          ) : null}
        </View>
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
