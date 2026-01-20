import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter } from "expo-router";
import BusinessHoursBottomSheet from "@/src/components/businessHoursBottomSheet";
import CustomToggle from "@/src/components/customToggle";
import { Skeleton } from "@/src/components/skeletons";

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

// Convert HH:MM string to hours and minutes
const parseTimeToHoursMinutes = (
  timeString: string | null | undefined
): { hours: number; minutes: number } => {
  if (!timeString || typeof timeString !== "string") {
    return { hours: 0, minutes: 0 };
  }
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

// Convert day name from API format (lowercase) to display format (capitalized)
const getDayDisplayFormat = (day: string): string => {
  if (!day) return day;
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
};

// Convert day name from display format to API format (lowercase)
const getDayApiFormat = (day: string): string => {
  if (!day) return day;
  return day.toLowerCase();
};

// Parse API response to local state format
const parseBusinessHoursFromAPI = (
  staffHours: Array<{
    id: number;
    day: string;
    closed: boolean;
    opening_time: string | null;
    closing_time: string | null;
    break_hours: Array<{
      start: string;
      end: string;
    }>;
  }>,
  businessHours?: Array<{
    id: number;
    day: string;
    closed: boolean;
    opening_time: string | null;
    closing_time: string | null;
    break_hours: Array<{
      start: string;
      end: string;
    }>;
  }>
): { businessHours: BusinessHours; salonBusinessHours: BusinessHours | null } => {
  const parsedStaffHours: BusinessHours = {};
  const parsedSalonHours: BusinessHours = {};

  // Initialize all days for staff with default closed state so UI has
  // sensible defaults even if some days are missing from the API
  DAYS.forEach((day) => {
    parsedStaffHours[day] = {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    };
  });

  // Parse staff hours from API response (if any) and override defaults
  (staffHours || []).forEach((dayData) => {
    const dayName = getDayDisplayFormat(dayData.day);
    const { hours: fromHours, minutes: fromMinutes } = parseTimeToHoursMinutes(
      dayData.opening_time
    );
    const { hours: tillHours, minutes: tillMinutes } = parseTimeToHoursMinutes(
      dayData.closing_time
    );

    const breaks = (dayData.break_hours || []).map((breakTime) => {
      const { hours: breakFromHours, minutes: breakFromMinutes } =
        parseTimeToHoursMinutes(breakTime.start);
      const { hours: breakTillHours, minutes: breakTillMinutes } =
        parseTimeToHoursMinutes(breakTime.end);

      return {
        fromHours: breakFromHours,
        fromMinutes: breakFromMinutes,
        tillHours: breakTillHours,
        tillMinutes: breakTillMinutes,
      };
    });

    parsedStaffHours[dayName] = {
      isOpen: !dayData.closed,
      fromHours,
      fromMinutes,
      tillHours,
      tillMinutes,
      breaks,
    };
  });

  // Parse salon business hours if provided
  if (businessHours && businessHours.length > 0) {
    businessHours.forEach((dayData) => {
      const dayName = getDayDisplayFormat(dayData.day);
      const { hours: fromHours, minutes: fromMinutes } = parseTimeToHoursMinutes(
        dayData.opening_time
      );
      const { hours: tillHours, minutes: tillMinutes } = parseTimeToHoursMinutes(
        dayData.closing_time
      );

      const breaks = (dayData.break_hours || []).map((breakTime) => {
        const { hours: breakFromHours, minutes: breakFromMinutes } =
          parseTimeToHoursMinutes(breakTime.start);
        const { hours: breakTillHours, minutes: breakTillMinutes } =
          parseTimeToHoursMinutes(breakTime.end);

        return {
          fromHours: breakFromHours,
          fromMinutes: breakFromMinutes,
          tillHours: breakTillHours,
          tillMinutes: breakTillMinutes,
        };
      });

      parsedSalonHours[dayName] = {
        isOpen: !dayData.closed,
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
        breaks,
      };
    });
  }

  return {
    businessHours: parsedStaffHours,
    salonBusinessHours: businessHours && businessHours.length > 0 ? parsedSalonHours : null,
  };
};

// Convert local state format to API format
const convertBusinessHoursToAPI = (businessHours: BusinessHours): any[] => {
  return DAYS.map((day) => {
    const dayData = businessHours[day];

    const formatTimeToHHMM = (hours: number, minutes: number): string => {
      const h = hours.toString().padStart(2, "0");
      const m = minutes.toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const breakHours = (dayData?.breaks || []).map((breakTime) => ({
      start: formatTimeToHHMM(breakTime.fromHours, breakTime.fromMinutes),
      end: formatTimeToHHMM(breakTime.tillHours, breakTime.tillMinutes),
    }));

    return {
      day: getDayApiFormat(day),
      closed: !dayData?.isOpen,
      opening_time: dayData?.isOpen
        ? formatTimeToHHMM(dayData.fromHours, dayData.fromMinutes)
        : null,
      closing_time: dayData?.isOpen
        ? formatTimeToHHMM(dayData.tillHours, dayData.tillMinutes)
        : null,
      break_hours: breakHours,
    };
  });
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
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
    buttonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
    },
    skeletonDayRow: {
      height: moderateHeightScale(50),
      width: "100%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(2),
    },
  });

