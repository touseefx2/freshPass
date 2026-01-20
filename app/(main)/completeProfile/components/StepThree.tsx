import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { setAppointmentVolume } from "@/src/state/slices/completeProfileSlice";

interface AppointmentOption {
  id: string;
  title: string;
  description: string;
}

const APPOINTMENT_OPTIONS: AppointmentOption[] = [
  {
    id: "just_starting",
    title: "Just starting",
    description: "I’m building my client base",
  },
  {
    id: "one_to_nine",
    title: "1 - 9 appointments",
    description: "Steady flow of clients",
  },
  {
    id: "ten_to_nineteen",
    title: "10 - 19 appointments",
    description: "Busy and growing",
  },
  {
    id: "twenty_plus",
    title: "20+ appointments",
    description: "High-volume business",
  },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: 5,
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
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(6),
    },
    optionSelected: {
      // backgroundColor: theme.lightBeige,s
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

export default function StepThree() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { appointmentVolume } = useAppSelector(
    (state) => state.completeProfile
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>
          How many appointments do you typically have per week?
        </Text>
        <Text style={styles.subtitle}>
          This helps us tailor the app to your business volume.
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {APPOINTMENT_OPTIONS.map((option, index) => {
          const isSelected = appointmentVolume?.id === option.id;
          const showDivider = index < APPOINTMENT_OPTIONS.length - 1;
          return (
            <React.Fragment key={option.id}>
              <TouchableOpacity
                style={[styles.optionCard, isSelected && styles.optionSelected]}
                onPress={() =>
                  dispatch(
                    setAppointmentVolume({ id: option.id, title: option.title })
                  )
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
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
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
