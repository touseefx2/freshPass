import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
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

type IconName = keyof typeof MaterialIcons.glyphMap;

export type Requirement = { icon: IconName; text: string };

type Props = {
  imageUrl?: string | null;
  description?: string | null;
  requirements: Requirement[];
  /** Extra tip under the list (e.g. what to film for a haircut reel). */
  tip?: string | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.08,
      shadowRadius: moderateWidthScale(10),
      elevation: 2,
    },
    image: {
      width: "100%",
      height: heightScale(170),
      backgroundColor: theme.lightGreen07,
    },
    body: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(14),
    },
    description: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    headerIcon: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    list: {
      gap: moderateHeightScale(12),
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    itemIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    itemText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
    tip: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.upcomingCard,
    },
    tipText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size21,
    },
  });

/** "What's required" for the chosen template — shown right after picking it. */
export default function RequirementsCard({
  imageUrl,
  description,
  requirements,
  tip,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.body}>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        <View style={styles.header} accessibilityRole="header">
          <View style={styles.headerIcon}>
            <MaterialIcons
              name="checklist"
              size={moderateWidthScale(20)}
              color={theme.buttonBack}
            />
          </View>
          <Text style={styles.headerText}>{t("templateRequirements")}</Text>
        </View>
        <View style={styles.list}>
          {requirements.map((req) => (
            <View key={`${req.icon}-${req.text}`} style={styles.item}>
              <View style={styles.itemIcon}>
                <MaterialIcons
                  name={req.icon}
                  size={moderateWidthScale(22)}
                  color={theme.selectCard}
                />
              </View>
              <Text style={styles.itemText}>{req.text}</Text>
            </View>
          ))}
        </View>
        {tip ? (
          <View style={styles.tip}>
            <MaterialIcons
              name="lightbulb-outline"
              size={moderateWidthScale(22)}
              color={theme.selectCard}
            />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
