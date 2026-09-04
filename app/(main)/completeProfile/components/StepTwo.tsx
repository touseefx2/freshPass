import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import FloatingInput from "@/src/components/floatingInput";
import { CloseIcon } from "@/assets/icons";
import DatePickerDropdown from "@/src/components/DatePickerDropdown";
import {
  CountryCode as PhoneCountryCode,
  getExampleNumber,
  AsYouType,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const examples = require("libphonenumber-js/examples.mobile.json");
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setBusinessName,
  setFullName,
  setPhoneNumber,
  setCountryDetails,
  setDateOfBirth,
} from "@/src/state/slices/completeProfileSlice";
import { validateName } from "@/src/services/validationService";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { parseDateOfBirth } from "@/src/constant/functions";
import Logger from "@/src/services/logger";

const US_COUNTRY_CODE = "+1";
const US_COUNTRY_ISO = "US";

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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
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
    formGroup: {
      gap: moderateHeightScale(16),
      marginTop: moderateHeightScale(10),
    },
    field: {},
    phoneField: {
      gap: moderateHeightScale(2),
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
    requiredAsterisk: {
      color: theme.red,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size11,
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
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginTop: moderateHeightScale(4),
    },
    dateOfBirthContainer: {
      gap: moderateHeightScale(5),
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

export default function StepTwo() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { t } = useTranslation();
  const {
    businessName,
    fullName,
    countryCode,
    countryIso,
    phoneNumber,
    phonePlaceholder,
    phoneIsValid,
    dateOfBirth,
  } = useAppSelector((state) => state.completeProfile);
  const userDateOfBirth = useAppSelector((state) => state.user.dateOfBirth);
  const phoneInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const previousDigitCountRef = useRef(0);
  const isSettingCursorRef = useRef(false);
  const hasHydratedDobRef = useRef(false);
  const [businessNameError, setBusinessNameError] = useState<string | null>(
    null,
  );
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [dateDropdownVisible, setDateDropdownVisible] = useState<
    "date" | "month" | "year" | null
  >(null);
  const dateFieldRef = useRef<View>(null);
  const monthFieldRef = useRef<View>(null);
  const yearFieldRef = useRef<View>(null);
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

  // Lock country code to US (+1) for this onboarding step only
  useEffect(() => {
    dispatch(
      setCountryDetails({
        countryCode: US_COUNTRY_CODE,
        countryIso: US_COUNTRY_ISO,
        phonePlaceholder: getPlaceholderForCountry(
          US_COUNTRY_ISO,
          US_COUNTRY_CODE,
        ),
      }),
    );
  }, [dispatch]);

  // Prefill DOB when merchant resumes step 2
  useEffect(() => {
    if (hasHydratedDobRef.current) return;

    const hasPartialOrFullDob =
      !!dateOfBirth?.date || !!dateOfBirth?.month || !!dateOfBirth?.year;
    if (hasPartialOrFullDob) {
      hasHydratedDobRef.current = true;
      return;
    }

    if (userDateOfBirth?.date && userDateOfBirth?.month && userDateOfBirth?.year) {
      dispatch(setDateOfBirth(userDateOfBirth));
      hasHydratedDobRef.current = true;
      return;
    }

    let cancelled = false;

    const hydrateDateOfBirth = async () => {
      try {
        const response = await ApiService.get<{
          success: boolean;
          data?: {
            date_of_birth?: string | null;
            business?: {
              owner_date_of_birth?: string | null;
            };
          };
        }>(userEndpoints.details);

        if (cancelled || !response.success || !response.data) return;

        const dobString =
          response.data.date_of_birth ||
          response.data.business?.owner_date_of_birth ||
          null;
        const parsed = parseDateOfBirth(dobString);
        if (parsed) {
          dispatch(setDateOfBirth(parsed));
        }
      } catch (error) {
        Logger.error("Failed to hydrate owner date of birth:", error);
      } finally {
        hasHydratedDobRef.current = true;
      }
    };

    hydrateDateOfBirth();

    return () => {
      cancelled = true;
    };
  }, [dateOfBirth, dispatch, userDateOfBirth]);

  const handlePhoneChange = useCallback(
    (value: string) => {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      const limitedDigits = digitsOnly.slice(0, maxDigits);
      const dialDigits = countryCode.replace(/[^0-9]/g, "");
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
      previousDigitCountRef.current = parsedDigits.length;

      dispatch(
        setPhoneNumber({
          value: parsedDigits,
          isValid,
        }),
      );

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
    [countryCode, countryIso, dispatch, maxDigits, phonePlaceholder],
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

      dispatch(setDateOfBirth(updated));
      setDateDropdownVisible(null);
    },
    [dateOfBirth, dispatch],
  );

  const isPhoneInvalid = phoneNumber.length > 0 && !phoneIsValid;

  const hasDate = dateOfBirth?.date && dateOfBirth.date.trim().length > 0;
  const hasMonth = dateOfBirth?.month && dateOfBirth.month.trim().length > 0;
  const hasYear = dateOfBirth?.year && dateOfBirth.year.trim().length > 0;
  const isDateOfBirthPartial =
    (hasDate || hasMonth || hasYear) && !(hasDate && hasMonth && hasYear);

  useEffect(() => {
    if (businessName.trim().length > 0) {
      const validation = validateName(businessName.trim(), "Business name");
      setBusinessNameError(validation.error);
    } else {
      setBusinessNameError(null);
    }
  }, [businessName]);

  useEffect(() => {
    if (fullName.trim().length > 0) {
      const validation = validateName(fullName.trim(), "Full name");
      setFullNameError(validation.error);
    } else {
      setFullNameError(null);
    }
  }, [fullName]);

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("tellUsMoreAboutYou")}</Text>
        <Text style={styles.subtitle}>
          {t("tellUsMoreAboutYouAndBusiness")}
        </Text>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.field}>
          <FloatingInput
            label={t("businessName")}
            value={businessName}
            onChangeText={(value) => dispatch(setBusinessName(value))}
            placeholder={t("businessName")}
            required
            onClear={() => {
              dispatch(setBusinessName(""));
              setBusinessNameError(null);
            }}
          />
          {businessNameError && (
            <Text style={styles.errorText}>{businessNameError}</Text>
          )}
        </View>

        <View style={styles.field}>
          <FloatingInput
            label={t("yourFullName")}
            value={fullName}
            onChangeText={(value) => dispatch(setFullName(value))}
            placeholder={t("yourFullName")}
            required
            onClear={() => {
              dispatch(setFullName(""));
              setFullNameError(null);
            }}
          />
          {fullNameError && (
            <Text style={styles.errorText}>{fullNameError}</Text>
          )}
        </View>

        <View style={[styles.field, styles.phoneField]}>
          <View style={styles.phoneFieldContainer}>
            <Text style={styles.inputLabel}>
              {t("phoneNumber")}
              <Text style={styles.requiredAsterisk}> *</Text>
            </Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countrySelector}>
                <Text style={styles.countryCodeText}>{US_COUNTRY_CODE}</Text>
              </View>
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
                    dispatch(setPhoneNumber({ value: "", isValid: false }));
                  }}
                  hitSlop={moderateWidthScale(10)}
                >
                  <CloseIcon color={(colors as Theme).darkGreen} />
                </Pressable>
              )}
            </View>
          </View>

          {isPhoneInvalid && (
            <Text style={styles.errorText}>{t("enterValidPhoneNumber")}</Text>
          )}
        </View>

        <View style={styles.dateOfBirthContainer}>
          <View style={styles.dateOfBirthLabelContainer}>
            <Text style={styles.dateOfBirthLabel}>{t("dateOfBirth")}</Text>
            {(hasDate || hasMonth || hasYear) && (
              <Pressable
                onPress={() => {
                  dispatch(setDateOfBirth({ date: "", month: "", year: "" }));
                }}
                hitSlop={moderateWidthScale(10)}
              >
                <Text style={styles.clearDateText}>{t("clear")}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.dateOfBirthFields}>
            <Pressable
              ref={monthFieldRef}
              style={styles.dateField}
              onPress={() => setDateDropdownVisible("month")}
            >
              <View style={styles.dateFieldContent}>
                <Text style={styles.dateFieldLabel}>{t("month")}</Text>
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
                color={(colors as Theme).darkGreen}
              />
            </Pressable>
            <Pressable
              ref={dateFieldRef}
              style={styles.dateField}
              onPress={() => setDateDropdownVisible("date")}
            >
              <View style={styles.dateFieldContent}>
                <Text style={styles.dateFieldLabel}>{t("day")}</Text>
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
                color={(colors as Theme).darkGreen}
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
                color={(colors as Theme).darkGreen}
              />
            </Pressable>
          </View>
          {isDateOfBirthPartial && (
            <Text style={styles.errorText}>
              {t("completeAllDateFieldsOrEmpty")}
            </Text>
          )}
        </View>
      </View>

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
    </View>
  );
}
