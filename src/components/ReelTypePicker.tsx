import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";

export type ReelType = "template" | "auto";

type Props = {
  visible: boolean;
  onSelect: (type: ReelType) => void;
};

const OPTIONS: {
  type: ReelType;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  titleKey: string;
  descKey: string;
}[] = [
  {
    type: "template",
    icon: "dashboard-customize",
    titleKey: "reelTypeTemplateTitle",
    descKey: "reelTypeTemplateDesc",
  },
  {
    type: "auto",
    icon: "movie-filter",
    titleKey: "reelTypeAutoTitle",
    descKey: "reelTypeAutoDesc",
  },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      width: "100%",
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(8),
      gap: moderateHeightScale(10),
    },
    heading: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    cardShadow: {
      flex: 1,
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.background,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.14,
      shadowRadius: moderateWidthScale(10),
      elevation: 5,
    },
    card: {
      flex: 1,
      minHeight: moderateHeightScale(150),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(8),
      overflow: "hidden",
    },
    iconCircle: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: moderateHeightScale(2),
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    desc: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
    },
    ctaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
  });

/**
 * Opens under "Generate Reel": choose a Shotstack template reel or an AI auto reel.
 * Cards slide in one after the other; motion follows the system reduce-motion setting.
 */
export default function ReelTypePicker({ visible, onSelect }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Animated.View
      style={styles.wrap}
      entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(150).reduceMotion(ReduceMotion.System)}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {t("reelTypeHeading")}
      </Text>
      <View style={styles.row}>
        {OPTIONS.map((option, index) => (
          <Animated.View
            key={option.type}
            style={styles.cardShadow}
            entering={FadeInDown.delay(60 + index * 70)
              .springify()
              .damping(16)
              .reduceMotion(ReduceMotion.System)}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelect(option.type)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t(option.titleKey)}
              accessibilityHint={t(option.descKey)}
            >
              <View style={styles.iconCircle}>
                <LinearGradient
                  colors={[theme.darkGreenLight, theme.buttonBack, theme.darkGreen]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <MaterialIcons
                  name={option.icon}
                  size={moderateWidthScale(22)}
                  color={theme.white}
                />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {t(option.titleKey)}
              </Text>
              <Text style={styles.desc} numberOfLines={3}>
                {t(option.descKey)}
              </Text>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{t("reelTypeStart")}</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={moderateWidthScale(14)}
                  color={theme.buttonBack}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
