import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

export type OnboardingLockedStep = {
  title: string;
  description: string;
};

type OnboardingLockedGuideProps = {
  lockedTitle: string;
  lockedMessage: string;
  nextTitle: string;
  steps: OnboardingLockedStep[];
  hint?: string;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: moderateHeightScale(24),
    },
    statusBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(14),
      backgroundColor: theme.upcomingCard,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.upcomingBorder,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
    },
    statusIconWrap: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    statusTextWrap: {
      flex: 1,
      gap: moderateHeightScale(4),
      paddingTop: moderateHeightScale(2),
    },
    statusTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    statusMessage: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    nextSection: {
      gap: moderateHeightScale(14),
    },
    nextTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    stepsList: {
      gap: 0,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(14),
    },
    stepRail: {
      width: moderateWidthScale(28),
      alignItems: "center",
    },
    stepNumber: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    stepNumberText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    stepConnector: {
      width: moderateWidthScale(2),
      flex: 1,
      minHeight: moderateHeightScale(20),
      backgroundColor: theme.orangeBrown30,
      marginVertical: moderateHeightScale(4),
    },
    stepContent: {
      flex: 1,
      gap: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(18),
    },
    stepContentLast: {
      paddingBottom: 0,
    },
    stepTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    stepDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
    hint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
  });

export default function OnboardingLockedGuide({
  lockedTitle,
  lockedMessage,
  nextTitle,
  steps,
  hint,
}: OnboardingLockedGuideProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  return (
    <View style={styles.root}>
      <View style={styles.statusBanner}>
        <View style={styles.statusIconWrap}>
          <Feather
            name="lock"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
        </View>
        <View style={styles.statusTextWrap}>
          <Text style={styles.statusTitle}>{lockedTitle}</Text>
          <Text style={styles.statusMessage}>{lockedMessage}</Text>
        </View>
      </View>

      <View style={styles.nextSection}>
        <Text style={styles.nextTitle}>{nextTitle}</Text>
        <View style={styles.stepsList}>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <View key={`${step.title}-${index}`} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  {!isLast ? <View style={styles.stepConnector} /> : null}
                </View>
                <View
                  style={[
                    styles.stepContent,
                    isLast ? styles.stepContentLast : null,
                  ]}
                >
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
