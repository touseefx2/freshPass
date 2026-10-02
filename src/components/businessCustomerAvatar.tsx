import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { resolveBusinessCustomerAvatarUrl } from "@/src/utils/businessCustomerDisplay";
import { getDefaultAvatarImage } from "@/src/services/remoteConfigService";
import AppImage from "@/src/components/AppImage";

type BusinessCustomerAvatarProps = {
  name?: string | null;
  profileImageUrl?: string | null;
  size: number;
  style?: ViewStyle;
  textSize?: number;
};

export default function BusinessCustomerAvatar({
  profileImageUrl,
  size,
  style,
}: BusinessCustomerAvatarProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const avatarUri = useMemo(
    () => resolveBusinessCustomerAvatarUrl(profileImageUrl),
    [profileImageUrl],
  );

  const defaultAvatarUri = useMemo(() => getDefaultAvatarImage(), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        image: {
          width: "100%",
          height: "100%",
        },
      }),
    [theme, size],
  );

  const defaultFallback = (
    <View style={[styles.container, style]}>
      <AppImage
        uri={defaultAvatarUri}
        style={styles.image}
      />
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <AppImage
        uri={avatarUri}
        style={styles.image}
        fallback={defaultFallback}
      />
    </View>
  );
}
