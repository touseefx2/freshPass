import React, { useMemo, useState } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { isLegacyAiMediaUrl } from "@/src/utils/media";

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
  const [imageError, setImageError] = useState(false);

  const trimmed = uri?.trim() ?? "";
  const showPlaceholder =
    !trimmed || isLegacyAiMediaUrl(trimmed) || imageError;

  const size = iconSize ?? moderateWidthScale(28);

  if (showPlaceholder) {
    return (
      <View style={[style, styles.placeholder, containerStyle]}>
        {placeholderIcon === "photo-library" ||
        placeholderIcon === "videocam" ? (
          <MaterialIcons
            name={placeholderIcon}
            size={size}
            color={colors.lightGreen4}
          />
        ) : (
          <Feather name="image" size={size} color={colors.lightGreen4} />
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: trimmed }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setImageError(true)}
    />
  );
}
