import React, { useMemo, useState } from "react";
import { StyleSheet, View, Text, Pressable, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";

interface PrivacyBannerProps {
  message: string;
  onDismiss?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      // borderRadius: moderateWidthScale(8),
      // overflow: "hidden",
      // marginTop: moderateHeightScale(16),
      position:"absolute",
      top:-moderateHeightScale(72),
      alignSelf:"center"

    },
    blurContainer: {
      backgroundColor: "rgba(221, 161, 94, 0.5)",
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width:"95%",
      alignSelf:"center",
    },
    message: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(8),
    },
    closeButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function PrivacyBanner({
  message,
  onDismiss,
}: PrivacyBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const content = (
    <>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={handleDismiss}
        style={styles.closeButton}
        hitSlop={moderateWidthScale(8)}
      >
        <MaterialIcons
          name="close"
          size={moderateWidthScale(18)}
          color={(colors as Theme).darkGreen}
        />
      </Pressable>
    </>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={8} style={styles.blurContainer}>
          {content}
        </BlurView>
      ) : (
        <View style={styles.blurContainer}>{content}</View>
      )}
    </View>
  );
}
