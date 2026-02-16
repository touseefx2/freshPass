import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialIcons, Feather, AntDesign } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FloatingInput from "@/src/components/floatingInput";
import Button from "@/src/components/button";
import ImagePickerModal from "@/src/components/imagePickerModal";
import CustomToggle from "@/src/components/customToggle";
import BusinessHoursBottomSheet from "@/src/components/businessHoursBottomSheet";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  validateEmail,
  validateName,
  validateDescription,
} from "@/src/services/validationService";
import {
  parsePhoneNumberFromString,
  getExampleNumber,
  AsYouType,
  CountryCode as PhoneCountryCode,
} from "libphonenumber-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const examples = require("libphonenumber-js/examples.mobile.json");
import {
  CountryPicker,
  CountryItem,
  Style as CountryPickerStyle,
} from "react-native-country-codes-picker";
import { CloseIcon } from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints, staffEndpoints } from "@/src/services/endpoints";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
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

const defaultDayData = (): DayData => ({
  isOpen: false,
  fromHours: 9,
  fromMinutes: 0,
  tillHours: 18,
  tillMinutes: 0,
  breaks: [],
});

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
  tillMinutes: number,
): string =>
  `${formatTime(fromHours, fromMinutes)} - ${formatTime(tillHours, tillMinutes)}`;

interface BusinessHoursData {
  business_hours: Array<{
    id: number;
    day: string;
    closed: boolean;
    opening_time: string | null;
    closing_time: string | null;
    break_hours: Array<{ start: string; end: string }>;
  }>;
}

