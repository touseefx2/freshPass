import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";

interface StaffProfileHeaderProps {
  currentStep: number;
  onBack: () => void;
  disableBack?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
    },
    backButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(26),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    centerContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    logoContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    logoText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginLeft: moderateWidthScale(5),
    },
    titleText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    spacer: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
    },
  });

export default function StaffProfileHeader({
  currentStep,
  onBack,
  disableBack = false,
}: StaffProfileHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  // Step 1: Only logo centered, no back button
  if (currentStep === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
        <View style={styles.logoContainer}>
            <LeafLogo
              width={widthScale(18)}
              height={heightScale(24)}
              color1={theme.darkGreen}
              color2={theme.darkGreen}
            />
            <Text style={styles.logoText}>FRESHPASS</Text>
          </View>
        </View>
      </View>
    );
  }

  // Step 2: Back button + "Set availability" text
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {disableBack ? (
          <View style={styles.spacer} />
        ) : (
          <Pressable
            onPress={onBack}
            hitSlop={moderateWidthScale(8)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </Pressable>
        )}

        <View style={styles.centerContent}>
          <Text style={styles.titleText}>Set availability</Text>
        </View>

        <View style={styles.spacer} />
      </View>
    </View>
  );
}

