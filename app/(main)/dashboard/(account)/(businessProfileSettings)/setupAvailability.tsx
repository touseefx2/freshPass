import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
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
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
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

interface BusinessHoursData {
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
}

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
const parseTimeToHoursMinutes = (timeString: string | null | undefined): { hours: number; minutes: number } => {
  if (!timeString || typeof timeString !== 'string') {
    return { hours: 0, minutes: 0 };
  }
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

// Convert day name from API format (lowercase) to display format (capitalized)
const getDayDisplayFormat = (day: string): string => {
  if (!day) return day;
  // Handle both "monday" and "Monday" formats
  const lowerDay = day.toLowerCase();
  return DAYS.find(d => d.toLowerCase() === lowerDay) || (day.charAt(0).toUpperCase() + day.slice(1));
};

// Convert day name from display format to API format (lowercase)
const getDayApiFormat = (day: string): string => {
  return day.toLowerCase();
};

// Convert API format to local state format
const parseBusinessHoursFromAPI = (hoursArray: Array<{
  id: number;
  day: string;
  closed: boolean;
  opening_time: string | null;
  closing_time: string | null;
  break_hours: Array<{
    start: string;
    end: string;
  }>;
}>): BusinessHours => {
  const businessHours: BusinessHours = {};
  
  // Initialize all days with default closed state
  DAYS.forEach((day) => {
    businessHours[day] = {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    };
  });

  if (!hoursArray || !Array.isArray(hoursArray) || hoursArray.length === 0) {
    return businessHours;
  }

  // Create a map to handle duplicates - keep the entry with highest ID for each day
  const dayMap = new Map<string, typeof hoursArray[0]>();
  
  hoursArray.forEach((dayData) => {
    const dayName = getDayDisplayFormat(dayData.day);
    if (DAYS.includes(dayName)) {
      const existing = dayMap.get(dayName);
      // Keep the entry with the highest ID (latest entry)
      if (!existing || dayData.id > existing.id) {
        dayMap.set(dayName, dayData);
      }
    }
  });

  // Process each day entry
  dayMap.forEach((dayData, dayName) => {
    // Handle null opening_time and closing_time
    let fromHours = 0;
    let fromMinutes = 0;
    let tillHours = 0;
    let tillMinutes = 0;

    if (dayData.opening_time) {
      const parsed = parseTimeToHoursMinutes(dayData.opening_time);
      fromHours = parsed.hours;
      fromMinutes = parsed.minutes;
    }

    if (dayData.closing_time) {
      const parsed = parseTimeToHoursMinutes(dayData.closing_time);
      tillHours = parsed.hours;
      tillMinutes = parsed.minutes;
    }

    const breaks = (dayData.break_hours || []).map((breakTime) => {
      const { hours: fromHours, minutes: fromMinutes } = parseTimeToHoursMinutes(
        breakTime.start || "00:00"
      );
      const { hours: tillHours, minutes: tillMinutes } = parseTimeToHoursMinutes(
        breakTime.end || "00:00"
      );
      return {
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
      };
    });

    businessHours[dayName] = {
      isOpen: !dayData.closed,
      fromHours,
      fromMinutes,
      tillHours,
      tillMinutes,
      breaks,
    };
  });

  return businessHours;
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

    const breakHours = (dayData.breaks || []).map((breakTime) => ({
      start: formatTimeToHHMM(breakTime.fromHours, breakTime.fromMinutes),
      end: formatTimeToHHMM(breakTime.tillHours, breakTime.tillMinutes),
    }));

    return {
      day: getDayApiFormat(day),
      closed: !dayData.isOpen,
      opening_time: formatTimeToHHMM(dayData.fromHours, dayData.fromMinutes),
      closing_time: formatTimeToHHMM(dayData.tillHours, dayData.tillMinutes),
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
      paddingHorizontal: moderateWidthScale(20),
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: 5,
      marginBottom: moderateHeightScale(20),
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
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    skeletonDayRow: {
      height: moderateHeightScale(50),
      width: "100%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(2),
    },
  });

export default function SetupAvailabilityScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: BusinessHoursData;
      }>(businessEndpoints.moduleData("availability"));

      if (response.success && response.data) {
        const parsedHours = parseBusinessHoursFromAPI(
          response.data.business_hours || []
        );
        setBusinessHours(parsedHours);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch availability:", error);
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

  const handleToggleDay = (day: string, value: boolean) => {
    setBusinessHours((prev) => {
      const updated = { ...prev };
      if (!updated[day]) {
        updated[day] = {
          isOpen: false,
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
          breaks: [],
        };
      }
      updated[day] = {
        ...updated[day],
        isOpen: value,
      };

      // If turning day ON and no hours are set (all zeros), set default hours (9 AM - 6 PM)
      if (value) {
        const dayData = updated[day];
        const hasNoHours =
          dayData.fromHours === 0 &&
          dayData.fromMinutes === 0 &&
          dayData.tillHours === 0 &&
          dayData.tillMinutes === 0;

        if (hasNoHours) {
          updated[day] = {
            ...updated[day],
            fromHours: 9,
            fromMinutes: 0,
            tillHours: 18,
            tillMinutes: 0,
            breaks: [],
          };
        }
      }

      return updated;
    });
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
          // Don't update the current day again (already updated above)
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
  };

  const getDayDisplayText = (day: string): string | React.ReactNode => {
    const dayData = businessHours[day];

    if (!dayData) {
      return "Closed";
    }

    // If day is closed, show "Closed"
    if (!dayData.isOpen) {
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

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      const businessHoursArray = convertBusinessHoursToAPI(businessHours);
      const businessHoursString = JSON.stringify(businessHoursArray);

      const formData = new FormData();
      formData.append("business_hours", businessHoursString);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, formData, config);

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
      Logger.error("Failed to update availability:", error);
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
              <Text style={styles.title}>Business hours</Text>
              <Text style={styles.subtitle}>
                When clients can book your services
              </Text>
            </View>

            <View style={styles.daysContainer}>
              {DAYS.map((day, index) => {
                const dayData = businessHours[day];
                const isOpen = dayData?.isOpen ?? false; 
                const showDivider = index < DAYS.length - 1;
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
                    {showDivider && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button
            title="Update"
            onPress={handleUpdate}
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