const parseTimeToHoursMinutes = (
  timeString: string | null | undefined,
): { hours: number; minutes: number } => {
  if (!timeString || typeof timeString !== "string") {
    return { hours: 0, minutes: 0 };
  }
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

const getDayDisplayFormat = (day: string): string => {
  if (!day) return day;
  const lowerDay = day.toLowerCase();
  return (
    DAYS.find((d) => d.toLowerCase() === lowerDay) ||
    day.charAt(0).toUpperCase() + day.slice(1)
  );
};

const formatTimeToHHMM = (hours: number, minutes: number): string => {
  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m}`;
};

const getDayApiFormat = (day: string): string => day.toLowerCase();

const parseBusinessHoursFromAPI = (
  hoursArray: Array<{
    id: number;
    day: string;
    closed: boolean;
    opening_time: string | null;
    closing_time: string | null;
    break_hours: Array<{ start: string; end: string }>;
  }>,
): Record<string, DayData> => {
  const businessHours: Record<string, DayData> = {};
  DAYS.forEach((day) => {
    businessHours[day] = defaultDayData();
  });

  if (!hoursArray?.length) return businessHours;

  const dayMap = new Map<string, (typeof hoursArray)[0]>();
  hoursArray.forEach((dayData) => {
    const dayName = getDayDisplayFormat(dayData.day);
    if (DAYS.includes(dayName)) {
      const existing = dayMap.get(dayName);
      if (!existing || dayData.id > existing.id) {
        dayMap.set(dayName, dayData);
      }
    }
  });

  dayMap.forEach((dayData, dayName) => {
    let fromHours = 0,
      fromMinutes = 0,
      tillHours = 0,
      tillMinutes = 0;
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
      const from = parseTimeToHoursMinutes(breakTime.start || "00:00");
      const till = parseTimeToHoursMinutes(breakTime.end || "00:00");
      return {
        fromHours: from.hours,
        fromMinutes: from.minutes,
        tillHours: till.hours,
        tillMinutes: till.minutes,
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

const FALLBACK_PHONE_PLACEHOLDERS: Record<string, string> = {
  US: "2015550123",
  NG: "8031234567",
  GB: "7123456789",
  CA: "2045550133",
  IN: "9123456789",
  AU: "412345678",
  ZA: "731234567",
  PK: "3071234567",
};

const sanitizePlaceholder = (value: string) =>
  value
    .replace(/[^\d\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatNationalNumber = (
  countryIso: string,
  dialCode: string,
  nationalDigits: string,
) => {
  const dialDigits = dialCode.replace(/\D/g, "");
  const digits = nationalDigits.replace(/\D/g, "");

  if (!digits) return "";
  try {
    const formatter = new AsYouType(countryIso as PhoneCountryCode);
    const formatted = formatter.input(`+${dialDigits}${digits}`);
    const prefix = `+${dialDigits}`;
    if (formatted.startsWith(prefix)) {
      return formatted.slice(prefix.length).trimStart();
    }
    return formatted.replace(prefix, "").trimStart();
  } catch {
    return digits;
  }
};

const getPlaceholderForCountry = (countryIso: string, dialCode: string) => {
  try {
    const example = getExampleNumber(countryIso as PhoneCountryCode, examples);
    if (example) {
      const formatted = example.formatInternational();
      const prefix = `+${example.countryCallingCode} `;
      if (formatted.startsWith(prefix)) {
        return sanitizePlaceholder(formatted.slice(prefix.length));
      }
      return sanitizePlaceholder(
        formatted.replace(`+${example.countryCallingCode}`, ""),
      );
    }
  } catch {
    // ignore and fallback
  }
  const fallbackDigits = FALLBACK_PHONE_PLACEHOLDERS[countryIso] ?? "0000000";
  const formattedFallback = formatNationalNumber(
    countryIso,
    dialCode,
    fallbackDigits,
  );
  const sanitizedFallback =
    formattedFallback || sanitizePlaceholder(fallbackDigits);
  return sanitizePlaceholder(sanitizedFallback);
};

const getCountryIsoFromDialCode = (dialCode: string): string => {
  const dialCodeMap: Record<string, string> = {
    "+1": "US",
    "+44": "GB",
    "+234": "NG",
    "+91": "IN",
    "+61": "AU",
    "+27": "ZA",
    "+92": "PK",
    "+33": "FR",
    "+49": "DE",
    "+86": "CN",
    "+81": "JP",
    "+7": "RU",
    "+55": "BR",
    "+52": "MX",
    "+39": "IT",
    "+34": "ES",
    "+31": "NL",
    "+32": "BE",
    "+41": "CH",
    "+46": "SE",
    "+47": "NO",
    "+45": "DK",
    "+358": "FI",
    "+353": "IE",
    "+351": "PT",
    "+30": "GR",
    "+48": "PL",
    "+420": "CZ",
    "+36": "HU",
    "+40": "RO",
    "+359": "BG",
    "+385": "HR",
    "+386": "SI",
    "+421": "SK",
    "+370": "LT",
    "+371": "LV",
    "+372": "EE",
  };
  return dialCodeMap[dialCode] || "US";
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
      paddingBottom: moderateHeightScale(100),
    },
    titleSec: {
      marginBottom: moderateHeightScale(20),
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
    subtitleBold: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    inputSection: {
      marginBottom: moderateHeightScale(20),
    },
    hint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
    label: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    phoneField: {
      gap: moderateHeightScale(2),
      marginBottom: moderateHeightScale(20),
    },
    phoneFieldContainer: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      gap: moderateHeightScale(2),
    },
    inputLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    phoneInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    segmentWrapper: {
      flex: 1,
      position: "relative",
      justifyContent: "center",
    },
    segInputWrapper: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(3),
    },
    digitContainer: {
      minWidth: moderateWidthScale(13),
      alignItems: "center",
      justifyContent: "flex-end",
    },
    digitChar: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
    },
    digitCharPlaceholder: {
      color: theme.lightGreen2,
    },
    digitCharFilled: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    digitGuideline: {
      width: "100%",
      backgroundColor: "transparent",
    },
    digitGuidelineFilled: {
      backgroundColor: "transparent",
    },
    groupSpacer: {
      width: moderateWidthScale(4),
    },
    hiddenInput: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
      paddingVertical: 0,
      paddingHorizontal: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
      letterSpacing: moderateWidthScale(7),
    },
    countrySelector: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      minHeight: moderateHeightScale(44),
      justifyContent: "center",
    },
    countryCodeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
      gap: moderateWidthScale(15),
    },
    profileImageContainer: {
      width: widthScale(90),
      height: widthScale(90),
      borderRadius: widthScale(45),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    profileImage: {
      width: "100%",
      height: "100%",
    },
    uploadButton: {
      backgroundColor: theme.orangeBrown,
      borderWidth: 2,
      borderColor: theme.darkGreen,
      borderRadius: 9999,
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    uploadButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    textArea: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: moderateHeightScale(100),
      textAlignVertical: "top",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(20),
    },
    toggleTitle: {
      flex: 1,
      marginLeft: moderateWidthScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sectionTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
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
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
    },
    footerRow: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(30),
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
  });

type AddStaffParams = {
  id?: string;
  name?: string;
  email?: string;
  description?: string;
  profile_image_url?: string;
  active?: string;
  working_hours?: string;
  invitation_token?: string | null;
};

export default function AddStaffScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<AddStaffParams>();
  const { showBanner } = useNotificationContext();
  const businessName =
    useAppSelector((state) => state.user.business_name) || "";
  const userRole = useAppSelector((state) => state.user.userRole);

  const isEditMode = !!params.id;
  const headerTitle = isEditMode ? "Edit Staff" : "New Staff Member";

  const rawToken = params.invitation_token;
  const invitationToken =
    rawToken == null
      ? undefined
      : Array.isArray(rawToken)
        ? rawToken[0]
        : rawToken;
  const hasPendingInvitation = !!(
    invitationToken && invitationToken !== "" && invitationToken !== "null"
  );

  const handleActiveToggle = useCallback(
    (value: boolean) => {
      if (value && hasPendingInvitation) {
        showBanner(
          "Cannot activate yet",
          "You can turn this on only after the staff accepts the invitation. This is for online/offline status.",
          "error",
          3000,
        );
        return;
      }
      setIsActive(value);
    },
    [showBanner, hasPendingInvitation],
  );

  const [staffEmail, setStaffEmail] = useState("");
  const [name, setName] = useState("");
  const initialCountryCode = "+1";
  const initialCountryIso = getCountryIsoFromDialCode(initialCountryCode);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [countryIso, setCountryIso] = useState(initialCountryIso);
  const [phonePlaceholder, setPhonePlaceholder] = useState(
    getPlaceholderForCountry(initialCountryIso, initialCountryCode),
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneIsValid, setPhoneIsValid] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const previousDigitCountRef = useRef(0);
  const isSettingCursorRef = useRef(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [businessHours, setBusinessHours] = useState<Record<string, DayData>>(
    () => {
      const init: Record<string, DayData> = {};
      DAYS.forEach((day) => {
        init[day] = defaultDayData();
      });
      return init;
    },
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [salonBusinessHours, setSalonBusinessHours] = useState<Record<
    string,
    DayData
  > | null>(null);
  const [copySalonHours, setCopySalonHours] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousBusinessHoursRef = useRef<Record<string, DayData> | null>(null);

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: BusinessHoursData;
      }>(businessEndpoints.moduleData("availability"));

      if (response.success && response.data?.business_hours) {
        const parsed = parseBusinessHoursFromAPI(response.data.business_hours);
        setSalonBusinessHours(parsed);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch availability:", error);
      showBanner(
        "Error",
        error.message || "Failed to fetch business hours. Please try again.",
        "error",
        3000,
      );
    }
  }, [showBanner]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    if (!params.id) return;
    if (params.name != null) setName(params.name);
    if (params.email != null) setStaffEmail(params.email);
    if (params.description != null) setDescription(params.description);
    if (params.profile_image_url != null && params.profile_image_url !== "")
      setProfileImageUri(params.profile_image_url);
    if (params.active != null) setIsActive(params.active === "1");
    if (params.working_hours != null && params.working_hours !== "") {
      try {
        const hoursArray = JSON.parse(params.working_hours) as Array<{
          id: number;
          day: string;
          closed: boolean;
          opening_time: string | null;
          closing_time: string | null;
          break_hours: Array<{ start: string; end: string }>;
        }>;
        if (Array.isArray(hoursArray) && hoursArray.length > 0) {
          const parsed = parseBusinessHoursFromAPI(hoursArray);
          setBusinessHours(parsed);
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, [params.id]);

  useEffect(() => {
    setPhonePlaceholder(getPlaceholderForCountry(countryIso, countryCode));
  }, [countryCode, countryIso]);

  const maxDigits = useMemo(
    () => phonePlaceholder.replace(/\s+/g, "").length,
    [phonePlaceholder],
  );

  const formattedPhoneValue = useMemo(() => {
    if (!phoneNumber) return "";
    const digits = phoneNumber.replace(/\D/g, "");
    const groups = phonePlaceholder.split(" ").filter(Boolean);
    let result = "";
    let digitIndex = 0;
    for (let i = 0; i < groups.length && digitIndex < digits.length; i++) {
      if (i > 0) result += " ";
      const groupLength = groups[i].length;
      result += digits.slice(digitIndex, digitIndex + groupLength);
      digitIndex += groupLength;
    }
    return result;
  }, [phoneNumber, phonePlaceholder]);

  const segmentNodes = useMemo(() => {
    let cursor = 0;
    const groups = phonePlaceholder.split(" ").filter(Boolean);
    return groups.map((group, groupIdx) => (
      <React.Fragment key={`group-${groupIdx}`}>
        {groupIdx > 0 && <View style={styles.groupSpacer} />}
        {group.split("").map((digit, digitIdx) => {
          const filledDigit = phoneNumber[cursor] ?? "";
          const isFilled = filledDigit !== "";
          const displayChar = isFilled ? filledDigit : digit;
          const key = `digit-${groupIdx}-${digitIdx}`;
          cursor += 1;
          return (
            <View key={key} style={styles.digitContainer}>
              <Text
                style={[
                  styles.digitChar,
                  isFilled
                    ? styles.digitCharFilled
                    : styles.digitCharPlaceholder,
                ]}
              >
                {displayChar}
              </Text>
              <View
                style={[
                  styles.digitGuideline,
                  isFilled && styles.digitGuidelineFilled,
                ]}
              />
            </View>
          );
        })}
      </React.Fragment>
    ));
  }, [phonePlaceholder, phoneNumber, styles]);

  useEffect(() => {
    if (copySalonHours && salonBusinessHours) {
      previousBusinessHoursRef.current = JSON.parse(
        JSON.stringify(businessHours),
      );
      setBusinessHours((prev) => {
        const updated = { ...prev };
        Object.keys(salonBusinessHours).forEach((day) => {
          const salonDay = salonBusinessHours[day];
          updated[day] = {
            isOpen: salonDay.isOpen,
            fromHours: salonDay.fromHours,
            fromMinutes: salonDay.fromMinutes,
            tillHours: salonDay.tillHours,
            tillMinutes: salonDay.tillMinutes,
            breaks: salonDay.breaks ? [...salonDay.breaks] : [],
          };
        });
        return updated;
      });
    } else if (!copySalonHours && previousBusinessHoursRef.current) {
      setBusinessHours(
        JSON.parse(JSON.stringify(previousBusinessHoursRef.current)),
      );
      previousBusinessHoursRef.current = null;
    }
  }, [copySalonHours]);

  const handleCountrySelect = useCallback((country: CountryItem) => {
    setCountryCode(country.dial_code);
    setCountryIso(country.code);
    setPhonePlaceholder(
      getPlaceholderForCountry(country.code, country.dial_code),
    );
    setPhoneNumber("");
    setPhoneIsValid(false);
    previousDigitCountRef.current = 0;
    setPickerVisible(false);
  }, []);

  const handlePhoneChange = useCallback(
    (value: string) => {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      const limitedDigits = digitsOnly.slice(0, maxDigits);
      const dialDigits = countryCode.replace(/\D/g, "");
      let isValid = false;
      let parsedDigits = limitedDigits;

      if (limitedDigits.length > 0 && dialDigits.length > 0) {
        try {
          const parsed = parsePhoneNumberFromString(
            `+${dialDigits}${limitedDigits}`,
            countryIso as PhoneCountryCode,
          );
          isValid = parsed?.isValid() ?? false;
          parsedDigits = parsed?.nationalNumber?.toString() ?? limitedDigits;
        } catch {
          isValid = false;
        }
      }

      const isTyping = parsedDigits.length > previousDigitCountRef.current;
      previousDigitCountRef.current = parsedDigits.length;

      setPhoneNumber(parsedDigits);
      setPhoneIsValid(isValid);

      const groups = phonePlaceholder.split(" ").filter(Boolean);
      let newFormatted = "";
      let digitIndex = 0;
      for (
        let i = 0;
        i < groups.length && digitIndex < parsedDigits.length;
        i++
      ) {
        if (i > 0) newFormatted += " ";
        const groupLength = groups[i].length;
        newFormatted += parsedDigits.slice(
          digitIndex,
          digitIndex + groupLength,
        );
        digitIndex += groupLength;
      }

      if (isTyping) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (phoneInputRef.current) {
              const endPosition = newFormatted.length;
              isSettingCursorRef.current = true;
              setSelection({ start: endPosition, end: endPosition });
              phoneInputRef.current.setNativeProps({
                selection: { start: endPosition, end: endPosition },
              });
              setTimeout(() => {
                isSettingCursorRef.current = false;
              }, 50);
            }
          }, 10);
        });
      }
    },
    [countryCode, countryIso, maxDigits, phonePlaceholder],
  );

  const handleSelectionChange = useCallback((event: any) => {
    if (isSettingCursorRef.current) return;
    setSelection({
      start: event.nativeEvent.selection.start,
      end: event.nativeEvent.selection.end,
    });
  }, []);

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
    selectedDays?: string[],
  ) => {
    setBusinessHours((prev) => {
      const updated = { ...prev };
      const dayData = {
        isOpen: true,
        fromHours,
        fromMinutes,
        tillHours,
        tillMinutes,
        breaks,
      };
      updated[day] = dayData;
      if (copyHoursEnabled && selectedDays?.length) {
        selectedDays.forEach((d) => {
          if (d !== day) updated[d] = dayData;
        });
      }
      return updated;
    });
    handleCloseBottomSheet();
  };

  const getDayDisplayText = (day: string): string | React.ReactNode => {
    const dayData = businessHours[day];
    if (!dayData?.isOpen) return "Closed";
    if (!dayData.fromHours && !dayData.tillHours) return "---";
    const mainHours = formatTimeRange(
      dayData.fromHours,
      dayData.fromMinutes,
      dayData.tillHours,
      dayData.tillMinutes,
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
                breakTime.tillMinutes,
              )}
            </Text>
          ))}
        </View>
      );
    }
    return mainHours;
  };

  const handleToggleDay = (day: string, value: boolean) => {
    const dayData = businessHours[day];
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || defaultDayData()),
        isOpen: value,
      },
    }));
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
  };

  const pickerStyles = useMemo<CountryPickerStyle>(
    () => ({
      modal: {
        backgroundColor: theme.background,
        borderTopLeftRadius: moderateWidthScale(24),
        borderTopRightRadius: moderateWidthScale(24),
        paddingHorizontal: moderateWidthScale(20),
        paddingTop: moderateHeightScale(20),
        paddingBottom: moderateHeightScale(16) + insets.bottom,
        gap: moderateHeightScale(16),
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
        height: Dimensions.get("window").height / 1.5,
      },
      textInput: {
        borderRadius: moderateWidthScale(999),
        borderWidth: 1,
        borderColor: theme.borderLight,
        paddingHorizontal: moderateWidthScale(16),
        fontSize: fontSize.size16,
        fontFamily: fonts.fontRegular,
        color: theme.darkGreen,
        backgroundColor: theme.white,
        flex: 1,
      },
      line: {
        backgroundColor: theme.borderLight,
      },
      itemsList: {
        paddingBottom: moderateHeightScale(12),
      },
      countryButtonStyles: {
        paddingVertical: moderateHeightScale(12),
        borderBottomWidth: 1,
        borderBottomColor: theme.borderLight,
        backgroundColor: theme.background,
      },
      dialCode: {
        fontSize: fontSize.size16,
        fontFamily: fonts.fontRegular,
        color: theme.darkGreen,
      },
      countryName: {
        fontSize: fontSize.size16,
        fontFamily: fonts.fontRegular,
        color: theme.darkGreen,
      },
      backdrop: {
        backgroundColor: "rgba(0, 0, 0, 0.6)",
      },
    }),
    [theme, insets.bottom],
  );

  const isPhoneInvalid = phoneNumber.length > 0 && !phoneIsValid;

  const formErrors = useMemo(() => {
    const e: {
      email?: string;
      name?: string;
      phone?: string;
      description?: string;
    } = {};
    const emailRes = validateEmail(staffEmail.trim());
    if (!staffEmail.trim()) {
      e.email = "Staff email is required";
    } else if (emailRes.error) {
      e.email = emailRes.error;
    }
    if (name.trim()) {
      const nameRes = validateName(name.trim(), "Name");
      if (nameRes.error) e.name = nameRes.error;
    }
    if (phoneNumber.length > 0 && !phoneIsValid) {
      e.phone = "Enter a valid phone number";
    }
    if (description.trim().length > 0) {
      const descRes = validateDescription(description);
      if (descRes.error) e.description = descRes.error;
    }
    return e;
  }, [staffEmail, name, phoneNumber, phoneIsValid, description]);

  const isFormValid =
    !formErrors.email &&
    !formErrors.name &&
    !formErrors.phone &&
    !formErrors.description;

  const buildWorkingHoursArray = useCallback(() => {
    return DAYS.map((day) => {
      const dayData = businessHours[day];
      const breakHours = (dayData?.breaks || []).map((br) => ({
        start: formatTimeToHHMM(br.fromHours, br.fromMinutes),
        end: formatTimeToHHMM(br.tillHours, br.tillMinutes),
      }));
      return {
        day: getDayApiFormat(day),
        closed: !(dayData?.isOpen ?? false),
        opening_time: formatTimeToHHMM(
          dayData?.fromHours ?? 0,
          dayData?.fromMinutes ?? 0,
        ),
        closing_time: formatTimeToHHMM(
          dayData?.tillHours ?? 0,
          dayData?.tillMinutes ?? 0,
        ),
        break_hours: breakHours,
      };
    });
  }, [businessHours]);

  const handleCreate = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        const formData = new FormData();
        if (userRole === "business" && params.id) {
          formData.append("staff_id", params.id);
        }
        formData.append("name", name.trim());
        formData.append("description", description.trim());
        formData.append(
          "working_hours",
          JSON.stringify(buildWorkingHoursArray()),
        );
        if (profileImageUri) {
          const isLocalUri =
            profileImageUri.startsWith("file://") ||
            profileImageUri.startsWith("content://") ||
            !profileImageUri.startsWith("http");
          if (isLocalUri) {
            const fileExtension =
              profileImageUri.split(".").pop()?.toLowerCase() || "jpg";
            const fileName = `profile_image.${fileExtension}`;
            const mimeType =
              fileExtension === "jpg" || fileExtension === "jpeg"
                ? "image/jpeg"
                : fileExtension === "png"
                  ? "image/png"
                  : fileExtension === "webp"
                    ? "image/webp"
                    : "image/jpeg";
            formData.append("profile_image", {
              uri: profileImageUri,
              type: mimeType,
              name: fileName,
            } as any);
          }
        } else if (params.profile_image_url) {
          formData.append("remove_image", "true");
        }
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
          data?: any;
        }>(staffEndpoints.profile, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response?.success) {
          showBanner(
            "Success",
            "Staff details updated successfully.",
            "success",
            3000,
          );
          router.back();
        } else {
          showBanner(
            "Error",
            (response as any)?.message ||
              "Failed to update staff. Please try again.",
            "error",
            3000,
          );
        }
      } else {
        const formData = new FormData();
        formData.append("email", staffEmail.trim());
        formData.append("name", name.trim());
        formData.append("country_code", countryCode || "");
        formData.append("phone", phoneNumber.replace(/\D/g, ""));
        formData.append("description", description.trim());
        formData.append("is_onboarded", "true");
        formData.append(
          "working_hours",
          JSON.stringify(buildWorkingHoursArray()),
        );
        if (profileImageUri) {
          const fileExtension =
            profileImageUri.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `profile_image.${fileExtension}`;
          const mimeType =
            fileExtension === "jpg" || fileExtension === "jpeg"
              ? "image/jpeg"
              : fileExtension === "png"
                ? "image/png"
                : fileExtension === "webp"
                  ? "image/webp"
                  : "image/jpeg";
          formData.append("profile_image", {
            uri: profileImageUri,
            type: mimeType,
            name: fileName,
          } as any);
        }
        const response = await ApiService.post<{
          success: boolean;
          message?: string;
          data?: any;
        }>(staffEndpoints.invite, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response?.success) {
          showBanner(
            "Success",
            "Staff invitation sent successfully.",
            "success",
            3000,
          );
          router.back();
        } else {
          showBanner(
            "Error",
            (response as any)?.message ||
              "Failed to invite staff. Please try again.",
            "error",
            3000,
          );
        }
      }
    } catch (error: any) {
      Logger.error(
        isEditMode ? "Staff update error:" : "Staff invite error:",
        error,
      );
      showBanner(
        "Error",
        error?.message ||
          (isEditMode
            ? "Failed to update staff. Please try again."
            : "Failed to invite staff. Please try again."),
        "error",
        3000,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid,
    isSubmitting,
    isEditMode,
    userRole,
    params.id,
    params.profile_image_url,
    staffEmail,
    name,
    countryCode,
    phoneNumber,
    description,
    businessHours,
    profileImageUri,
    buildWorkingHoursArray,
    showBanner,
  ]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={headerTitle} />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!isEditMode && (
          <View style={styles.titleSec}>
            <Text style={styles.title}>New Staff Member</Text>
            <Text style={styles.subtitle}>
              Add a new staff member to your business
              {businessName ? (
                <Text style={styles.subtitleBold}> {businessName}. </Text>
              ) : (
                ". "
              )}
              They will receive an invitation to join.
            </Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.label}>Profile picture</Text>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    {
                      backgroundColor: theme.emptyProfileImage,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={moderateWidthScale(48)}
                    color={theme.lightGreen2}
                  />
                </View>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowImagePickerModal(true)}
              style={styles.uploadButton}
            >
              <Feather
                name="upload"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.uploadButtonText}>Choose file</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isEditMode && (
          <View style={styles.inputSection}>
            <FloatingInput
              editable={!isEditMode}
              label="Staff Email"
              value={staffEmail}
              onChangeText={setStaffEmail}
              placeholder="Enter staff member email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              A user account will be created with the staff role for this email.
            </Text>
            {formErrors.email ? (
              <Text style={styles.errorText}>{formErrors.email}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.inputSection}>
          <FloatingInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Staff member name"
            autoCapitalize="words"
          />
          {formErrors.name ? (
            <Text style={styles.errorText}>{formErrors.name}</Text>
          ) : null}
        </View>

        <View style={styles.phoneField}>
          <View style={styles.phoneFieldContainer}>
            <Text style={styles.inputLabel}>Phone number</Text>
            <View style={styles.phoneInputContainer}>
              <Pressable
                onPress={() => setPickerVisible(true)}
                style={styles.countrySelector}
                hitSlop={{
                  top: moderateHeightScale(16),
                  bottom: moderateHeightScale(16),
                  left: moderateWidthScale(16),
                  right: moderateWidthScale(16),
                }}
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <AntDesign
                  name="caret-down"
                  size={moderateWidthScale(12)}
                  color={theme.darkGreen}
                />
              </Pressable>
              <View style={styles.segmentWrapper}>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.hiddenInput}
                  value={formattedPhoneValue}
                  onChangeText={handlePhoneChange}
                  onSelectionChange={handleSelectionChange}
                  selection={selection}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  maxLength={phonePlaceholder.length}
                  showSoftInputOnFocus
                  caretHidden={false}
                />
                <View style={styles.segInputWrapper} pointerEvents="none">
                  {segmentNodes}
                </View>
              </View>
              {!!phoneNumber && (
                <Pressable
                  onPress={() => {
                    previousDigitCountRef.current = 0;
                    setPhoneNumber("");
                    setPhoneIsValid(false);
                  }}
                  hitSlop={moderateWidthScale(10)}
                >
                  <CloseIcon color={theme.darkGreen} />
                </Pressable>
              )}
            </View>
          </View>
          {formErrors.phone ? (
            <Text style={styles.errorText}>{formErrors.phone}</Text>
          ) : null}
          <CountryPicker
            show={pickerVisible}
            pickerButtonOnPress={handleCountrySelect}
            onBackdropPress={() => setPickerVisible(false)}
            onRequestClose={() => setPickerVisible(false)}
            inputPlaceholder="Search country"
            inputPlaceholderTextColor={theme.lightGreen2}
            searchMessage="No country found"
            style={pickerStyles}
            popularCountries={["US", "NG", "GB", "CA", "PK", "IN"]}
            enableModalAvoiding
            lang="en"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter a description for the staff member"
            placeholderTextColor={theme.lightGreen2}
            multiline
            numberOfLines={4}
          />
          {formErrors.description ? (
            <Text style={styles.errorText}>{formErrors.description}</Text>
          ) : null}
        </View>

        <View style={styles.toggleRow}>
          <CustomToggle value={isActive} onValueChange={handleActiveToggle} />
          <Text style={styles.toggleTitle}>Active</Text>
        </View>

        <Text style={styles.sectionTitle}>Working hours</Text>

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
                activeOpacity={0.7}
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
                  Copy business hours
                  {businessName ? ` (${businessName})` : ""}
                </Text>
                <Text style={styles.sectionDescription}>
                  Use the same working hours as your business for this staff
                  member.
                </Text>
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      <View style={styles.footerRow}>
        <Button
          title={
            isSubmitting
              ? isEditMode
                ? "Updating…"
                : "Creating…"
              : isEditMode
                ? "Update"
                : "Create"
          }
          onPress={handleCreate}
          disabled={!isFormValid || isSubmitting}
        />
      </View>

      {selectedDay && (
        <BusinessHoursBottomSheet
          visible={bottomSheetVisible}
          onClose={handleCloseBottomSheet}
          day={selectedDay}
          onSave={handleBottomSheetSave}
          initialData={
            businessHours[selectedDay]
              ? {
                  isOpen: businessHours[selectedDay].isOpen,
                  fromHours: businessHours[selectedDay].fromHours,
                  fromMinutes: businessHours[selectedDay].fromMinutes,
                  tillHours: businessHours[selectedDay].tillHours,
                  tillMinutes: businessHours[selectedDay].tillMinutes,
                  breaks: businessHours[selectedDay].breaks,
                }
              : undefined
          }
        />
      )}

      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={(uri) => {
          setProfileImageUri(uri);
          setShowImagePickerModal(false);
        }}
      />
    </SafeAreaView>
  );
}
