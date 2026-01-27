import React, { useMemo } from "react";
import { ImageBackground, StatusBar, StyleSheet, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { IMAGES } from "@/src/constant/images";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backgroundImage: {
      flex: 1,
    },
  });



export default function TryOnModal() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      <ImageBackground
        source={IMAGES.tryOnBack}
        style={styles.backgroundImage}
        resizeMode="cover"
      >

      </ImageBackground>
    </View>
  );
}
