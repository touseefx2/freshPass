import React, { useMemo, useCallback } from "react";
import { View, Text, StatusBar, StyleSheet, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";
import Button from "@/src/components/button";
import RegisterHeader from "@/src/components/registerHeader";
import { useRouter, useFocusEffect } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";

type StepStatus = "completed" | "active" | "pending";

interface StepItem {
  id: number;
  label: string;
  status: StepStatus;
}

const steps: StepItem[] = [
  { id: 1, label: "Your business account", status: "completed" },
  { id: 2, label: "Your business profile", status: "active" },
  { id: 3, label: "Select business category", status: "pending" },
  { id: 4, label: "About your business", status: "pending" },
  { id: 5, label: "Appointments per week", status: "pending" },
  { id: 6, label: "Business location", status: "pending" },
  { id: 7, label: "People in your team", status: "pending" },
  { id: 8, label: "Add staff members", status: "pending" },
  { id: 9, label: "Business hours", status: "pending" },
  { id: 10, label: "Add your services", status: "pending" },
  { id: 11, label: "Create subscription plans", status: "pending" },
  { id: 12, label: "Add social media (if any)", status: "pending" },
  { id: 13, label: "Add business photos", status: "pending" },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(24),
      paddingBottom: moderateHeightScale(30),
      gap: moderateHeightScale(24),
    },
    content: {
      flexGrow: 1,
      gap: moderateHeightScale(20),
    },
    introSection: {
      gap: moderateHeightScale(16),
    },
    logoWrapper: {
      width: moderateWidthScale(52),
      height: moderateHeightScale(52),
    },
    welcomeTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size32,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size18,
    },
    stepsCard: {},
    stepsContainer: {
      position: "relative",
      paddingLeft: moderateWidthScale(6),
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
    },
    indicatorColumn: {
      alignItems: "center",
      width: moderateWidthScale(32),
    },
    lineCont: {
      alignItems: "center",
      justifyContent: "center",
    },
    timelineLine: {
      position: "absolute",
      width: moderateWidthScale(4),
      height: "100%",
      backgroundColor: theme.lightGreen2,
      top: 25,
      zIndex: 1,
    },
    indicatorActive: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.green,
      zIndex: 2,
    },
    indicatorPending: {
      width: moderateWidthScale(8),
      height: moderateWidthScale(8),
      borderRadius: moderateWidthScale(4),
      backgroundColor: theme.lightGreen2,
      marginTop: moderateHeightScale(6),
    },
    indicatorNumber: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    stepTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stepTextCompleted: {
      color: theme.darkGreen,
    },
    stepTextPending: {
      color: theme.lightGreen,
    },
    optionalStep: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen2,
      fontStyle: "italic",
    },
  });

export default function RegisterNextSteps() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const router = useRouter();

  const handleBack = useCallback(() => {
    // Prevent back navigation - do nothing
  }, []);

  const handleLetsGo = useCallback(() => {
    router.push(`/${MAIN_ROUTES.COMPLETE_PROFILE}`);
  }, [router]);

  // Prevent hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent back navigation
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={"dark-content"} />

      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.introSection}>
            <View style={styles.logoWrapper}>
              <LeafLogo
                width={moderateWidthScale(48)}
                height={moderateHeightScale(48)}
                color1={(colors as Theme).orangeBrown}
                color2={(colors as Theme).buttonBack}
              />
            </View>
            <Text style={styles.welcomeTitle}>
              Welcome! Let's set up your profile.
            </Text>
            <Text style={styles.subtitle}>
              Personalize your experience to get the most out of FreshPass. It
              only takes few minutes.
            </Text>
          </View>

          <View style={styles.stepsCard}>
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => {
                const isCompleted = step.status === "completed";
                const isActive = step.status === "active";
                const isOptional = step.label
                  .toLowerCase()
                  .includes("(if any)");
                const stepStatusStyle = isCompleted
                  ? styles.stepTextCompleted
                  : isActive
                  ? styles.stepTextActive
                  : styles.stepTextPending;

                return (
                  <View
                    key={step.id}
                    style={[styles.stepRow, index == 1 && { marginTop: 6 }]}
                  >
                    <View style={styles.indicatorColumn}>
                      {isCompleted && (
                        <View style={styles.lineCont}>
                          <View style={styles.indicatorActive}>
                            <FontAwesome6
                              name="check"
                              size={moderateWidthScale(16)}
                              color={(colors as Theme).darkGreen}
                            />
                          </View>
                          <View style={styles.timelineLine} />
                        </View>
                      )}
                      {isActive && (
                        <View style={styles.indicatorActive}>
                          <Text style={styles.indicatorNumber}>{step.id}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.stepText, stepStatusStyle]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
        <Button title="Lets go" onPress={handleLetsGo} />
      </View>
    </SafeAreaView>
  );
}
