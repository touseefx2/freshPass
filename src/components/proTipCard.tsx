import React, { useMemo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: widthScale(280),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.background,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateWidthScale(6),
      elevation: 3,
    },
    imageContainer: {
      width: "100%",
      height: heightScale(160),
      backgroundColor: theme.emptyProfileImage,
    },
    image: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    content: {
      backgroundColor: theme.buttonBack,
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(10),
    },
    row: {
      marginBottom: moderateHeightScale(6),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      marginBottom: moderateHeightScale(2),
    },
    value: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white80,
    },
  });

export interface ProTipCardItem {
  image: string;
  title: string;
  action: string;
  benefit: string;
  standard: string;
}

interface ProTipCardProps {
  item: ProTipCardItem;
  actionLabel: string;
  benefitLabel: string;
  standardLabel: string;
}

export default function ProTipCard({
  item,
  actionLabel,
  benefitLabel,
  standardLabel,
}: ProTipCardProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{actionLabel}</Text>
          <Text style={styles.value}>{item.action}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{benefitLabel}</Text>
          <Text style={styles.value}>{item.benefit}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{standardLabel}</Text>
          <Text style={styles.value}>{item.standard}</Text>
        </View>
      </View>
    </View>
  );
}
