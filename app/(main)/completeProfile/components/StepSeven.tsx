import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setDayAvailability,
  setDayHours,
} from "@/src/state/slices/completeProfileSlice";
import BusinessHoursBottomSheet from "@/src/components/businessHoursBottomSheet";
import CustomToggle from "@/src/components/customToggle";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatTime = (hours: number, minutes: number): string => {
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
};

const formatTimeRange = (
  fromHours: number,
  fromMinutes: number,
  tillHours: number,
  tillMinutes: number
): string => {
  return `${formatTime(fromHours, fromMinutes)} - ${formatTime(
    tillHours,
    tillMinutes
  )}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
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
    daysContainer: {
      gap: moderateHeightScale(2),
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
    },
    dayLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      flex: 1,
    },
    dayName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    dayHours: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      // marginRight: moderateWidthScale(8),
    },
    dayHoursContainer: {
      flex: 1,
      alignItems: "flex-end",
      marginRight: moderateWidthScale(8),
      gap: moderateHeightScale(2),
    },
    dayHoursMultiple: {
      gap: moderateHeightScale(2),
      alignItems: "flex-end",
    },
    dayHoursLine: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    dayHorsBreak: {
      fontSize: fontSize.size9,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    divider: {
      height: 1.2,
      backgroundColor: theme.borderLight,
    },
    chevronIcon: {
      marginLeft: moderateWidthScale(8),
    },
  });

export default function StepSeven() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { businessHours } = useAppSelector((state) => state.completeProfile);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const hasInitializedWeekdays = useRef(false);

  // Initialize Monday, Tuesday, Wednesday, Thursday, Friday with default hours and break time when component first mounts
  useEffect(() => {
    if (hasInitializedWeekdays.current) {
      return; // Already initialized, don't run again
    }

    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    weekdays.forEach((day) => {
      const dayData = businessHours[day];

      // Check if day is not already configured (isOpen is false and hours are all zeros)
      const isDayNotConfigured =
        !dayData?.isOpen &&
        dayData?.fromHours === 0 &&
        dayData?.fromMinutes === 0 &&
        dayData?.tillHours === 0 &&
        dayData?.tillMinutes === 0 &&
        (!dayData?.breaks || dayData.breaks.length === 0);

      if (isDayNotConfigured) {
        // Set day with default hours (9 AM - 6 PM) and break time (1 PM - 2 PM)
        dispatch(
          setDayHours({
            day,
            fromHours: 9, // 9 AM
            fromMinutes: 0,
            tillHours: 18, // 6 PM
            tillMinutes: 0,
            breaks: [
              {
                fromHours: 13, // 1 PM
                fromMinutes: 0,
                tillHours: 14, // 2 PM
                tillMinutes: 0,
              },
            ],
          })
        );

        // Also set day as open
        dispatch(setDayAvailability({ day, isOpen: true }));
      }
    });

    hasInitializedWeekdays.current = true;
  }, [businessHours, dispatch]);

  const handleToggleDay = (day: string, value: boolean) => {
    const dayData = businessHours[day];
    dispatch(setDayAvailability({ day, isOpen: value }));

    // If turning day ON and no hours are set (all zeros), set default hours (9 AM - 6 PM)
    if (value && dayData) {
      const hasNoHours =
        dayData.fromHours === 0 &&
        dayData.fromMinutes === 0 &&
        dayData.tillHours === 0 &&
        dayData.tillMinutes === 0;

      if (hasNoHours) {
        dispatch(
          setDayHours({
            day,
            fromHours: 9, // 9 AM
            fromMinutes: 0,
            tillHours: 18, // 6 PM
            tillMinutes: 0,
            breaks: [],
          })
        );
      }
    }
  };

  const handleDayPress = (day: string) => {
    // Allow opening bottom sheet regardless of toggle status
    setSelectedDay(day);
    setBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetVisible(false);
    setSelectedDay(null);
  };

  const getDayDisplayText = (day: string): string | React.ReactNode => {
    const dayData = businessHours[day];

    // If day is closed, show "Closed"
    if (!dayData?.isOpen) {
      return "Closed";
    }

    // If day is open but no valid hours are set, show "---" to indicate hours need to be set
    if (!dayData.fromHours && !dayData.tillHours) {
      return "---";
    }

    const mainHours = formatTimeRange(
      dayData.fromHours,
      dayData.fromMinutes,
      dayData.tillHours,
      dayData.tillMinutes
    );

    if (dayData.breaks && dayData.breaks.length > 0) {
      return (
        <View style={styles.dayHoursMultiple}>
          <Text style={styles.dayHoursLine}>{mainHours}</Text>
          {dayData.breaks.map((breakTime, index) => (
            <Text key={index} style={styles.dayHorsBreak}>
              Break:{" "}
              {formatTimeRange(
                breakTime.fromHours,
                breakTime.fromMinutes,
                breakTime.tillHours,
                breakTime.tillMinutes
              )}
            </Text>
          ))}
        </View>
      );
    }

    return mainHours;
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Business hours</Text>
        <Text style={styles.subtitle}>When clients can book your services</Text>
      </View>

      <View style={styles.daysContainer}>
        {DAYS.map((day, index) => {
          const dayData = businessHours[day];
          const isOpen = dayData?.isOpen ?? false;
          const displayText = getDayDisplayText(day);
          // Allow clicking regardless of toggle status
          const canClick = true;

          return (
            <React.Fragment key={day}>
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => handleDayPress(day)}
                disabled={!canClick}
                activeOpacity={canClick ? 0.7 : 1}
              >
                <View style={styles.dayLeft}>
                  <CustomToggle
                    value={isOpen}
                    onValueChange={(value) => handleToggleDay(day, value)}
                  />
                  <Text style={styles.dayName}>{day}</Text>
                  <View style={styles.dayHoursContainer}>
                    {typeof displayText === "string" ? (
                      <Text style={styles.dayHours}>{displayText}</Text>
                    ) : (
                      <View style={styles.dayHoursMultiple}>{displayText}</View>
                    )}
                  </View>
                  <Feather
                    name="chevron-right"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                    style={styles.chevronIcon}
                  />
                </View>
              </TouchableOpacity>
               <View style={styles.divider} /> 
            </React.Fragment>
          );
        })}
      </View>

      <BusinessHoursBottomSheet
        visible={bottomSheetVisible}
        onClose={handleCloseBottomSheet}
        day={selectedDay || ""}
      />
    </View>
  );
}
