import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  heightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import DatePickerModal from "@/src/components/datePickerModal";
import TimePickerModal from "@/src/components/timePickerModal";
import Button from "@/src/components/button";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(40),
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(20),
    },
    fieldLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(8),
    },
    dropdownInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(16),
    },
    dropdownInputText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    dropdownOptions: {
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(8),
      marginTop: moderateHeightScale(-8),
      marginBottom: moderateHeightScale(16),
      overflow: "hidden",
    },
    dropdownOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      backgroundColor: theme.background,
    },
    reasonInput: {
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      minHeight: heightScale(80),
      textAlignVertical: "top",
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(16),
    },
    timeRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(16),
    },
    timeInputHalf: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLine,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    timeInputText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    applyButton: {
      marginTop: moderateHeightScale(8),
    },
  });

export default function ApplyLeave() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    type?: string;
    date?: string;
    slotStartHour?: string;
    slotEndHour?: string;
  }>();

  const today = dayjs();
  const initialDate = params.date
    ? dayjs(params.date, "YYYY-MM-DD").isValid()
      ? dayjs(params.date)
      : today
    : today;
  const initialType = (params.type === "break" ? "break" : "leave") as
    | "leave"
    | "break";
  const initialSlotStart = params.slotStartHour
    ? parseInt(params.slotStartHour, 10)
    : 9;
  const initialSlotEnd = params.slotEndHour
    ? parseInt(params.slotEndHour, 10)
    : 17;

  const [fromDate, setFromDate] = useState(initialDate);
  const [toDate, setToDate] = useState(initialDate);
  const [leaveBreakType, setLeaveBreakType] = useState<"leave" | "break">(
    initialType,
  );
  const [breakStartHours, setBreakStartHours] = useState(initialSlotStart);
  const [breakStartMinutes, setBreakStartMinutes] = useState(0);
  const [breakEndHours, setBreakEndHours] = useState(initialSlotEnd);
  const [breakEndMinutes, setBreakEndMinutes] = useState(0);
  const [reason, setReason] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"from" | "to">(
    "from",
  );
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<
    "start" | "end" | null
  >(null);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    const date = params.date
      ? dayjs(params.date, "YYYY-MM-DD").isValid()
        ? dayjs(params.date)
        : today
      : today;
    const type = (params.type === "break" ? "break" : "leave") as
      | "leave"
      | "break";
    const startH = params.slotStartHour
      ? parseInt(params.slotStartHour, 10)
      : 9;
    const endH = params.slotEndHour ? parseInt(params.slotEndHour, 10) : 17;
    setFromDate(date);
    setToDate(date);
    setLeaveBreakType(type);
    setBreakStartHours(startH);
    setBreakEndHours(endH);
  }, [params.type, params.date, params.slotStartHour, params.slotEndHour]);

  const formatTimeDisplay = (hours: number, minutes: number) => {
    const period = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    if (datePickerTarget === "from") {
      setFromDate(date);
    } else {
      setToDate(date);
    }
    setDatePickerVisible(false);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    if (timePickerTarget === "start") {
      setBreakStartHours(hours);
      setBreakStartMinutes(minutes);
    } else if (timePickerTarget === "end") {
      setBreakEndHours(hours);
      setBreakEndMinutes(minutes);
    }
    setTimePickerVisible(false);
    setTimePickerTarget(null);
  };

  const applyLeaveBreak = async () => {
    setApplyLoading(true);
    try {
      const reasonPayload = reason.trim() || undefined;
      if (leaveBreakType === "leave") {
        const startTime = fromDate.startOf("day").format("YYYY-MM-DD HH:mm:ss");
        const endTime = toDate.endOf("day").format("YYYY-MM-DD HH:mm:ss");
        const body = {
          start_time: startTime,
          end_time: endTime,
          type: "leave",
          ...(reasonPayload && { reason: reasonPayload }),
        };
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
        }>(staffEndpoints.leaves, body);
        if (response.success) {
          showBanner(
            t("success") || "Success",
            response.message || "Leave applied.",
            "success",
            2500,
          );
          router.back();
        } else {
          showBanner(
            t("apiFailed") || "Error",
            (response as { message?: string }).message ||
              "Failed to apply leave.",
            "error",
            2500,
          );
        }
      } else {
        const startTime = fromDate
          .hour(breakStartHours)
          .minute(breakStartMinutes)
          .second(0)
          .format("YYYY-MM-DD HH:mm:ss");
        const endTime = fromDate
          .hour(breakEndHours)
          .minute(breakEndMinutes)
          .second(0)
          .format("YYYY-MM-DD HH:mm:ss");
        const body = {
          start_time: startTime,
          end_time: endTime,
          type: "break",
          ...(reasonPayload && { reason: reasonPayload }),
        };
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
        }>(staffEndpoints.leaves, body);
        if (response.success) {
          showBanner(
            t("success") || "Success",
            response.message || "Break applied.",
            "success",
            2500,
          );
          router.back();
        } else {
          showBanner(
            t("apiFailed") || "Error",
            (response as { message?: string }).message ||
              "Failed to apply break.",
            "error",
            2500,
          );
        }
      }
    } catch (error: unknown) {
      showBanner(
        t("apiFailed") || "Error",
        (error as { message?: string })?.message || "Something went wrong.",
        "error",
        2500,
      );
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StackHeader title="Apply for Leave / Break" />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Select dates and times for your leave or break.
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: moderateWidthScale(12),
            marginBottom: moderateHeightScale(8),
          }}
        >
          <Text style={[styles.fieldLabel, { flex: 1 }]}>From Date</Text>
          <Text style={[styles.fieldLabel, { flex: 1 }]}>To Date</Text>
        </View>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeInputHalf}
            onPress={() => {
              setDatePickerTarget("from");
              setDatePickerVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.timeInputText}>
              {fromDate.format("DD/MM/YYYY")}
            </Text>
            <Feather
              name="calendar"
              size={moderateWidthScale(18)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeInputHalf}
            onPress={() => {
              setDatePickerTarget("to");
              setDatePickerVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.timeInputText}>
              {toDate.format("DD/MM/YYYY")}
            </Text>
            <Feather
              name="calendar"
              size={moderateWidthScale(18)}
              color={theme.lightGreen}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Type</Text>
        <TouchableOpacity
          style={styles.dropdownInput}
          onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.dropdownInputText}>
            {leaveBreakType === "leave" ? "Leave" : "Break"}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={moderateWidthScale(22)}
            color={theme.text}
          />
        </TouchableOpacity>
        {typeDropdownOpen && (
          <View style={styles.dropdownOptions}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => {
                setLeaveBreakType("leave");
                setTypeDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownInputText}>Leave</Text>
              {leaveBreakType === "leave" && (
                <Feather
                  name="check"
                  size={moderateWidthScale(18)}
                  color={theme.primary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => {
                setLeaveBreakType("break");
                setTypeDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownInputText}>Break</Text>
              {leaveBreakType === "break" && (
                <Feather
                  name="check"
                  size={moderateWidthScale(18)}
                  color={theme.primary}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {leaveBreakType === "break" && (
          <View style={{ marginBottom: moderateHeightScale(16) }}>
            <View
              style={{
                flexDirection: "row",
                gap: moderateWidthScale(12),
                marginBottom: moderateHeightScale(8),
              }}
            >
              <Text style={[styles.fieldLabel, { flex: 1 }]}>Start Time</Text>
              <Text style={[styles.fieldLabel, { flex: 1 }]}>End Time</Text>
            </View>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeInputHalf}
                onPress={() => {
                  setTimePickerTarget("start");
                  setTimePickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.timeInputText}>
                  {formatTimeDisplay(breakStartHours, breakStartMinutes)}
                </Text>
                <Feather
                  name="clock"
                  size={moderateWidthScale(18)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeInputHalf}
                onPress={() => {
                  setTimePickerTarget("end");
                  setTimePickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.timeInputText}>
                  {formatTimeDisplay(breakEndHours, breakEndMinutes)}
                </Text>
                <Feather
                  name="clock"
                  size={moderateWidthScale(18)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.fieldLabel}>Reason (Optional)</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="e.g. Doctor appointment, Vacation"
          placeholderTextColor={theme.lightGreen}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        <Button
          title="Apply"
          onPress={applyLeaveBreak}
          loading={applyLoading}
          containerStyle={styles.applyButton}
        />
      </KeyboardAwareScrollView>

      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={datePickerTarget === "from" ? fromDate : toDate}
        onDateSelect={handleDateSelect}
      />

      <TimePickerModal
        visible={timePickerVisible}
        currentHours={
          timePickerTarget === "start" ? breakStartHours : breakEndHours
        }
        currentMinutes={
          timePickerTarget === "start" ? breakStartMinutes : breakEndMinutes
        }
        onSelect={handleTimeSelect}
        onClose={() => {
          setTimePickerVisible(false);
          setTimePickerTarget(null);
        }}
      />
    </View>
  );
}
