import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

interface CompleteProfileHeaderProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  disableBack?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(1),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    backButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(26),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    stepLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    spacer: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
    },
    progressTrack: {
      height: moderateHeightScale(2.5),
      backgroundColor: theme.darkGreen15,
      width: "100%",
      alignSelf: "center",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.orangeBrown,
    },
  });

export default function CompleteProfileHeader({
  currentStep,
  totalSteps,
  onBack,
  disableBack = false,
}: CompleteProfileHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const progressWidth = useMemo(
    () => widthScale(320) * (currentStep / totalSteps),
    [currentStep, totalSteps]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {disableBack ? (
          <View style={styles.spacer} />
        ) : (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.6}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={moderateWidthScale(22)}
              color={(colors as Theme).darkGreen}
            />
          </TouchableOpacity>
        )}

        <Text style={styles.stepLabel}>
          Step {currentStep} out of {totalSteps}
        </Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </View>
  );
}
