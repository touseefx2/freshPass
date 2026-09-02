import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  widthScale,
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";

type EmptyStateProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onActionPress?: () => void;
  containerStyle?: ViewStyle;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      paddingVertical: moderateHeightScale(48),
    },
    iconWrap: {
      width: widthScale(112),
      height: widthScale(112),
      borderRadius: moderateWidthScale(56),
      backgroundColor: theme.apptMintBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(24),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
    },
    iconInner: {
      width: widthScale(72),
      height: widthScale(72),
      borderRadius: moderateWidthScale(36),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(10),
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(28),
      maxWidth: widthScale(280),
    },
    actionButton: {
      minWidth: widthScale(200),
      paddingHorizontal: moderateWidthScale(24),
    },
  });

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionTitle,
  onActionPress,
  containerStyle,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.iconWrap}>
        <View style={styles.iconInner}>
          <MaterialIcons
            name={icon}
            size={moderateWidthScale(34)}
            color={theme.buttonBack}
          />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionTitle && onActionPress ? (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          containerStyle={styles.actionButton}
        />
      ) : null}
    </View>
  );
}
