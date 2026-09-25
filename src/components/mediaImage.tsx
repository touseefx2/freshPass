import React, { useMemo } from "react";
import { ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";

type MediaImageProps = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center" | "repeat";
  iconSize?: number;
  /** Prefer MaterialIcons photo-library for memory grids; Feather image for results. */
  placeholderIcon?: "photo-library" | "videocam" | "image";
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen2,
    },
  });

export default function MediaImage({
  uri,
  style,
  containerStyle,
  resizeMode = "cover",
  iconSize,
  placeholderIcon = "image",
}: MediaImageProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const size = iconSize ?? moderateWidthScale(28);

  const materialFallback =
    placeholderIcon === "photo-library" || placeholderIcon === "videocam" ? (
      <View style={[style as any, styles.placeholder, containerStyle]}>
        <MaterialIcons
          name={placeholderIcon}
          size={size}
          color={(colors as Theme).lightGreen4}
        />
      </View>
    ) : undefined;

  return (
    <AppImage
      uri={uri}
      style={style}
      resizeMode={resizeMode}
      iconSize={iconSize}
      containerStyle={containerStyle}
      fallback={materialFallback}
    />
  );
}
