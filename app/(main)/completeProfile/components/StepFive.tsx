import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { setTeamSize } from "@/src/state/slices/completeProfileSlice";

interface TeamSizeOption {
  id: string;
  // English title is sent to the backend (team_member_range); keys are for display
  title: string;
  titleKey: string;
  descriptionKey: string;
}

const TEAM_SIZE_OPTIONS: TeamSizeOption[] = [
  {
    id: "just_me",
    title: "Just me",
    titleKey: "teamSizeJustMe",
    descriptionKey: "teamSizeJustMeDesc",
  },
  {
    id: "2_to_5",
    title: "2 - 5 team members",
    titleKey: "teamSize2to5",
    descriptionKey: "teamSize2to5Desc",
  },
  {
    id: "6_to_10",
    title: "6 - 10 team members",
    titleKey: "teamSize6to10",
    descriptionKey: "teamSize6to10Desc",
  },
  {
    id: "10_plus",
    title: "10+ team members",
    titleKey: "teamSize10Plus",
    descriptionKey: "teamSize10PlusDesc",
  },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
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
    },
    optionsContainer: {
      gap: moderateHeightScale(4),
    },
    optionCard: {
      paddingVertical: moderateHeightScale(12),
    },
    optionContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    radioOuter: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(20 / 2),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOuterSelected: {
      borderColor: theme.black,
    },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(10 / 2),
      backgroundColor: theme.orangeBrown,
    },
    optionTextWrapper: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    optionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    optionDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    divider: {
      height: 1.2,
      backgroundColor: theme.borderLight,
    },
  });

export default function StepFive() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { teamSize } = useAppSelector((state) => state.completeProfile);

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("teamSizeStepTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("teamSizeStepSubtitle")}
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {TEAM_SIZE_OPTIONS.map((option, index) => {
          const isSelected = teamSize?.id === option.id;
          const showDivider = index < TEAM_SIZE_OPTIONS.length - 1;
          return (
            <React.Fragment key={option.id}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() =>
                  dispatch(setTeamSize({ id: option.id, title: option.title }))
                }
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.optionTextWrapper}>
                    <Text style={styles.optionTitle}>{t(option.titleKey)}</Text>
                    <Text style={styles.optionDescription}>
                      {t(option.descriptionKey)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              {showDivider && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
