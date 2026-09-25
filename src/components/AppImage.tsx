import React, { useState, useEffect, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image, ImageStyle, ImageContentFit, ImageProps } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { isLegacyAiMediaUrl } from "@/src/utils/media";

type AppImageProps = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Maps to expo-image contentFit for backward compat with RN Image */
  resizeMode?: "cover" | "contain" | "stretch" | "center" | "repeat";
  /** Custom fallback rendered instead of the default icon placeholder */
  fallback?: React.ReactNode;
  /** Size of the default placeholder icon (defaults to 28 scaled) */
  iconSize?: number;
  /** Additional props forwarded to expo-image */
  transition?: number;
  recyclingKey?: string;
  /** Container style applied to the wrapper View (used for placeholder layout) */
  containerStyle?: StyleProp<ViewStyle>;
} & Omit<
  ImageProps,
  | "source"
  | "style"
  | "contentFit"
  | "onError"
  | "transition"
  | "recyclingKey"
>;

const RESIZE_MODE_MAP: Record<string, ImageContentFit> = {
  cover: "cover",
  contain: "contain",
  stretch: "fill",
  center: "none",
  repeat: "none",
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
  });

export default function AppImage({
  uri,
  style,
  contentFit,
  resizeMode,
  fallback,
  iconSize,
  transition = 200,
  recyclingKey,
  containerStyle,
  ...rest
}: AppImageProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [hasError, setHasError] = useState(false);

  const trimmed = uri?.trim() ?? "";
  const isInvalid = !trimmed || isLegacyAiMediaUrl(trimmed);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const resolvedContentFit: ImageContentFit =
    contentFit ?? RESIZE_MODE_MAP[resizeMode ?? ""] ?? "cover";

  const size = iconSize ?? moderateWidthScale(28);

  if (isInvalid || hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <View style={[style as any, styles.placeholder, containerStyle]}>
        <Feather name="image" size={size} color={theme.lightGreen4} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: trimmed }}
      style={style}
      contentFit={resolvedContentFit}
      transition={transition}
      recyclingKey={recyclingKey ?? trimmed}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
}
