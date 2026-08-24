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

export default function StepSeven() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  const steps = useMemo(
    () => [
      {
        title: t("staffOnboardingStep1Title"),
        description: t("staffOnboardingStep1Desc"),
      },
      {
        title: t("staffOnboardingStep2Title"),
        description: t("staffOnboardingStep2Desc"),
      },
      {
        title: t("staffOnboardingStep3Title"),
        description: t("staffOnboardingStep3Desc"),
      },
    ],
    [t],
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("addStaffMembers")}</Text>
        <Text style={styles.subtitle}>{t("inviteStaffSubtitle")}</Text>
      </View>

      <OnboardingLockedGuide
        lockedTitle={t("staffOnboardingLockedTitle")}
        lockedMessage={t("staffOnboardingLockedMessage")}
        nextTitle={t("staffOnboardingNextTitle")}
        steps={steps}
        hint={t("staffOnboardingContinueHint")}
      />
    </View>
  );
}
