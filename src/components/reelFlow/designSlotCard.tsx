import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

/**
 * One photo / video slot of a design template: what goes there (label +
 * the API's hint), what fills it now (AI pick / own file / nothing) and the
 * actions for it. Used by the photo-design step and the review screen.
 */

type IconName = keyof typeof MaterialIcons.glyphMap;

export type SlotBadgeTone = "ai" | "own" | "missing";

export type SlotAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  /** Shown in the empty thumb */
  icon: IconName;
  label: string;
  /** What goes here — long API text, folded to 3 lines with More / Less */
  detail?: string | null;
  /** Short facts always shown in full (min length, when it shows) */
  meta?: string | null;
  thumbUri?: string | null;
  /** Thumb is still being made */
  thumbLoading?: boolean;
  /** Video thumb → small play mark */
  isVideo?: boolean;
  badge?: { label: string; tone: SlotBadgeTone } | null;
  error?: string | null;
  actions: SlotAction[];
  onThumbPress?: (() => void) | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(14),
      gap: moderateHeightScale(12),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    cardError: {
      borderColor: theme.red,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
    },
    thumb: {
      width: widthScale(76),
      height: widthScale(76),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen07,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    thumbImage: { ...StyleSheet.absoluteFillObject },
    playMark: {
      position: "absolute",
      right: moderateWidthScale(5),
      bottom: moderateWidthScale(5),
      width: widthScale(22),
      height: widthScale(22),
      borderRadius: widthScale(11),
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    text: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
    label: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    detail: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    meta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    more: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    badge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
    },
    badgeAi: { backgroundColor: theme.lightGreen07 },
    badgeOwn: { backgroundColor: theme.orangeBrown015 },
    badgeMissing: { backgroundColor: theme.lightRed },
    badgeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      lineHeight: fontSize.size19,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(20),
      borderWidth: 1.5,
      borderColor: theme.buttonBack,
    },
    actionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    disabled: { opacity: 0.45 },
  });

export default function DesignSlotCard({
  icon,
  label,
  detail,
  meta,
  thumbUri,
  thumbLoading = false,
  isVideo = false,
  badge,
  error,
  actions,
  onThumbPress,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  /** Only long texts get folded (about 3 lines in the card) */
  const foldable = (detail?.length ?? 0) > 110;

  const badgeStyle =
    badge?.tone === "missing"
      ? styles.badgeMissing
      : badge?.tone === "own"
        ? styles.badgeOwn
        : styles.badgeAi;
  const badgeColor =
    badge?.tone === "missing"
      ? theme.red
      : badge?.tone === "own"
        ? theme.orangeBrownText
        : theme.buttonBack;
  const badgeIcon: IconName =
    badge?.tone === "missing"
      ? "error-outline"
      : badge?.tone === "own"
        ? "person"
        : "auto-awesome";

  const thumb = (
    <View style={styles.thumb}>
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.thumbImage}
          contentFit="cover"
          transition={150}
        />
      ) : thumbLoading ? (
        <ActivityIndicator color={theme.darkGreen} />
      ) : (
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(28)}
          color={theme.lightGreen}
        />
      )}
      {thumbUri && isVideo ? (
        <View style={styles.playMark}>
          <MaterialIcons
            name="play-arrow"
            size={moderateWidthScale(16)}
            color={theme.white}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.card, error ? styles.cardError : null]}>
      <View style={styles.row}>
        {onThumbPress ? (
          <TouchableOpacity
            onPress={onThumbPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            {thumb}
          </TouchableOpacity>
        ) : (
          thumb
        )}
        <View style={styles.text}>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          {detail ? (
            <Text
              style={styles.detail}
              numberOfLines={foldable && !expanded ? 3 : undefined}
            >
              {detail}
            </Text>
          ) : null}
          {foldable ? (
            <Text
              style={styles.more}
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              suppressHighlighting
            >
              {expanded ? t("designShowLess") : t("designShowMore")}
            </Text>
          ) : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {badge ? (
            <View style={[styles.badge, badgeStyle]}>
              <MaterialIcons
                name={badgeIcon}
                size={moderateWidthScale(13)}
                color={badgeColor}
              />
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.action, action.disabled && styles.disabled]}
              onPress={action.onPress}
              disabled={action.disabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${action.label}: ${label}`}
            >
              <MaterialIcons
                name={action.icon}
                size={moderateWidthScale(17)}
                color={theme.darkGreen}
              />
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
