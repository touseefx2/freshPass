import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Pressable,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import { clearSelectedDate } from "@/src/state/slices/generalSlice";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: dayjs.Dayjs | null;
  onDateSelect: (date: dayjs.Dayjs) => void;
}

const getWeekDays = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf("week");
  return Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));
};

const formatWeekRange = (week: dayjs.Dayjs[]) => {
  if (week.length === 0) return "";
  const start = week[0];
  const end = week[6];
  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

const getTimezoneInfo = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offset / 60));
    const offsetMinutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? "+" : "-";
    const gmtOffset = `GMT${sign}${offsetHours}${
      offsetMinutes > 0 ? `:${offsetMinutes.toString().padStart(2, "0")}` : ""
    }`;

    // Try to get location name from user state
    return { timezone, gmtOffset };
  } catch (error) {
    return { timezone: "Unknown", gmtOffset: "GMT+0" };
  }
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    bottomSheet: {
      backgroundColor: theme.white,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      borderBottomLeftRadius: moderateWidthScale(24),
      borderBottomRightRadius: moderateWidthScale(24),
    },
    modalHeader: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(32),
      paddingBottom: moderateHeightScale(20),
      backgroundColor: theme.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalHeaderTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
      textAlign: "center",
    },
    modalCloseButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    modalContent: {
      paddingHorizontal: moderateWidthScale(20),
    },
    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(24),
    },
    weekNavigationButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
    },
    weekRangeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    calendarGrid: {
      marginBottom: moderateHeightScale(24),
    },
    daysHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(16),
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
    },
    dayHeaderText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dayContainer: {
      flex: 1,
      alignItems: "center",
    },
    dayNumberContainer: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    dayNumberSelected: {
      backgroundColor: theme.orangeBrown30,
    },
    dayNumber: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dayNumberSelectedText: {
      color: theme.darkGreen,
    },
    dayNumberTodayText: {
      color: theme.selectCard,
    },
    timezoneText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    appointmentText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
      textAlign: "center",
    },

    clearButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "right",
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
  });

export default function DatePickerModal({
  visible,
  onClose,
  selectedDate,
  onDateSelect,
}: DatePickerModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.user.location);

  const today = dayjs();
  const [week, setWeek] = useState(getWeekDays(selectedDate || today));
  const [localSelectedDate, setLocalSelectedDate] = useState(
    selectedDate || today
  );
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const currentWeek = getWeekDays(selectedDate || today);
      setWeek(currentWeek);
      setLocalSelectedDate(selectedDate || today);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, selectedDate]);

  const nextWeek = () => {
    const next = week[6].add(1, "day");
    const nextWeekDays = getWeekDays(next);
    setWeek(nextWeekDays);
  };

  const prevWeek = () => {
    const prev = week[0].subtract(1, "day");
    const prevWeekDays = getWeekDays(prev);
    setWeek(prevWeekDays);
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    setLocalSelectedDate(date);
    onDateSelect(date);
    onClose();
  };

  const handleClearDate = () => {
    dispatch(clearSelectedDate());
    setLocalSelectedDate(today);
    onClose();
  };

  const timezoneInfo = getTimezoneInfo();
  // const locationName = location?.locationName || "Miami-Dade County, FL, USA";
  // const timezoneText = `In your time zone, ${locationName} (${timezoneInfo.gmtOffset})`;
  const timezoneText = `In your time zone, ${timezoneInfo.timezone} (${timezoneInfo.gmtOffset})`;


  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.bottomSheet}
          >
            <Animated.View
              style={{
                transform: [{ translateY }],
              }}
            >
              <View style={styles.modalHeader}>
                <View style={{ width: moderateWidthScale(32) }} />
                <Text style={styles.modalHeaderTitle}>Select date</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="x"
                    size={moderateWidthScale(18)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {/* Week Navigation */}
                <View style={styles.weekNavigation}>
                  <TouchableOpacity
                    onPress={prevWeek}
                    style={styles.weekNavigationButton}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="chevron-left"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                  <Text style={styles.weekRangeText}>
                    {formatWeekRange(week)}
                  </Text>
                  <TouchableOpacity
                    onPress={nextWeek}
                    style={styles.weekNavigationButton}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="chevron-right"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {/* Days Header */}
                  <View style={styles.daysHeader}>
                    {dayNames.map((dayName) => (
                      <View key={dayName} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{dayName}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Days Row */}
                  <View style={styles.daysRow}>
                    {week.map((day) => {
                      const isToday = day.isSame(today, "day");
                      const isSelected = selectedDate !== null && day.isSame(selectedDate, "day");
                      const isTodayWithoutSelection = selectedDate === null && isToday;
                      return (
                        <TouchableOpacity
                          key={day.format("YYYY-MM-DD")}
                          style={styles.dayContainer}
                          onPress={() => handleDateSelect(day)}
                        >
                          <View
                            style={[
                              styles.dayNumberContainer,
                              isSelected && styles.dayNumberSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNumber,
                                isSelected && styles.dayNumberSelectedText,
                                isTodayWithoutSelection && styles.dayNumberTodayText,
                              ]}
                            >
                              {day.format("D")}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Timezone Information */}
                <Text
                  style={[
                    styles.timezoneText,
                    { marginBottom: moderateHeightScale(5) },
                  ]}
                >
                  {timezoneText}
                </Text>

                {/* Appointment Selection Text */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: moderateHeightScale(12),
                  }}
                >
                  <Text style={[styles.timezoneText,{marginBottom:0}]}>
                    To view businesses on a specific date, select a date above
                  </Text>

                  {/* Clear Date Button */}
                  {selectedDate && (
                    <Text
                      onPress={handleClearDate}
                      style={styles.clearButtonText}
                    >
                      Clear date
                    </Text>
                  )}
                </View>
              </View>
              {/* <View style={{ paddingBottom: insets.bottom }} /> */}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