export default function StaffAvailabilityScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  // This will always hold the "staff" hours (what comes from API or what user sets
  // when copySalonHours is OFF), so we can restore them when unchecking the copy box
  const [staffBaseHours, setStaffBaseHours] = useState<BusinessHours>({});
  const [salonBusinessHours, setSalonBusinessHours] =
    useState<BusinessHours | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [copySalonHours, setCopySalonHours] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch availability hours from API
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          business: {
            id: number;
            title: string;
          };
          business_hours: Array<{
            id: number;
            day: string;
            closed: boolean;
            opening_time: string | null;
            closing_time: string | null;
            break_hours: Array<{
              start: string;
              end: string;
            }>;
          }>;
          staff_hours: Array<{
            id: number;
            day: string;
            closed: boolean;
            opening_time: string | null;
            closing_time: string | null;
            break_hours: Array<{
              start: string;
              end: string;
            }>;
          }>;
        };
      }>(staffEndpoints.availabilityHours);

      if (response.success && response.data) {
        const { businessHours: parsedHours, salonBusinessHours: parsedSalonHours } =
          parseBusinessHoursFromAPI(
            response.data.staff_hours,
            response.data.business_hours
          );
        // By default, screen should show staff hours
        setBusinessHours(parsedHours);
        setStaffBaseHours(parsedHours);
        setSalonBusinessHours(parsedSalonHours);
        setBusinessName(response.data.business.title || "");
      }
    } catch (error: any) {
      console.error("Failed to fetch availability:", error);
      showBanner(
        "Error",
        error.message || "Failed to fetch availability. Please try again.",
        "error",
        3000
      );
    } finally {
      setLoading(false);
    }
  }, [showBanner]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Copy salon business hours when checkbox is checked
  useEffect(() => {
    if (copySalonHours && salonBusinessHours) {
      // Copy all salon business hours to staff business hours
      setBusinessHours((prev) => {
        const updatedHours = { ...prev };
        Object.keys(salonBusinessHours).forEach((day) => {
          const salonDay = salonBusinessHours[day];
          updatedHours[day] = {
            isOpen: salonDay.isOpen,
            fromHours: salonDay.fromHours,
            fromMinutes: salonDay.fromMinutes,
            tillHours: salonDay.tillHours,
            tillMinutes: salonDay.tillMinutes,
            breaks: salonDay.breaks || [],
          };
        });
        return updatedHours;
      });
    } else if (!copySalonHours) {
      // When unchecked, restore back to staff hours (what user had before copying)
      setBusinessHours((prev) => {
        // If we have stored staffBaseHours, use that
        if (staffBaseHours && Object.keys(staffBaseHours).length > 0) {
          return { ...staffBaseHours };
        }

        // Fallback (should rarely happen): clear/close all hours
        const updatedHours = { ...prev };
        DAYS.forEach((day) => {
          updatedHours[day] = {
            isOpen: false,
            fromHours: 0,
            fromMinutes: 0,
            tillHours: 0,
            tillMinutes: 0,
            breaks: [],
          };
        });
        return updatedHours;
      });
    }
  }, [copySalonHours, salonBusinessHours, staffBaseHours]);

  const handleToggleDay = (day: string, value: boolean) => {
    const dayData = businessHours[day];
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
          breaks: [],
        }),
        isOpen: value,
      },
    }));

    // When we are in "staff" mode (copySalonHours is OFF), also update staffBaseHours
    if (!copySalonHours) {
      setStaffBaseHours((prev) => ({
        ...prev,
        [day]: {
          ...(prev[day] || {
            fromHours: 0,
            fromMinutes: 0,
            tillHours: 0,
            tillMinutes: 0,
            breaks: [],
          }),
          isOpen: value,
        },
      }));
    }

    // If turning day ON and no hours are set (all zeros), set default hours (10 AM - 7:30 PM)
    if (value && dayData) {
      const hasNoHours =
        dayData.fromHours === 0 &&
        dayData.fromMinutes === 0 &&
        dayData.tillHours === 0 &&
        dayData.tillMinutes === 0;

      if (hasNoHours) {
        setBusinessHours((prev) => ({
          ...prev,
          [day]: {
            ...prev[day],
            fromHours: 10, // 10 AM
            fromMinutes: 0,
            tillHours: 19, // 7 PM
            tillMinutes: 30, // 7:30 PM
            breaks: [],
            isOpen: true,
          },
        }));

        if (!copySalonHours) {
          setStaffBaseHours((prev) => ({
            ...prev,
            [day]: {
              ...prev[day],
              fromHours: 10,
              fromMinutes: 0,
              tillHours: 19,
              tillMinutes: 30,
              breaks: [],
              isOpen: true,
            },
          }));
        }
      }
    }
  };

  const handleDayPress = (day: string) => {
    setSelectedDay(day);
    setBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetVisible(false);
    setSelectedDay(null);
  };

  const handleBottomSheetSave = (
    day: string,
    fromHours: number,
    fromMinutes: number,
    tillHours: number,
    tillMinutes: number,
    breaks: Array<{
      fromHours: number;
      fromMinutes: number;
      tillHours: number;
      tillMinutes: number;
    }>,
    copyHoursEnabled?: boolean,
    selectedDays?: string[]
  ) => {
    setBusinessHours((prev) => {
      const updated = { ...prev };

      // Update the current day
      updated[day] = {
        ...updated[day],
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
        breaks,
        isOpen: true,
      };

      // If copy hours is enabled and there are selected days, apply to all selected days
      if (copyHoursEnabled && selectedDays && selectedDays.length > 0) {
        selectedDays.forEach((selectedDay) => {
          if (selectedDay !== day) {
            updated[selectedDay] = {
              ...updated[selectedDay],
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
              breaks,
              isOpen: true,
            };
          }
        });
      }

      return updated;
    });

    // When in staff mode (copySalonHours OFF), also persist these changes
    // into staffBaseHours so that unchecking "copy business hours" later
    // restores the user's own staff schedule.
    if (!copySalonHours) {
      setStaffBaseHours((prev) => {
        const updated = { ...prev };

        updated[day] = {
          ...updated[day],
          fromHours,
          fromMinutes,
          tillHours,
          tillMinutes,
          breaks,
          isOpen: true,
        };

        if (copyHoursEnabled && selectedDays && selectedDays.length > 0) {
          selectedDays.forEach((selectedDay) => {
            if (selectedDay !== day) {
              updated[selectedDay] = {
                ...updated[selectedDay],
                fromHours,
                fromMinutes,
                tillHours,
                tillMinutes,
                breaks,
                isOpen: true,
              };
            }
          });
        }

        return updated;
      });
    }
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

  const handleSave = async () => {
    setIsUpdating(true);

    try {
      const workingHoursArray = convertBusinessHoursToAPI(businessHours);

      const requestBody = {
        working_hours: workingHoursArray,
      };

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(staffEndpoints.details, requestBody, config);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Availability updated successfully",
          "success",
          3000
        );

        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update availability",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to update availability:", error);
      showBanner(
        "Error",
        error.message || "Failed to update availability. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Set availability" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="Availability" styles={styles} />
        ) : (
          <>
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

                return (
                  <React.Fragment key={day}>
                    <TouchableOpacity
                      style={styles.dayRow}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
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
                            <View style={styles.dayHoursMultiple}>
                              {displayText}
                            </View>
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
                    {index < DAYS.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>

            {salonBusinessHours && (
              <View style={styles.copyCheckboxContainer}>
                <View style={styles.copyHoursSection}>
                  <TouchableOpacity
                    onPress={() => setCopySalonHours(!copySalonHours)}
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
                      This automatically sets their schedule to match the salon's
                      open hours.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.buttonContainer}>
          <Button
            title="Save"
            onPress={handleSave}
            disabled={isUpdating}
          />
        </View>
      )}

      <BusinessHoursBottomSheet
        visible={bottomSheetVisible}
        onClose={handleCloseBottomSheet}
        day={selectedDay || ""}
        onSave={handleBottomSheetSave}
        initialData={
          selectedDay && businessHours[selectedDay]
            ? {
                fromHours: businessHours[selectedDay].fromHours,
                fromMinutes: businessHours[selectedDay].fromMinutes,
                tillHours: businessHours[selectedDay].tillHours,
                tillMinutes: businessHours[selectedDay].tillMinutes,
                breaks: businessHours[selectedDay].breaks,
                isOpen: businessHours[selectedDay].isOpen,
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

