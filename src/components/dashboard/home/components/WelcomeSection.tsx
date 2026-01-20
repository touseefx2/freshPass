import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
    },
    welcomeText: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    descriptionText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

export default function WelcomeSection() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const userName = useAppSelector((state) => state.user.name) || "";

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} style={styles.welcomeText}>Welcome, {userName}</Text>
      {/* <Text style={styles.descriptionText}>
        Browse nearby barbers, nail salons, and spas. Book instantly or unlock
        savings with a membership.
      </Text> */}
    </View>
  );
}

