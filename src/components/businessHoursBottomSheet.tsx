import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setDayHours,
  setDayAvailability,
} from "@/src/state/slices/completeProfileSlice";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import PickerDropdown from "@/src/components/PickerDropdown";

interface BusinessHoursBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  day: string;
  onSave?: (
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
  ) => void;
  initialData?: {
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
  };
}

interface BreakTime {
  fromHours: number;
  fromMinutes: number;
  tillHours: number;
  tillMinutes: number;
}

const getTotalMinutes = (hours: number, minutes: number) => hours * 60 + minutes;

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sectionTitle2: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    sectionDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    errorText: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
    },
    inputRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    inputWrapper: {
      flex: 1,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(8),
      gap: moderateHeightScale(2),
    },
    inputLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    textInput: {
      flex: 1,
      height: heightScale(22),
      paddingVertical: 0,
      textAlignVertical: "center",
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    dropdownButton: {
      flex: 1,
      height: heightScale(22),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dropdownText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    dropdownPlaceholder: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen2,
    },
    breakTimeSection: {
      marginTop: moderateHeightScale(12),
    },
    breakTimeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      // marginBottom: moderateHeightScale(12),
    },
    addBreakButton: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
    },
    addBreakButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrown,
    },
    breakTimeItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
    },
    breakTimeInputs: {
      flex: 1,
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    deleteButton: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    copyHoursSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    checkboxRow: {},
    checkbox: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
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
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    daysContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
    },
    dayPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
    },
    dayPillSelected: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    dayPillText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },

  });

