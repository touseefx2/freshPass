import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type StackHeaderProps = {
  title: string;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  showLine?: boolean;
  /** When true, uses darkGreen → darkGreenLight gradient instead of solid fill */
  useGradient?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      backgroundColor: theme.darkGreen,
    },
    headerContainerTransparent: {
      backgroundColor: "transparent",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backIconWrapper: {
      width: widthScale(28),
      alignItems: "flex-start",
    },
    rightIconWrapper: {
      minWidth: widthScale(28),
      alignItems: "flex-end",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
    },
    line: {
      width: "100%",
      height: 1.1,
      backgroundColor: theme.borderLight,
    },
  });

export default function StackHeader({
  title,
  onBack,
  rightIcon,
  onRightPress,
  showLine = true,
  useGradient = false,
}: StackHeaderProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const headerContent = (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleBack}
        style={styles.backIconWrapper}
      >
        <MaterialIcons
          name="keyboard-backspace"
          size={iconScale(24)}
          color={theme.white}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightIcon ? (
        onRightPress ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightPress}
            style={styles.rightIconWrapper}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        )
      ) : (
        <View style={styles.rightIconWrapper} />
      )}
    </View>
  );

  const containerStyle = [
    styles.headerContainer,
    useGradient && styles.headerContainerTransparent,
    { paddingTop: insets.top + moderateHeightScale(12) },
  ];

  return (
    <View>
      {useGradient ? (
        <LinearGradient
          colors={[theme.darkGreen, theme.darkGreenLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {headerContent}
        </LinearGradient>
      ) : (
        <View style={containerStyle}>{headerContent}</View>
      )}
      {showLine && <View style={styles.line} />}
    </View>
  );
}
