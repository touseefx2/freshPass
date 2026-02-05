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
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Pressable,
  Dimensions,
} from "react-native";
import { AntDesign, MaterialIcons, Feather } from "@expo/vector-icons";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { staffEndpoints, userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
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
import DatePickerDropdown from "@/src/components/DatePickerDropdown";
import {
  validateDescription,
  validateEmail,
  validateName,
} from "@/src/services/validationService";
import { CloseIcon } from "@/assets/icons";
import {
  CountryCode as PhoneCountryCode,
  getExampleNumber,
  AsYouType,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const examples = require("libphonenumber-js/examples.mobile.json");
import {
  CountryPicker,
  CountryItem,
  Style as CountryPickerStyle,
} from "react-native-country-codes-picker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

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
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(40),
      gap: 15,
    },
    profileImageContainer: {
      width: widthScale(90),
      height: widthScale(90),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    uploadSection: {
      flex: 1,
      justifyContent: "space-between",
      gap: 10,
    },
    uploadText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    uploadButton: {
      backgroundColor: theme.orangeBrown,
      borderWidth: 2,
      borderColor: theme.darkGreen,
      borderRadius: 9999,
      paddingVertical: moderateHeightScale(8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      width: 155,
    },
    uploadButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    googleDriveLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    inputContainer: {
      marginBottom: moderateHeightScale(20),
    },
    updateButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(8),
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
    },
    countryCodeText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    disabledInputContainer: {
      backgroundColor: theme.lightGreen07,
    },
    textAreaContainer: {
      marginBottom: moderateHeightScale(20),
      position: "relative",
    },
    textArea: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: moderateHeightScale(120),
      textAlignVertical: "top",
      // Extra right padding so text doesn't go under the clear (X) button
      paddingRight: moderateWidthScale(40),
    },
    clearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
    dateOfBirthContainer: {
      gap: moderateHeightScale(5),
      marginBottom: moderateHeightScale(20),
    },
    dateOfBirthLabelContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dateOfBirthLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    clearDateText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textDecorationLine: "underline",
      textDecorationColor: theme.lightGreen,
    },
    dateOfBirthFields: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    dateField: {
      flex: 1,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dateFieldContent: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    dateFieldText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    dateFieldPlaceholder: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen2,
    },
    dateFieldLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

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

  if (!digits) {
    return "";
  }

  try {
    const formatter = new AsYouType(countryIso as PhoneCountryCode);
    const formatted = formatter.input(`+${dialDigits}${digits}`);
    const prefix = `+${dialDigits}`;

    if (formatted.startsWith(prefix)) {
      return formatted.slice(prefix.length).trimStart();
    }

    return formatted.replace(prefix, "").trimStart();
  } catch (error) {
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
  } catch (error) {
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

// Helper function to get country ISO from dial code
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

// Date, Month, Year options
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const MONTHS = [
  { value: "Jan", label: "Jan" },
  { value: "Feb", label: "Feb" },
  { value: "Mar", label: "Mar" },
  { value: "Apr", label: "Apr" },
  { value: "May", label: "May" },
  { value: "Jun", label: "Jun" },
  { value: "Jul", label: "Jul" },
  { value: "Aug", label: "Aug" },
  { value: "Sep", label: "Sep" },
  { value: "Oct", label: "Oct" },
  { value: "Nov", label: "Nov" },
  { value: "Dec", label: "Dec" },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) =>
  (CURRENT_YEAR - i).toString(),
);