export default function BusinessHoursBottomSheet({
  visible,
  onClose,
  day,
  onSave,
  initialData,
}: BusinessHoursBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { businessHours } = useAppSelector((state) => state.completeProfile);

  // Use initialData if provided (for non-Redux usage), otherwise use Redux state
  const dayData = initialData
    ? {
        isOpen: true,
        fromHours: initialData.fromHours,
        fromMinutes: initialData.fromMinutes,
        tillHours: initialData.tillHours,
        tillMinutes: initialData.tillMinutes,
        breaks: initialData.breaks,
      }
    : businessHours[day] || {
        isOpen: false,
        fromHours: 0,
        fromMinutes: 0,
        tillHours: 0,
        tillMinutes: 0,
        breaks: [],
      };

  // Default hours: 9 AM - 6 PM
  const DEFAULT_FROM_HOURS = 9;
  const DEFAULT_FROM_MINUTES = 0;
  const DEFAULT_TILL_HOURS = 18;
  const DEFAULT_TILL_MINUTES = 0;

  // Check if day has no hours set
  const hasNoHours = 
    (dayData.fromHours === 0 && dayData.fromMinutes === 0 && 
     dayData.tillHours === 0 && dayData.tillMinutes === 0) ||
    (!dayData.fromHours && !dayData.tillHours);

  const [fromHours, setFromHours] = useState(
    hasNoHours ? DEFAULT_FROM_HOURS : (dayData.fromHours || 0)
  );
  const [fromMinutes, setFromMinutes] = useState(
    hasNoHours ? DEFAULT_FROM_MINUTES : (dayData.fromMinutes || 0)
  );
  const [tillHours, setTillHours] = useState(
    hasNoHours ? DEFAULT_TILL_HOURS : (dayData.tillHours || 0)
  );
  const [tillMinutes, setTillMinutes] = useState(
    hasNoHours ? DEFAULT_TILL_MINUTES : (dayData.tillMinutes || 0)
  );
  const [breaks, setBreaks] = useState<BreakTime[]>(dayData.breaks || []);
  const [copyHoursEnabled, setCopyHoursEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showTillDropdown, setShowTillDropdown] = useState(false);
  const [showBreakFromDropdown, setShowBreakFromDropdown] = useState<
    number | null
  >(null);
  const [showBreakTillDropdown, setShowBreakTillDropdown] = useState<
    number | null
  >(null);
  const [openingHoursError, setOpeningHoursError] = useState<string | null>(null);
  const [breakTimeError, setBreakTimeError] = useState<string | null>(null);

  // Refs for dropdown positioning
  const fromButtonRef = useRef<View>(null);
  const tillButtonRef = useRef<View>(null);
  const breakFromButtonRefs = useRef<{ [key: number]: View | null }>({});
  const breakTillButtonRefs = useRef<{ [key: number]: View | null }>({});

  useEffect(() => {
    if (visible && day) {
      // Recompute dayData to ensure we have the latest initialData or Redux state
      const currentDayData = initialData
        ? {
            isOpen: true,
            fromHours: initialData.fromHours,
            fromMinutes: initialData.fromMinutes,
            tillHours: initialData.tillHours,
            tillMinutes: initialData.tillMinutes,
            breaks: initialData.breaks,
          }
        : businessHours[day] || {
            isOpen: false,
            fromHours: 0,
            fromMinutes: 0,
            tillHours: 0,
            tillMinutes: 0,
            breaks: [],
          };

      // Check if day has no hours set (all zeros)
      const hasNoHours = 
        (currentDayData.fromHours === 0 && currentDayData.fromMinutes === 0 && 
         currentDayData.tillHours === 0 && currentDayData.tillMinutes === 0) ||
        (!currentDayData.fromHours && !currentDayData.tillHours);
      
      let currentFromHours = 0;
      let currentFromMinutes = 0;
      let currentTillHours = 0;
      let currentTillMinutes = 0;
      
      // If no hours are set, use default hours (9 AM - 6 PM)
      if (hasNoHours) {
        currentFromHours = 9; // 9 AM
        currentFromMinutes = 0;
        currentTillHours = 18; // 6 PM
        currentTillMinutes = 0;
        setFromHours(9);
        setFromMinutes(0);
        setTillHours(18);
        setTillMinutes(0);
      } else {
        currentFromHours = currentDayData.fromHours || 0;
        currentFromMinutes = currentDayData.fromMinutes || 0;
        currentTillHours = currentDayData.tillHours || 0;
        currentTillMinutes = currentDayData.tillMinutes || 0;
        setFromHours(currentFromHours);
        setFromMinutes(currentFromMinutes);
        setTillHours(currentTillHours);
        setTillMinutes(currentTillMinutes);
      }
      
      // Auto-add at least 1 break time field if no breaks exist
      const existingBreaks = currentDayData.breaks || [];
      if (existingBreaks.length === 0) {
        // Calculate default break time: 1 hour in the middle of business hours
        const fromTotalMinutes = getTotalMinutes(currentFromHours, currentFromMinutes);
        const tillTotalMinutes = getTotalMinutes(currentTillHours, currentTillMinutes);
        const totalDuration = tillTotalMinutes - fromTotalMinutes;
        
        // Only set default break if business hours are at least 2 hours (need space for 1 hour break)
        if (totalDuration >= 120) {
          // Calculate middle point and set 1 hour break (60 minutes)
          const middlePoint = fromTotalMinutes + Math.floor(totalDuration / 2);
          const breakStartMinutes = middlePoint - 30; // Start 30 minutes before middle
          const breakEndMinutes = middlePoint + 30; // End 30 minutes after middle (exactly 1 hour)
          
          // Ensure break is within business hours
          const adjustedBreakStart = Math.max(fromTotalMinutes, breakStartMinutes);
          const adjustedBreakEnd = Math.min(tillTotalMinutes, adjustedBreakStart + 60);
          
          // Convert back to hours and minutes
          const breakFromHours = Math.floor(adjustedBreakStart / 60);
          const breakFromMinutes = adjustedBreakStart % 60;
          const breakTillHours = Math.floor(adjustedBreakEnd / 60);
          const breakTillMinutes = adjustedBreakEnd % 60;
          
          setBreaks([
            {
              fromHours: breakFromHours,
              fromMinutes: breakFromMinutes,
              tillHours: breakTillHours,
              tillMinutes: breakTillMinutes,
            },
          ]);
        } else {
          // If business hours are too short, set empty break (user can set manually)
          setBreaks([
            {
              fromHours: 0,
              fromMinutes: 0,
              tillHours: 0,
              tillMinutes: 0,
            },
          ]);
        }
      } else {
        setBreaks(existingBreaks);
      }
      setCopyHoursEnabled(false);
      setSelectedDays([]);
    }
  }, [visible, day, initialData, businessHours]);

  const handleSave = () => {
    setOpeningHoursError(null);
    setBreakTimeError(null);

    const fromTotalMinutes = getTotalMinutes(fromHours, fromMinutes);
    const tillTotalMinutes = getTotalMinutes(tillHours, tillMinutes);

    let hasError = false;

    // Validate opening hours: from must be less than till
    // Check if times are set (we set defaults, so if both are 0, user might have cleared them or selected 12 AM for both)
    const bothAreZero = fromHours === 0 && fromMinutes === 0 && tillHours === 0 && tillMinutes === 0;
    
    if (bothAreZero) {
      // This could be "not set" or "both 12 AM" - either way, it's invalid
      setOpeningHoursError("Please select valid opening and closing times.");
      hasError = true;
    } else if (fromTotalMinutes >= tillTotalMinutes) {
      setOpeningHoursError("Opening time must be earlier than closing time.");
      hasError = true;
    }

    // Filter valid breaks (non-empty ones)
    const validBreaks = breaks.filter(
      (breakTime) =>
        breakTime.fromHours > 0 ||
        breakTime.fromMinutes > 0 ||
        breakTime.tillHours > 0 ||
        breakTime.tillMinutes > 0
    );

    // Validate break times
    if (validBreaks.length > 0) {
      // Check for duplicate break times
      for (let i = 0; i < validBreaks.length; i++) {
        for (let j = i + 1; j < validBreaks.length; j++) {
          const break1From = getTotalMinutes(
            validBreaks[i].fromHours,
            validBreaks[i].fromMinutes
          );
          const break1Till = getTotalMinutes(
            validBreaks[i].tillHours,
            validBreaks[i].tillMinutes
          );
          const break2From = getTotalMinutes(
            validBreaks[j].fromHours,
            validBreaks[j].fromMinutes
          );
          const break2Till = getTotalMinutes(
            validBreaks[j].tillHours,
            validBreaks[j].tillMinutes
          );

          if (
            break1From === break2From &&
            break1Till === break2Till
          ) {
            setBreakTimeError("Break times cannot be the same. Please set different break times.");
            hasError = true;
            break;
          }
        }
        if (hasError) break;
      }

      // Check each break time validity
      if (!hasError) {
        const hasInvalidBreak = validBreaks.some((breakTime) => {
          const breakFrom = getTotalMinutes(
            breakTime.fromHours,
            breakTime.fromMinutes
          );
          const breakTill = getTotalMinutes(
            breakTime.tillHours,
            breakTime.tillMinutes
          );

          // Break from must be less than break till
          if (breakFrom >= breakTill) {
            return true;
          }

          // Break time must be within opening hours
          if (
            breakFrom < fromTotalMinutes ||
            breakTill > tillTotalMinutes
          ) {
            return true;
          }

          return false;
        });

        if (hasInvalidBreak) {
          setBreakTimeError(
            "Break times must be valid (from < till) and within opening hours."
          );
          hasError = true;
        }
      }
    }

    if (hasError) {
      return;
    }

    // If onSave callback is provided, use it (for non-Redux usage)
    if (onSave) {
      onSave(day, fromHours, fromMinutes, tillHours, tillMinutes, validBreaks, copyHoursEnabled, selectedDays);
    } else {
      // Otherwise use Redux (for completeProfile flow)
      dispatch(
        setDayHours({
          day,
          fromHours,
          fromMinutes,
          tillHours,
          tillMinutes,
          breaks: validBreaks,
        })
      );

      if (copyHoursEnabled && selectedDays.length > 0) {
        selectedDays.forEach((selectedDay) => {
          dispatch(
            setDayHours({
              day: selectedDay,
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
              breaks: validBreaks,
            })
          );
          dispatch(setDayAvailability({ day: selectedDay, isOpen: true }));
        });
      }
    }

    onClose();
  };

  const handleAddBreak = () => {
    setBreaks([
      ...breaks,
      {
        fromHours: 13,
        fromMinutes: 0,
        tillHours: 14,
        tillMinutes: 0,
      },
    ]);
  };

  const handleRemoveBreak = (index: number) => {
    // Remove the entire break row
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const handleBreakTimeChange = (
    index: number,
    field: "fromHours" | "fromMinutes" | "tillHours" | "tillMinutes",
    value: number
  ) => {
    const updatedBreaks = [...breaks];
    updatedBreaks[index] = {
      ...updatedBreaks[index],
      [field]: value,
    };
    setBreaks(updatedBreaks);
  };

  const handleDayToggle = (dayName: string) => {
    if (selectedDays.includes(dayName)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayName));
    } else {
      setSelectedDays([...selectedDays, dayName]);
    }
  };

  const handleTimeSelect = (
    hours: number,
    minutes: number,
    type: "from" | "till" | "breakFrom" | "breakTill",
    breakIndex?: number
  ) => {
    if (type === "from") {
      setFromHours(hours);
      setFromMinutes(minutes);
      setShowFromDropdown(false);
    } else if (type === "till") {
      setTillHours(hours);
      setTillMinutes(minutes);
      setShowTillDropdown(false);
    } else if (type === "breakFrom" && breakIndex !== undefined) {
      const updatedBreaks = [...breaks];
      updatedBreaks[breakIndex] = {
        ...updatedBreaks[breakIndex],
        fromHours: hours,
        fromMinutes: minutes,
      };
      setBreaks(updatedBreaks);
      setShowBreakFromDropdown(null);
    } else if (type === "breakTill" && breakIndex !== undefined) {
      const updatedBreaks = [...breaks];
      updatedBreaks[breakIndex] = {
        ...updatedBreaks[breakIndex],
        tillHours: hours,
        tillMinutes: minutes,
      };
      setBreaks(updatedBreaks);
      setShowBreakTillDropdown(null);
    }
  };

  const formatTime = (hours: number, minutes: number): string => {
    // Always format time, even if it's 12:00 AM (0,0)
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  return (
    <>
      <ModalizeBottomSheet
        visible={visible}
        onClose={onClose}
        title={`${day} availability`}
        footerButtonTitle="Save"
        onFooterButtonPress={handleSave}
      >
          <View style={{ gap: 3 }}>
            <Text style={styles.sectionTitle}>Business hours</Text>
            <Text style={styles.sectionDescription}>
              Set your business hours for {day}s here. To edit hours for a
              specific date, use your calendar.
            </Text>
          </View>

          <View style={{ gap: 5, marginTop: moderateHeightScale(12) }}>
            <Text style={styles.sectionTitle2}>Opening hours</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>From</Text>
                <TouchableOpacity
                  ref={fromButtonRef}
                  style={styles.dropdownButton}
                  onPress={() => setShowFromDropdown(true)}
                >
                  {fromHours !== undefined && fromMinutes !== undefined ? (
                    <Text style={styles.dropdownText}>
                      {formatTime(fromHours, fromMinutes)}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>From</Text>
                  )}
                  <Feather
                    name="chevron-down"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Till</Text>
                <TouchableOpacity
                  ref={tillButtonRef}
                  style={styles.dropdownButton}
                  onPress={() => setShowTillDropdown(true)}
                >
                  {tillHours !== undefined && tillMinutes !== undefined ? (
                    <Text style={styles.dropdownText}>
                      {formatTime(tillHours, tillMinutes)}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>Till</Text>
                  )}
                  <Feather
                    name="chevron-down"
                    size={moderateWidthScale(16)}
                    color={theme.darkGreen}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {openingHoursError ? (
              <Text style={styles.errorText}>{openingHoursError}</Text>
            ) : null}
          </View>

          <View style={styles.breakTimeSection}>
            <View style={styles.breakTimeHeader}>
              <Text style={styles.sectionTitle2}>Break time</Text>
              <TouchableOpacity
                onPress={handleAddBreak}
                style={styles.addBreakButton}
              >
                <Text style={styles.addBreakButtonText}>Add new +</Text>
              </TouchableOpacity>
            </View>
            {breakTimeError ? (
              <Text style={styles.errorText}>{breakTimeError}</Text>
            ) : null}
          </View>

          {breaks.map((breakTime, index) => (
            <View key={index} style={styles.breakTimeItem}>
              <View style={styles.breakTimeInputs}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>From</Text>
                  <TouchableOpacity
                    ref={(ref) => {
                      if (ref) {
                        breakFromButtonRefs.current[index] = ref;
                      }
                    }}
                    style={styles.dropdownButton}
                    onPress={() => setShowBreakFromDropdown(index)}
                  >
                    {breakTime.fromHours !== undefined && breakTime.fromMinutes !== undefined ? (
                      <Text style={styles.dropdownText}>
                        {formatTime(breakTime.fromHours, breakTime.fromMinutes)}
                      </Text>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>From</Text>
                    )}
                    <Feather
                      name="chevron-down"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Till</Text>
                  <TouchableOpacity
                    ref={(ref) => {
                      if (ref) {
                        breakTillButtonRefs.current[index] = ref;
                      }
                    }}
                    style={styles.dropdownButton}
                    onPress={() => setShowBreakTillDropdown(index)}
                  >
                    {breakTime.tillHours !== undefined && breakTime.tillMinutes !== undefined ? (
                      <Text style={styles.dropdownText}>
                        {formatTime(breakTime.tillHours, breakTime.tillMinutes)}
                      </Text>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>Till</Text>
                    )}
                    <Feather
                      name="chevron-down"
                      size={moderateWidthScale(16)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveBreak(index)}
                style={styles.deleteButton}
              >
                <Feather
                  name="trash-2"
                  size={moderateWidthScale(20)}
                  color={theme.link}
                />
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ gap: 15 }}>
            <View style={styles.copyHoursSection}>
              <TouchableOpacity
                onPress={() => setCopyHoursEnabled(!copyHoursEnabled)}
              >
                <View
                  style={[
                    styles.checkbox,
                    copyHoursEnabled && styles.checkboxChecked,
                  ]}
                >
                  {copyHoursEnabled && (
                    <Feather
                      name="check"
                      size={moderateWidthScale(14)}
                      color={theme.white}
                    />
                  )}
                </View>
              </TouchableOpacity>
              <View style={{ gap: 3, width: "90%" }}>
                <Text style={styles.checkboxLabel}>Copy business hours</Text>
                <Text style={styles.sectionDescription}>
                  Apply these hours to multiple days. Select the ones that match
                  your schedule.
                </Text>
              </View>
            </View>
            {copyHoursEnabled && (
              <View style={styles.daysContainer}>
                <TouchableOpacity
                  style={[
                    styles.dayPill,
                    selectedDays.length === DAYS.length - 1 &&
                      styles.dayPillSelected,
                  ]}
                  onPress={() => {
                    const otherDays = DAYS.filter((d) => d !== day);
                    if (selectedDays.length === otherDays.length) {
                      setSelectedDays([]);
                    } else {
                      setSelectedDays(otherDays);
                    }
                  }}
                >
                  {selectedDays.length === DAYS.length - 1 && (
                    <Feather
                      name="check"
                      size={moderateWidthScale(14)}
                      color={theme.darkGreen}
                      style={{ marginRight: moderateWidthScale(4) }}
                    />
                  )}
                  <Text style={[styles.dayPillText]}>All</Text>
                </TouchableOpacity>
                {DAYS.filter((d) => d !== day).map((dayName) => {
                  const isSelected = selectedDays.includes(dayName);
                  return (
                    <TouchableOpacity
                      key={dayName}
                      style={[
                        styles.dayPill,
                        isSelected && styles.dayPillSelected,
                      ]}
                      onPress={() => handleDayToggle(dayName)}
                    >
                      {isSelected && (
                        <Feather
                          name="check"
                          size={moderateWidthScale(14)}
                          color={theme.darkGreen}
                          style={{ marginRight: moderateWidthScale(4) }}
                        />
                      )}
                      <Text style={[styles.dayPillText]}>{dayName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
      </ModalizeBottomSheet>

      <PickerDropdown
        visible={showFromDropdown}
        currentHours={fromHours}
        currentMinutes={fromMinutes}
        onSelect={(hours, minutes) => handleTimeSelect(hours, minutes, "from")}
        onClose={() => setShowFromDropdown(false)}
        buttonRef={fromButtonRef}
      />

      <PickerDropdown
        visible={showTillDropdown}
        currentHours={tillHours}
        currentMinutes={tillMinutes}
        onSelect={(hours, minutes) => handleTimeSelect(hours, minutes, "till")}
        onClose={() => setShowTillDropdown(false)}
        buttonRef={tillButtonRef}
      />

      {breaks.map((breakTime, index) => {
        const breakFromRef = breakFromButtonRefs.current[index];
        const breakTillRef = breakTillButtonRefs.current[index];
        return (
          <React.Fragment key={index}>
            <PickerDropdown
              visible={showBreakFromDropdown === index}
              currentHours={breakTime.fromHours}
              currentMinutes={breakTime.fromMinutes}
              onSelect={(hours, minutes) =>
                handleTimeSelect(hours, minutes, "breakFrom", index)
              }
              onClose={() => setShowBreakFromDropdown(null)}
              buttonRef={breakFromRef ? { current: breakFromRef } : undefined}
            />
            <PickerDropdown
              visible={showBreakTillDropdown === index}
              currentHours={breakTime.tillHours}
              currentMinutes={breakTime.tillMinutes}
              onSelect={(hours, minutes) =>
                handleTimeSelect(hours, minutes, "breakTill", index)
              }
              onClose={() => setShowBreakTillDropdown(null)}
              buttonRef={breakTillRef ? { current: breakTillRef } : undefined}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
