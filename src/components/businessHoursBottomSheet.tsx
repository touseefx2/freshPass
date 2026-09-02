import React, { useMemo, useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import {
  setDayHours,
  setDayAvailability,
} from "@/src/state/slices/completeProfileSlice";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import PickerDropdown from "@/src/components/PickerDropdown";
import {
  DayHoursBounds,
  formatBoundsLabel,
  getDefaultHoursFromBounds,
  getTotalMinutes,
  isOvernightRange,
  isWindowWithinBounds,
} from "@/src/utils/businessHoursBounds";

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
    selectedDays?: string[],
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
  /**
   * When set (staff availability flows), time pickers are clamped to these
   * business hours and validation rejects windows outside them.
   * Omit for business-owned availability screens.
   */
  businessBounds?: DayHoursBounds | null;
  /** Days that may receive "copy hours" (business-open days). */
  allowedCopyDays?: string[];
}

interface BreakTime {
  fromHours: number;
  fromMinutes: number;
  tillHours: number;
  tillMinutes: number;
}

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
  businessBounds,
  allowedCopyDays,
}: BusinessHoursBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { businessHours } = useAppSelector((state) => state.completeProfile);

  const constrainToBusiness =
    !!businessBounds && businessBounds.isOpen === true;

  const defaultHours = getDefaultHoursFromBounds(
    constrainToBusiness ? businessBounds : null,
  );

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

  // Check if day has no hours set
  const hasNoHours =
    (dayData.fromHours === 0 &&
      dayData.fromMinutes === 0 &&
      dayData.tillHours === 0 &&
      dayData.tillMinutes === 0) ||
    (!dayData.fromHours && !dayData.tillHours);

  const [fromHours, setFromHours] = useState(
    hasNoHours ? defaultHours.fromHours : dayData.fromHours || 0,
  );
  const [fromMinutes, setFromMinutes] = useState(
    hasNoHours ? defaultHours.fromMinutes : dayData.fromMinutes || 0,
  );
  const [tillHours, setTillHours] = useState(
    hasNoHours ? defaultHours.tillHours : dayData.tillHours || 0,
  );
  const [tillMinutes, setTillMinutes] = useState(
    hasNoHours ? defaultHours.tillMinutes : dayData.tillMinutes || 0,
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
  const [openingHoursError, setOpeningHoursError] = useState<string | null>(
    null,
  );
  const [breakTimeError, setBreakTimeError] = useState<string | null>(null);

  // Refs for dropdown positioning
  const fromButtonRef = useRef<View>(null);
  const tillButtonRef = useRef<View>(null);
  const breakFromButtonRefs = useRef<{ [key: number]: View | null }>({});
  const breakTillButtonRefs = useRef<{ [key: number]: View | null }>({});

  const copyableDays = useMemo(() => {
    const otherDays = DAYS.filter((d) => d !== day);
    if (!allowedCopyDays || allowedCopyDays.length === 0) return otherDays;
    const allowed = new Set(allowedCopyDays);
    return otherDays.filter((d) => allowed.has(d));
  }, [allowedCopyDays, day]);

  useEffect(() => {
    if (visible && day) {
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

      const dayHasNoHours =
        (currentDayData.fromHours === 0 &&
          currentDayData.fromMinutes === 0 &&
          currentDayData.tillHours === 0 &&
          currentDayData.tillMinutes === 0) ||
        (!currentDayData.fromHours && !currentDayData.tillHours);

      const defaults = getDefaultHoursFromBounds(
        constrainToBusiness ? businessBounds : null,
      );

      let currentFromHours = 0;
      let currentFromMinutes = 0;
      let currentTillHours = 0;
      let currentTillMinutes = 0;

      if (dayHasNoHours) {
        currentFromHours = defaults.fromHours;
        currentFromMinutes = defaults.fromMinutes;
        currentTillHours = defaults.tillHours;
        currentTillMinutes = defaults.tillMinutes;
      } else {
        currentFromHours = currentDayData.fromHours || 0;
        currentFromMinutes = currentDayData.fromMinutes || 0;
        currentTillHours = currentDayData.tillHours || 0;
        currentTillMinutes = currentDayData.tillMinutes || 0;

        // Clamp existing values into business bounds when constraining
        if (constrainToBusiness && businessBounds) {
          const within = isWindowWithinBounds(
            currentFromHours,
            currentFromMinutes,
            currentTillHours,
            currentTillMinutes,
            businessBounds.fromHours,
            businessBounds.fromMinutes,
            businessBounds.tillHours,
            businessBounds.tillMinutes,
          );
          if (!within) {
            currentFromHours = businessBounds.fromHours;
            currentFromMinutes = businessBounds.fromMinutes;
            currentTillHours = businessBounds.tillHours;
            currentTillMinutes = businessBounds.tillMinutes;
          }
        }
      }

      setFromHours(currentFromHours);
      setFromMinutes(currentFromMinutes);
      setTillHours(currentTillHours);
      setTillMinutes(currentTillMinutes);

      // Auto-add at least 1 break time field if no breaks exist
      const existingBreaks = currentDayData.breaks || [];
      if (existingBreaks.length === 0) {
        const fromTotal = getTotalMinutes(currentFromHours, currentFromMinutes);
        const tillTotal = getTotalMinutes(currentTillHours, currentTillMinutes);
        const overnight = isOvernightRange(
          currentFromHours,
          currentFromMinutes,
          currentTillHours,
          currentTillMinutes,
        );
        const totalDuration = overnight
          ? 24 * 60 - fromTotal + tillTotal
          : tillTotal - fromTotal;

        if (totalDuration >= 120 && !overnight) {
          const middlePoint = fromTotal + Math.floor(totalDuration / 2);
          const breakStartMinutes = middlePoint - 30;
          const breakEndMinutes = middlePoint + 30;

          const adjustedBreakStart = Math.max(fromTotal, breakStartMinutes);
          const adjustedBreakEnd = Math.min(
            tillTotal,
            adjustedBreakStart + 60,
          );

          setBreaks([
            {
              fromHours: Math.floor(adjustedBreakStart / 60),
              fromMinutes: adjustedBreakStart % 60,
              tillHours: Math.floor(adjustedBreakEnd / 60),
              tillMinutes: adjustedBreakEnd % 60,
            },
          ]);
        } else {
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
      setOpeningHoursError(null);
      setBreakTimeError(null);
    }
  }, [visible, day, initialData, businessHours, businessBounds, constrainToBusiness]);

  const handleSave = () => {
    setOpeningHoursError(null);
    setBreakTimeError(null);

    const fromTotalMinutes = getTotalMinutes(fromHours, fromMinutes);
    const tillTotalMinutes = getTotalMinutes(tillHours, tillMinutes);
    const staffOvernight = isOvernightRange(
      fromHours,
      fromMinutes,
      tillHours,
      tillMinutes,
    );

    let hasError = false;

    const bothAreZero =
      fromHours === 0 &&
      fromMinutes === 0 &&
      tillHours === 0 &&
      tillMinutes === 0;

    if (bothAreZero) {
      setOpeningHoursError("Please select valid opening and closing times.");
      hasError = true;
    } else if (!staffOvernight && fromTotalMinutes >= tillTotalMinutes) {
      setOpeningHoursError("Opening time must be earlier than closing time.");
      hasError = true;
    } else if (
      constrainToBusiness &&
      businessBounds &&
      !isWindowWithinBounds(
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
        businessBounds.fromHours,
        businessBounds.fromMinutes,
        businessBounds.tillHours,
        businessBounds.tillMinutes,
      )
    ) {
      setOpeningHoursError(
        `Hours must stay within business open hours (${formatBoundsLabel(
          businessBounds.fromHours,
          businessBounds.fromMinutes,
          businessBounds.tillHours,
          businessBounds.tillMinutes,
        )}).`,
      );
      hasError = true;
    }

    const validBreaks = breaks.filter(
      (breakTime) =>
        breakTime.fromHours > 0 ||
        breakTime.fromMinutes > 0 ||
        breakTime.tillHours > 0 ||
        breakTime.tillMinutes > 0,
    );

    if (validBreaks.length > 0) {
      for (let i = 0; i < validBreaks.length; i++) {
        for (let j = i + 1; j < validBreaks.length; j++) {
          const break1From = getTotalMinutes(
            validBreaks[i].fromHours,
            validBreaks[i].fromMinutes,
          );
          const break1Till = getTotalMinutes(
            validBreaks[i].tillHours,
            validBreaks[i].tillMinutes,
          );
          const break2From = getTotalMinutes(
            validBreaks[j].fromHours,
            validBreaks[j].fromMinutes,
          );
          const break2Till = getTotalMinutes(
            validBreaks[j].tillHours,
            validBreaks[j].tillMinutes,
          );

          if (break1From === break2From && break1Till === break2Till) {
            setBreakTimeError(
              "Break times cannot be the same. Please set different break times.",
            );
            hasError = true;
            break;
          }
        }
        if (hasError) break;
      }

      if (!hasError) {
        const hasInvalidBreak = validBreaks.some((breakTime) => {
          const breakFrom = getTotalMinutes(
            breakTime.fromHours,
            breakTime.fromMinutes,
          );
          const breakTill = getTotalMinutes(
            breakTime.tillHours,
            breakTime.tillMinutes,
          );

          if (breakFrom >= breakTill) {
            return true;
          }

          if (
            !isWindowWithinBounds(
              breakTime.fromHours,
              breakTime.fromMinutes,
              breakTime.tillHours,
              breakTime.tillMinutes,
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
            )
          ) {
            return true;
          }

          return false;
        });

        if (hasInvalidBreak) {
          setBreakTimeError(
            "Break times must be valid (from < till) and within opening hours.",
          );
          hasError = true;
        }
      }
    }

    if (hasError) {
      return;
    }

    const daysToCopy = selectedDays.filter((d) =>
      copyableDays.includes(d),
    );

    if (onSave) {
      onSave(
        day,
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
        validBreaks,
        copyHoursEnabled,
        daysToCopy,
      );
    } else {
      dispatch(
        setDayHours({
          day,
          fromHours,
          fromMinutes,
          tillHours,
          tillMinutes,
          breaks: validBreaks,
        }),
      );

      if (copyHoursEnabled && daysToCopy.length > 0) {
        daysToCopy.forEach((selectedDay) => {
          dispatch(
            setDayHours({
              day: selectedDay,
              fromHours,
              fromMinutes,
              tillHours,
              tillMinutes,
              breaks: validBreaks,
            }),
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
    value: number,
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
    breakIndex?: number,
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
          <Text style={styles.sectionTitle}>Working hours</Text>
          <Text style={styles.sectionDescription}>
            {constrainToBusiness && businessBounds
              ? `Set hours for ${day}s within the business open window.`
              : `Set your business hours for ${day}s here. To edit hours for a specific date, use your calendar.`}
          </Text>
          {constrainToBusiness && businessBounds ? (
            <Text style={styles.sectionDescription}>
              Business open{" "}
              {formatBoundsLabel(
                businessBounds.fromHours,
                businessBounds.fromMinutes,
                businessBounds.tillHours,
                businessBounds.tillMinutes,
              )}
            </Text>
          ) : null}
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
                  size={iconScale(16)}
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
                  size={iconScale(16)}
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
                  {breakTime.fromHours !== undefined &&
                  breakTime.fromMinutes !== undefined ? (
                    <Text style={styles.dropdownText}>
                      {formatTime(breakTime.fromHours, breakTime.fromMinutes)}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>From</Text>
                  )}
                  <Feather
                    name="chevron-down"
                    size={iconScale(16)}
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
                  {breakTime.tillHours !== undefined &&
                  breakTime.tillMinutes !== undefined ? (
                    <Text style={styles.dropdownText}>
                      {formatTime(breakTime.tillHours, breakTime.tillMinutes)}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>Till</Text>
                  )}
                  <Feather
                    name="chevron-down"
                    size={iconScale(16)}
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
                size={iconScale(20)}
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
                    size={iconScale(14)}
                    color={theme.white}
                  />
                )}
              </View>
            </TouchableOpacity>
            <View style={{ gap: 3, width: "90%" }}>
              <Text style={styles.checkboxLabel}>Copy hours</Text>
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
                  selectedDays.length === copyableDays.length &&
                    copyableDays.length > 0 &&
                    styles.dayPillSelected,
                ]}
                onPress={() => {
                  if (selectedDays.length === copyableDays.length) {
                    setSelectedDays([]);
                  } else {
                    setSelectedDays([...copyableDays]);
                  }
                }}
              >
                {selectedDays.length === copyableDays.length &&
                  copyableDays.length > 0 && (
                    <Feather
                      name="check"
                      size={iconScale(14)}
                      color={theme.darkGreen}
                      style={{ marginRight: moderateWidthScale(4) }}
                    />
                  )}
                <Text style={[styles.dayPillText]}>All</Text>
              </TouchableOpacity>
              {copyableDays.map((dayName) => {
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
                        size={iconScale(14)}
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
        minHours={
          constrainToBusiness ? businessBounds!.fromHours : undefined
        }
        minMinutes={
          constrainToBusiness ? businessBounds!.fromMinutes : undefined
        }
        maxHours={
          constrainToBusiness ? businessBounds!.tillHours : undefined
        }
        maxMinutes={
          constrainToBusiness ? businessBounds!.tillMinutes : undefined
        }
      />

      <PickerDropdown
        visible={showTillDropdown}
        currentHours={tillHours}
        currentMinutes={tillMinutes}
        onSelect={(hours, minutes) => handleTimeSelect(hours, minutes, "till")}
        onClose={() => setShowTillDropdown(false)}
        buttonRef={tillButtonRef}
        minHours={
          constrainToBusiness ? businessBounds!.fromHours : undefined
        }
        minMinutes={
          constrainToBusiness ? businessBounds!.fromMinutes : undefined
        }
        maxHours={
          constrainToBusiness ? businessBounds!.tillHours : undefined
        }
        maxMinutes={
          constrainToBusiness ? businessBounds!.tillMinutes : undefined
        }
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
              minHours={fromHours}
              minMinutes={fromMinutes}
              maxHours={tillHours}
              maxMinutes={tillMinutes}
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
              minHours={fromHours}
              minMinutes={fromMinutes}
              maxHours={tillHours}
              maxMinutes={tillMinutes}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
