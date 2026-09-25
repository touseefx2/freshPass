import React, { useMemo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  getBusinessCustomerInitials,
  resolveBusinessCustomerAvatarUrl,
} from "@/src/utils/businessCustomerDisplay";
import AppImage from "@/src/components/AppImage";

type BusinessCustomerAvatarProps = {
  name?: string | null;
  profileImageUrl?: string | null;
  size: number;
  style?: ViewStyle;
  textSize?: number;
};

export default function BusinessCustomerAvatar({
  name,
  profileImageUrl,
  size,
  style,
  textSize,
}: BusinessCustomerAvatarProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const avatarUri = useMemo(
    () => resolveBusinessCustomerAvatarUrl(profileImageUrl),
    [profileImageUrl],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.lightGreen1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.borderLight,
        },
        image: {
          width: "100%",
          height: "100%",
        },
        text: {
          fontSize: textSize ?? fontSize.size14,
          fontFamily: fonts.fontBold,
          color: theme.darkGreen,
        },
      }),
    [theme, size, textSize],
  );

  const initialsFallback = (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{getBusinessCustomerInitials(name)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <AppImage
        uri={avatarUri}
        style={styles.image}
        fallback={initialsFallback}
      />
    </View>
  );
}
