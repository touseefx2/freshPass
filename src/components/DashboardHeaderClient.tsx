import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useTheme, } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGES } from "@/src/constant/images";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen
    },
    logoImage: {
      width: widthScale(156),
      height: heightScale(36),
      resizeMode: "contain",
    },
  });

export default function DashboardHeaderClient() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + moderateHeightScale(8), },
      ]}
    >
      <Image
        source={IMAGES.logo3d}
        style={styles.logoImage}
      />
    </View>
  );
}
