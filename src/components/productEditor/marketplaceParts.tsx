import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import CustomToggle from "@/src/components/customToggle";
import type { ShopProductModeration } from "@/src/types/shopProduct";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type IconName = keyof typeof MaterialIcons.glyphMap;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    switchCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(72),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    switchCardOn: { borderColor: theme.darkGreen },
    switchCardDisabled: { opacity: 0.55 },
    switchIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(14),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    switchIconOn: { backgroundColor: theme.darkGreen },
    switchText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    switchTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    switchSub: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    banner: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
    },
    bannerFlagged: {
      borderColor: theme.upcomingBorder,
      backgroundColor: theme.upcomingCard,
    },
    bannerRemoved: {
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.lightRed,
    },
    bannerText: { flex: 1, minWidth: 0, gap: moderateHeightScale(4) },
    bannerTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    bannerBody: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    bannerNote: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
      fontStyle: "italic",
    },
  });

function useStyles() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

/** Big on/off card: the whole card toggles; dimmed and inert when disabled. */
export function SwitchCard({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string | null;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { theme, styles } = useStyles();
  const on = value && !disabled;
  return (
    <TouchableOpacity
      style={[
        styles.switchCard,
        on && styles.switchCardOn,
        disabled && styles.switchCardDisabled,
      ]}
      activeOpacity={0.85}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle ?? undefined}
      accessibilityState={{ checked: on, disabled }}
    >
      <View style={[styles.switchIcon, on && styles.switchIconOn]}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(22)}
          color={on ? theme.white : theme.darkGreen}
        />
      </View>
      <View style={styles.switchText}>
        <Text style={styles.switchTitle}>{title}</Text>
        {subtitle ? <Text style={styles.switchSub}>{subtitle}</Text> : null}
      </View>
      <CustomToggle value={on} onValueChange={onValueChange} disabled={disabled} />
    </TouchableOpacity>
  );
}

/** Flagged / removed by FreshPass admin, with the admin's note. Nothing for "active". */
export function ModerationBanner({
  moderation,
}: {
  moderation?: ShopProductModeration | null;
}) {
  const { t } = useTranslation();
  const { theme, styles } = useStyles();
  if (!moderation || moderation.status === "active") return null;
  const removed = moderation.status === "removed";
  return (
    <View
      style={[styles.banner, removed ? styles.bannerRemoved : styles.bannerFlagged]}
      accessibilityRole="alert"
    >
      <MaterialIcons
        name={removed ? "remove-shopping-cart" : "flag"}
        size={moderateWidthScale(24)}
        color={removed ? theme.red : theme.selectCard}
      />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>
          {removed ? t("mpPfModerationRemovedTitle") : t("mpPfModerationFlaggedTitle")}
        </Text>
        <Text style={styles.bannerBody}>
          {removed ? t("mpPfModerationRemovedBody") : t("mpPfModerationFlaggedBody")}
        </Text>
        {moderation.note ? (
          <Text style={styles.bannerNote}>
            {t("mpPfModerationNote", { note: moderation.note })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
