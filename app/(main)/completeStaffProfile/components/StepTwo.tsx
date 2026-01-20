import React, { useMemo, useState, useEffect } from "react";
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

interface DayData {
  isOpen: boolean;
  fromHours: number;
  fromMinutes: number;
  tillHours: number;
  tillMinutes: number;
  breaks: Array<{
    fromHours: number;
    fromMinutes: number;
    tillHours: number;
    tillMinutes: number;
  }>;
}

interface BusinessHours {
  [key: string]: DayData;
}

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
    copyCheckboxContainer: {
      marginTop: moderateHeightScale(5),
      marginBottom: moderateHeightScale(20),
      gap: moderateHeightScale(15),
    },
    copyHoursSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    checkbox: {
      width: moderateWidthScale(18),
      height: moderateWidthScale(18),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1.5,
      borderColor: theme.black,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    checkboxLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    sectionDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function StepTwo() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { businessHours, salonBusinessHours, businessName } = useAppSelector(
    (state) => state.completeProfile
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [copySalonHours, setCopySalonHours] = useState(false);
  // Local copy of staff hours (what user sets when "Copy business hours"
  // checkbox is OFF). This lets us restore their custom schedule when
  // they uncheck the box after copying salon hours.
  const [staffBaseHours, setStaffBaseHours] = useState<BusinessHours | null>(
    null
  );

  // Copy salon business hours when checkbox is checked
  useEffect(() => {
    if (copySalonHours && salonBusinessHours) {
      // Copy all salon business hours to staff business hours
      Object.keys(salonBusinessHours).forEach((day) => {
        const salonDay = salonBusinessHours[day];
        dispatch(
          setDayHours({
            day,
            fromHours: salonDay.fromHours,
            fromMinutes: salonDay.fromMinutes,
            tillHours: salonDay.tillHours,
            tillMinutes: salonDay.tillMinutes,
            breaks: salonDay.breaks || [],
          })
        );
        dispatch(setDayAvailability({ day, isOpen: salonDay.isOpen }));
      });
    } else if (!copySalonHours) {
      // When unchecked, restore whatever staff hours we had before copying.
      if (staffBaseHours && Object.keys(staffBaseHours).length > 0) {
        DAYS.forEach((day) => {
          const staffDay = staffBaseHours[day];
          if (staffDay) {
            dispatch(
              setDayHours({
                day,
                fromHours: staffDay.fromHours,
                fromMinutes: staffDay.fromMinutes,
                tillHours: staffDay.tillHours,
                tillMinutes: staffDay.tillMinutes,
                breaks: staffDay.breaks || [],
              })
            );
            dispatch(
              setDayAvailability({ day, isOpen: staffDay.isOpen ?? false })
            );
          } else {
            dispatch(
              setDayHours({
                day,
                fromHours: 0,
                fromMinutes: 0,
                tillHours: 0,
                tillMinutes: 0,
                breaks: [],
              })
            );
            dispatch(setDayAvailability({ day, isOpen: false }));
          }
        });
      } else {
        // Fallback: if for some reason we don't have staffBaseHours yet,
        // clear/close all hours (previous behaviour).
        DAYS.forEach((day) => {
          dispatch(
            setDayHours({
              day,
              fromHours: 0,
              fromMinutes: 0,
              tillHours: 0,
              tillMinutes: 0,
              breaks: [],
            })
          );
          dispatch(setDayAvailability({ day, isOpen: false }));
        });
      }
    }
  }, [copySalonHours, salonBusinessHours, staffBaseHours, dispatch]);

  const handleToggleCopySalonHours = () => {
    if (!copySalonHours) {
      // Snapshot current staff hours BEFORE copying salon hours
      const cloned: BusinessHours = JSON.parse(
        JSON.stringify(businessHours)
      ) as BusinessHours;
      setStaffBaseHours(cloned);
      setCopySalonHours(true);
    } else {
      // Turning off copy – restoration will be handled by the effect above
      setCopySalonHours(false);
    }
  };

  const handleToggleDay = (day: string, value: boolean) => {
    const dayData = businessHours[day];
    dispatch(setDayAvailability({ day, isOpen: value }));

    // If turning day ON and no hours are set (all zeros), set default hours (10 AM - 7:30 PM)
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
            fromHours: 10, // 10 AM
            fromMinutes: 0,
            tillHours: 19, // 7 PM
            tillMinutes: 30, // 7:30 PM
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
              Break {index + 1}:{" "}
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
        <Text style={styles.title}>Availability hours</Text>
        <Text style={styles.subtitle}>
          When clients can book staff member service.
        </Text>
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

      {salonBusinessHours && (
        <View style={styles.copyCheckboxContainer}>
          <View style={styles.copyHoursSection}>
            <TouchableOpacity
              onPress={handleToggleCopySalonHours}
            >
              <View
                style={[
                  styles.checkbox,
                  copySalonHours && styles.checkboxChecked,
                ]}
              >
                {copySalonHours && (
                  <Feather
                    name="check"
                    size={moderateWidthScale(14)}
                    color={theme.white}
                  />
                )}
              </View>
            </TouchableOpacity>
            <View style={{ gap: 3, width: "90%" }}>
              <Text style={styles.checkboxLabel}>
                Copy {businessName} business hours
              </Text>
              <Text style={styles.sectionDescription}>
                This automatically sets their schedule to match the salon's open
                hours.
              </Text>
            </View>
          </View>
        </View>
      )}

      <BusinessHoursBottomSheet
        visible={bottomSheetVisible}
        onClose={handleCloseBottomSheet}
        day={selectedDay || ""}
      />
    </View>
  );
}