// Helper function to parse date of birth from API format (YYYY-MM-DD) to our format
const parseDateOfBirth = (
  dateString: string | null | undefined,
): { date: string; month: string; year: string } | null => {
  if (!dateString) return null;

  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthNumber = parseInt(parts[1], 10);
      const date = parts[2];

      const monthMap: Record<number, string> = {
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Dec",
      };

      return {
        date: date.replace(/^0+/, "") || date, // Remove leading zeros
        month: monthMap[monthNumber] || "",
        year: year,
      };
    }
  } catch (error) {
    Logger.error("Error parsing date of birth:", error);
  }

  return null;
};

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();

  // Initialize state with user data from Redux
  const initialCountryCode = user.country_code || "+1";
  const initialCountryIso = getCountryIsoFromDialCode(initialCountryCode);
  const initialPhoneNumber = user.phone || "";
  const originalProfileImageUri = user?.profile_image_url
    ? user.profile_image_url.startsWith("http://") ||
      user.profile_image_url.startsWith("https://")
      ? user.profile_image_url
      : process.env.EXPO_PUBLIC_API_BASE_URL + user.profile_image_url
    : "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";

  const [email, setEmail] = useState(user.email || "");
  const [fullName, setFullName] = useState(user.name || "");
  const [profileImageUri, setProfileImageUri] = useState(
    originalProfileImageUri,
  );
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [aboutYourself, setAboutYourself] = useState(user?.description ?? "");
  const [aboutYourselfError, setAboutYourselfError] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Phone number state
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [countryIso, setCountryIso] = useState(initialCountryIso);
  const [phonePlaceholder, setPhonePlaceholder] = useState(
    getPlaceholderForCountry(initialCountryIso, initialCountryCode),
  );
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [phoneIsValid, setPhoneIsValid] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const previousDigitCountRef = useRef(0);
  const isSettingCursorRef = useRef(false);

  // Date of birth state
  const initialDateOfBirth = user.dateOfBirth || null;
  const [dateOfBirth, setDateOfBirth] = useState<{
    date: string;
    month: string;
    year: string;
  } | null>(initialDateOfBirth);
  const [dateDropdownVisible, setDateDropdownVisible] = useState<
    "date" | "month" | "year" | null
  >(null);
  const dateFieldRef = useRef<View>(null);
  const monthFieldRef = useRef<View>(null);
  const yearFieldRef = useRef<View>(null);

  // Validate phone number on mount if it exists
  useEffect(() => {
    if (phoneNumber && countryCode) {
      try {
        const dialDigits = countryCode.replace(/\D/g, "");
        const parsed = parsePhoneNumberFromString(
          `+${dialDigits}${phoneNumber}`,
          countryIso as PhoneCountryCode,
        );
        if (parsed?.isValid()) {
          setPhoneIsValid(true);
        } else {
          setPhoneIsValid(false);
        }
      } catch (error) {
        setPhoneIsValid(false);
      }
    } else {
      setPhoneIsValid(false);
    }
    // Only run once on mount to validate initial phone from Redux
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate email when it changes
  useEffect(() => {
    if (email.length > 0) {
      const validation = validateEmail(email);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Validate full name when it changes
  useEffect(() => {
    if (fullName.length > 0) {
      const validation = validateName(fullName, "Your full name");
      setFullNameError(validation.error);
    } else {
      setFullNameError(null);
    }
  }, [fullName]);

  // Validate about yourself for staff (optional field - only validate if content exists)
  useEffect(() => {
    if (user.userRole === "staff" && aboutYourself.trim().length > 0) {
      const validation = validateDescription(aboutYourself.trim(), 10, 1000);
      setAboutYourselfError(validation.error);
    } else {
      setAboutYourselfError(null);
    }
  }, [aboutYourself, user.userRole]);

  // Date of birth validation: if any field is selected, all must be selected
  const hasDate = dateOfBirth?.date && dateOfBirth.date.trim().length > 0;
  const hasMonth = dateOfBirth?.month && dateOfBirth.month.trim().length > 0;
  const hasYear = dateOfBirth?.year && dateOfBirth.year.trim().length > 0;
  const isDateOfBirthPartial =
    (hasDate || hasMonth || hasYear) && !(hasDate && hasMonth && hasYear);

  // Initialize phone placeholder when country changes
  useEffect(() => {
    setPhonePlaceholder(getPlaceholderForCountry(countryIso, countryCode));
  }, [countryCode, countryIso]);

  const handleClearEmail = useCallback(() => {
    setEmail("");
    setEmailError(null);
  }, []);

  const handleClearFullName = useCallback(() => {
    setFullName("");
    setFullNameError(null);
  }, []);

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

  const handleCountrySelect = useCallback((country: CountryItem) => {
    setCountryCode(country.dial_code);
    setCountryIso(country.code);
    setPhonePlaceholder(
      getPlaceholderForCountry(country.code, country.dial_code),
    );
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
        } catch (error) {
          isValid = false;
        }
      }

      const isTyping = parsedDigits.length > previousDigitCountRef.current;
      const previousLength = previousDigitCountRef.current;
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
    if (isSettingCursorRef.current) {
      return;
    }
    const newSelection = {
      start: event.nativeEvent.selection.start,
      end: event.nativeEvent.selection.end,
    };
    setSelection(newSelection);
  }, []);

  const handleDateSelect = useCallback(
    (type: "date" | "month" | "year", value: string) => {
      const current = dateOfBirth || { date: "", month: "", year: "" };
      const updated = { ...current };

      if (type === "date") {
        updated.date = value;
      } else if (type === "month") {
        updated.month = value;
      } else {
        updated.year = value;
      }

      setDateOfBirth(updated);
      setDateDropdownVisible(null);
    },
    [dateOfBirth],
  );

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
        shadowOffset: {
          width: 0,
          height: 1,
        },
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

  const handleUploadPhoto = () => {
    setShowImagePickerModal(true);
  };

  const handleImportFromGoogleDrive = () => {
    // TODO: Implement Google Drive import
    Logger.log("Import from Google Drive pressed");
  };

  // Check if form is valid
  // Button should be disabled if:
  // - fullName is empty or invalid
  // - phone is invalid (but phone is optional, so empty is OK)
  // - date of birth is partial (for customer users)
  const isFormValid = useMemo(() => {
    const fullNameValidation = validateName(fullName, "Your full name");

    // Full name must be valid and not empty
    const isFullNameValid =
      fullName.trim().length > 0 && fullNameValidation.isValid;

    if (user.userRole === "staff") {
      const aboutYourselfProvided = aboutYourself.trim().length > 0;
      const aboutYourselfValidation = aboutYourselfProvided
        ? validateDescription(aboutYourself.trim(), 10, 1000)
        : { isValid: true, error: null };

      return isFullNameValid && aboutYourselfValidation.isValid;
    }

    // Phone is optional, but if provided, it must be valid (non-staff users)
    const isPhoneValid = phoneNumber.length === 0 || phoneIsValid;

    // Date of birth is optional, but if any field is filled, all must be filled (only for customer users)
    const isDateOfBirthValid =
      user.userRole === "customer" ? !isDateOfBirthPartial : true;

    return isFullNameValid && isPhoneValid && isDateOfBirthValid;
  }, [
    aboutYourself,
    fullName,
    phoneIsValid,
    phoneNumber,
    user.userRole,
    isDateOfBirthPartial,
  ]);

  const handleUpdateProfile = async () => {
    // Validate all fields before submitting
    const fullNameValidation = validateName(fullName, "Your full name");

    setFullNameError(fullNameValidation.error);

    if (user.userRole === "staff") {
      const aboutYourselfProvided = aboutYourself.trim().length > 0;
      const aboutYourselfValidation = aboutYourselfProvided
        ? validateDescription(aboutYourself.trim(), 10, 1000)
        : { isValid: true, error: null };

      setAboutYourselfError(aboutYourselfValidation.error);

      if (!fullNameValidation.isValid || !aboutYourselfValidation.isValid) {
        return;
      }
    } else {
      // For customer users: Validate date of birth: if any field is filled, all must be filled
      if (user.userRole === "customer" && isDateOfBirthPartial) {
        return;
      }

      if (
        !fullNameValidation.isValid ||
        !(phoneNumber.length === 0 || phoneIsValid)
      ) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      const formData = new FormData();

      // Add name
      formData.append("name", fullName.trim());

      let endpoint: string = userEndpoints.update;

      if (user.userRole === "staff") {
        // Staff: description is optional
        formData.append(
          "description",
          aboutYourself.trim().length > 0 ? aboutYourself.trim() : "",
        );
      } else {
        // Non-staff: Add phone number and country code separately
        if (phoneNumber && phoneIsValid) {
          // Remove any spaces from phone number
          const cleanPhoneNumber = phoneNumber.replace(/\s+/g, "");
          formData.append("phone", cleanPhoneNumber);
          formData.append("country_code", countryCode);
        } else if (phoneNumber.length === 0) {
          // If phone is empty, send empty string to clear it
          formData.append("phone", "");
          formData.append("country_code", countryCode);
        }

        // Add date of birth only for customer users
        if (user.userRole === "customer") {
          const monthMap: Record<string, string> = {
            Jan: "01",
            Feb: "02",
            Mar: "03",
            Apr: "04",
            May: "05",
            Jun: "06",
            Jul: "07",
            Aug: "08",
            Sep: "09",
            Oct: "10",
            Nov: "11",
            Dec: "12",
          };

          if (dateOfBirth?.date && dateOfBirth?.month && dateOfBirth?.year) {
            const monthNumber =
              monthMap[dateOfBirth.month] || dateOfBirth.month;
            const formattedDate = `${
              dateOfBirth.year
            }-${monthNumber}-${dateOfBirth.date.padStart(2, "0")}`;
            formData.append("date_of_birth", formattedDate);
          } else {
            // If date of birth is empty, send empty string to clear it
            formData.append("date_of_birth", "");
          }
        }
      }

      // Add profile image if it has changed
      const hasImageChanged = profileImageUri !== originalProfileImageUri;
      if (hasImageChanged) {
        // Check if it's a local file (starts with file://) or a remote URL
        if (
          profileImageUri.startsWith("file://") ||
          profileImageUri.startsWith("content://") ||
          profileImageUri.startsWith("ph://")
        ) {
          // It's a local file, append it
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

          // Use staff-specific field name when updating staff profile
          const imageFieldName =
            user.userRole === "staff" ? "profile_image" : "avatar";

          formData.append(imageFieldName, {
            uri: profileImageUri,
            type: mimeType,
            name: fileName,
          } as any);
        } else if (profileImageUri === "") {
          // User wants to remove avatar
          if (user.userRole !== "staff") {
            formData.append("remove_avatar", "true");
          }
        }
        // If it's a remote URL and hasn't changed, we don't need to send it
      }

      // Staff profile uses staff endpoints
      if (user.userRole === "staff") {
        endpoint = staffEndpoints.profile;
      }

      // API call with FormData
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: {
          name?: string;
          phone?: string | null;
          country_code?: string | null;
          profile_image_url?: string | null;
          description?: string | null;
          date_of_birth?: string | null;
          user?: {
            profile_image_url?: string | null;
          };
        };
      }>(endpoint, formData, config);

      if (response.success) {
        Logger.log("response.data :", response.data);
        // Update Redux state with new user data (for user endpoint responses)
        if (response.data) {
          // Parse date_of_birth from API response if it exists (only for customer users)
          let parsedDateOfBirth = null;
          if (user.userRole === "customer") {
            if (response.data.date_of_birth) {
              parsedDateOfBirth = parseDateOfBirth(response.data.date_of_birth);
            } else if (!dateOfBirth) {
              // If date_of_birth is not in response and we cleared it, set to null
              parsedDateOfBirth = null;
            } else {
              // Keep existing date of birth if not in response
              parsedDateOfBirth = dateOfBirth;
            }
          }

          dispatch(
            setUserDetails({
              name: response.data.name,
              phone: response.data.phone,
              country_code: response.data.country_code,
              profile_image_url:
                user?.userRole == "staff"
                  ? response?.data?.user?.profile_image_url
                  : response.data.profile_image_url,
              description: response.data.description ?? "",
              dateOfBirth: parsedDateOfBirth,
            }),
          );
        }

        showBanner(
          t("success"),
          response.message || t("profileUpdatedSuccess"),
          "success",
          3000,
        );

        router.back();
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToUpdateProfile"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update profile:", error);
      showBanner(
        t("error"),
        error.message || t("failedToUpdateProfileTryAgain"),
        "error",
        3000,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("editProfile")} />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: profileImageUri,
              }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.uploadSection}>
            <Text style={styles.uploadText}>{t("addYourNewImage")}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUploadPhoto}
              style={styles.uploadButton}
            >
              <MaterialIcons
                name="arrow-upward"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.uploadButtonText}>{t("uploadPhoto")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled
              activeOpacity={0.7}
              onPress={handleImportFromGoogleDrive}
            >
              <Text style={styles.googleDriveLink}>
                {/* Import from google drive */}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <FloatingInput
            label={t("yourFullName")}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t("yourFullName")}
            autoCapitalize="words"
            onClear={handleClearFullName}
          />
          {fullNameError && (
            <Text style={styles.errorText}>{fullNameError}</Text>
          )}
        </View>

        {user?.userRole === "staff" && (
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={aboutYourself}
              onChangeText={setAboutYourself}
              placeholder={t("writeAboutYourself")}
              placeholderTextColor={theme.lightGreen2}
              multiline
              numberOfLines={6}
            />
            {aboutYourself.length > 0 && (
              <Pressable
                onPress={() => setAboutYourself("")}
                style={styles.clearButton}
                hitSlop={moderateWidthScale(8)}
              >
                <CloseIcon color={theme.darkGreen} />
              </Pressable>
            )}
            {aboutYourselfError && (
              <Text style={styles.errorText}>{aboutYourselfError}</Text>
            )}
          </View>
        )}

        {user?.userRole !== "staff" && (
          <>
            <View style={styles.phoneField}>
              <View style={styles.phoneFieldContainer}>
                <Text style={styles.inputLabel}>{t("phoneNumber")}</Text>
                <View style={styles.phoneInputContainer}>
                  <Pressable
                    onPress={() => setPickerVisible(true)}
                    style={styles.countrySelector}
                    hitSlop={moderateWidthScale(10)}
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
                      showSoftInputOnFocus={true}
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
              {isPhoneInvalid && (
                <Text style={styles.errorText}>
                  {t("enterValidPhoneNumber")}
                </Text>
              )}
              <CountryPicker
                show={pickerVisible}
                pickerButtonOnPress={handleCountrySelect}
                onBackdropPress={() => setPickerVisible(false)}
                onRequestClose={() => setPickerVisible(false)}
                inputPlaceholder={t("searchCountry")}
                inputPlaceholderTextColor={theme.lightGreen2}
                searchMessage={t("noCountryFound")}
                style={pickerStyles}
                popularCountries={["US", "NG", "GB", "CA", "PK", "IN"]}
                enableModalAvoiding
                lang="en"
              />
            </View>
          </>
        )}

        {user?.userRole === "customer" && (
          <View style={styles.dateOfBirthContainer}>
            <View style={styles.dateOfBirthLabelContainer}>
              <Text style={styles.dateOfBirthLabel}>{t("dateOfBirth")}</Text>
              {(hasDate || hasMonth || hasYear) && (
                <Pressable
                  onPress={() => {
                    setDateOfBirth({ date: "", month: "", year: "" });
                  }}
                  hitSlop={moderateWidthScale(10)}
                >
                  <Text style={styles.clearDateText}>{t("clear")}</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.dateOfBirthFields}>
              <Pressable
                ref={dateFieldRef}
                style={styles.dateField}
                onPress={() => setDateDropdownVisible("date")}
              >
                <View style={styles.dateFieldContent}>
                  <Text style={styles.dateFieldLabel}>{t("date")}</Text>
                  <Text
                    style={[
                      dateOfBirth?.date
                        ? styles.dateFieldText
                        : styles.dateFieldPlaceholder,
                    ]}
                  >
                    {dateOfBirth?.date || "16"}
                  </Text>
                </View>
                <Feather
                  name="chevron-down"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
              </Pressable>
              <Pressable
                ref={monthFieldRef}
                style={styles.dateField}
                onPress={() => setDateDropdownVisible("month")}
              >
                <View style={styles.dateFieldContent}>
                  <Text style={styles.dateFieldLabel}>Month</Text>
                  <Text
                    style={[
                      dateOfBirth?.month
                        ? styles.dateFieldText
                        : styles.dateFieldPlaceholder,
                    ]}
                  >
                    {dateOfBirth?.month
                      ? MONTHS.find((m) => m.value === dateOfBirth.month)
                          ?.label || dateOfBirth.month
                      : "Sep"}
                  </Text>
                </View>
                <Feather
                  name="chevron-down"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
              </Pressable>
              <Pressable
                ref={yearFieldRef}
                style={styles.dateField}
                onPress={() => setDateDropdownVisible("year")}
              >
                <View style={styles.dateFieldContent}>
                  <Text style={styles.dateFieldLabel}>{t("year")}</Text>
                  <Text
                    style={[
                      dateOfBirth?.year
                        ? styles.dateFieldText
                        : styles.dateFieldPlaceholder,
                    ]}
                  >
                    {dateOfBirth?.year || "1992"}
                  </Text>
                </View>
                <Feather
                  name="chevron-down"
                  size={moderateWidthScale(16)}
                  color={theme.darkGreen}
                />
              </Pressable>
            </View>
            {isDateOfBirthPartial && (
              <Text style={styles.errorText}>
                Please complete all date fields or leave them empty
              </Text>
            )}
          </View>
        )}

        <View style={styles.inputContainer}>
          <FloatingInput
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            placeholder={t("email")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onClear={handleClearEmail}
            editable={false}
            showClearButton={false}
            containerStyle={styles.disabledInputContainer}
          />
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.updateButtonContainer}>
        <Button
          title={t("update")}
          onPress={handleUpdateProfile}
          disabled={!isFormValid || isUpdating}
        />
      </View>

      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={setProfileImageUri}
      />

      {user?.userRole === "customer" && (
        <>
          <DatePickerDropdown
            visible={dateDropdownVisible === "date"}
            options={DAYS}
            selectedValue={dateOfBirth?.date}
            onSelect={(value) => handleDateSelect("date", value)}
            onClose={() => setDateDropdownVisible(null)}
            buttonRef={dateFieldRef}
          />

          <DatePickerDropdown
            visible={dateDropdownVisible === "month"}
            options={MONTHS.map((m) => m.value)}
            selectedValue={dateOfBirth?.month}
            onSelect={(value) => handleDateSelect("month", value)}
            onClose={() => setDateDropdownVisible(null)}
            buttonRef={monthFieldRef}
            displayValue={(value) =>
              MONTHS.find((m) => m.value === value)?.label || value
            }
          />

          <DatePickerDropdown
            visible={dateDropdownVisible === "year"}
            options={YEARS}
            selectedValue={dateOfBirth?.year}
            onSelect={(value) => handleDateSelect("year", value)}
            onClose={() => setDateDropdownVisible(null)}
            buttonRef={yearFieldRef}
          />
        </>
      )}
    </SafeAreaView>
  );
}
