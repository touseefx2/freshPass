import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useTranslation } from "react-i18next";
import OnboardingLockedGuide from "./OnboardingLockedGuide";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size20,
    },
  });

export default function StepNine() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const steps = useMemo(
    () => [
      {
        title: t("subscriptionPlansStepCompleteOnboardingTitle"),
        description: t("subscriptionPlansStepCompleteOnboarding"),
      },
      {
        title: t("subscriptionPlansStepConnectStripeTitle"),
        description: t("subscriptionPlansStepConnectStripe"),
      },
      {
        title: t("subscriptionPlansStepCreateInSettingsTitle"),
        description: t("subscriptionPlansStepCreateInSettings"),
      },
    ],
    [t],
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("createSubscriptionPlans")}</Text>
        <Text style={styles.subtitle}>
          {t("subscriptionPlansOnboardingSubtitle")}
        </Text>
      </View>

      <OnboardingLockedGuide
        lockedTitle={t("subscriptionPlansOnboardingLockedTitle")}
        lockedMessage={t("subscriptionPlansOnboardingLockedMessage")}
        nextTitle={t("subscriptionPlansOnboardingNextTitle")}
        steps={steps}
        hint={t("subscriptionPlansContinueHint")}
      />
    </View>
  );
}
