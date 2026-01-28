import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { Text } from "react-native";

interface TryOnBanner {
  onPress: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.darkGreenLight,
      flexDirection:"row",
      alignItems:"center",
      justifyContent:"space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(5),
      borderTopLeftRadius:12,
      borderTopRightRadius:12,
    },
    title: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    description: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
  });

export default function TryOnBanner({ onPress }: TryOnBanner) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return  (
  <View style={styles.container}>
<View>
  <Text style={styles.title}>Try AI Hair Try-On</Text>
  <Text style={styles.description}>Preview styles instantly. Book with confidence. </Text>
</View>
  </View>
  )
}
