import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Pressable,
  Dimensions,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
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
import { validateName } from "@/src/services/validationService";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
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
    continueButtonContainer: {
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
  nationalDigits: string
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
        formatted.replace(`+${example.countryCallingCode}`, "")
      );
    }
  } catch (error) {
    // ignore and fallback
  }

  const fallbackDigits = FALLBACK_PHONE_PLACEHOLDERS[countryIso] ?? "0000000";

  const formattedFallback = formatNationalNumber(
    countryIso,
    dialCode,
    fallbackDigits
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

export default function EditBusinessProfileScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    title?: string;
    slogan?: string;
    logo_url?: string;
    country_code?: string;
    phone?: string;
  }>();

  const getInitialLogoUri = () => {
    if (params.logo_url) {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      return `${baseUrl}${params.logo_url}`;
    }
    return "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";

  };

  const originalLogoImageUri = getInitialLogoUri();
  
  const [businessName, setBusinessName] = useState(params.title || "");
  const [slogan, setSlogan] = useState(params.slogan || "");
  const [logoImageUri, setLogoImageUri] = useState<string | null>(originalLogoImageUri);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [businessNameError, setBusinessNameError] = useState<string | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Phone number state
  const initialCountryCode = params.country_code || "+1";
  const initialCountryIso = getCountryIsoFromDialCode(initialCountryCode);
  const initialPhoneNumber = params.phone || "";
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [countryIso, setCountryIso] = useState(initialCountryIso);
  const [phonePlaceholder, setPhonePlaceholder] = useState(
    getPlaceholderForCountry(initialCountryIso, initialCountryCode)
  );
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [phoneIsValid, setPhoneIsValid] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const previousDigitCountRef = useRef(0);
  const isSettingCursorRef = useRef(false);

  // Validate phone number on mount if it exists
  useEffect(() => {
    if (phoneNumber && countryCode) {
      try {
        const dialDigits = countryCode.replace(/\D/g, "");
        const parsed = parsePhoneNumberFromString(
          `+${dialDigits}${phoneNumber}`,
          countryIso as PhoneCountryCode
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
    // Only run once on mount to validate initial phone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate business name when it changes
  useEffect(() => {
    if (businessName.length > 0) {
      const validation = validateName(businessName, "Business name");
      setBusinessNameError(validation.error);
    } else {
      setBusinessNameError(null);
    }
  }, [businessName]);

  // Initialize phone placeholder when country changes
  useEffect(() => {
    setPhonePlaceholder(getPlaceholderForCountry(countryIso, countryCode));
  }, [countryCode, countryIso]);

  const handleClearBusinessName = useCallback(() => {
    setBusinessName("");
    setBusinessNameError(null);
  }, []);

  const maxDigits = useMemo(
    () => phonePlaceholder.replace(/\s+/g, "").length,
    [phonePlaceholder]
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
      getPlaceholderForCountry(country.code, country.dial_code)
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
            countryIso as PhoneCountryCode
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
          digitIndex + groupLength
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
    [countryCode, countryIso, maxDigits, phonePlaceholder]
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
    [theme, insets.bottom]
  );

  const isPhoneInvalid = phoneNumber.length > 0 && !phoneIsValid;


  const handleUploadPhoto = () => {
    setShowImagePickerModal(true);
  };

  const handleImportFromGoogleDrive = () => {
    // TODO: Implement Google Drive import
    console.log("Import from Google Drive pressed");
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const businessNameValidation = validateName(businessName, "Business name");
    // Phone is optional, but if provided, it must be valid
    const isPhoneValid = phoneNumber.length === 0 || phoneIsValid;

    return (
      businessName.trim().length > 0 &&
      businessNameValidation.isValid &&
      isPhoneValid
    );
  }, [businessName, phoneNumber, phoneIsValid]);

  const handleContinue = async () => {
    // Validate all fields before submitting
    const businessNameValidation = validateName(businessName, "Business name");

    setBusinessNameError(businessNameValidation.error);

    if (!businessNameValidation.isValid) {
      return;
    }

    setIsUpdating(true);

    try {
      const formData = new FormData();

      // Add title (business name)
      formData.append("title", businessName.trim());

      // Add slogan if provided
      // if (slogan.trim()) {
        formData.append("slogan", slogan.trim());
      // }

      // Add phone number and country code
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

      // Add image if it has changed and is a local file
      const hasImageChanged = logoImageUri !== originalLogoImageUri;
      if (hasImageChanged && logoImageUri) {
        // Check if it's a local file (starts with file://, content://, or ph://)
        if (
          logoImageUri.startsWith("file://") ||
          logoImageUri.startsWith("content://") ||
          logoImageUri.startsWith("ph://")
        ) {
          // It's a local file, append it
          const fileExtension = logoImageUri.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `business_logo.${fileExtension}`;
          const mimeType =
            fileExtension === "jpg" || fileExtension === "jpeg"
              ? "image/jpeg"
              : fileExtension === "png"
              ? "image/png"
              : fileExtension === "webp"
              ? "image/webp"
              : "image/jpeg";

          formData.append("image", {
            uri: logoImageUri,
            type: mimeType,
            name: fileName,
          } as any);
        }
        // If it's a remote URL and hasn't changed, we don't need to send it
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
        data?: any;
      }>(businessEndpoints.profile, formData, config);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Business profile updated successfully",
          "success",
          3000
        );

        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update business profile",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to update business profile:", error);
      showBanner(
        "Error",
        error.message || "Failed to update business profile. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Edit business profile" />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          {logoImageUri && (
            <View style={styles.profileImageContainer}>
              <Image
                source={{
                  uri: logoImageUri,
                }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
          )}
          <View style={styles.uploadSection}>
            <Text style={styles.uploadText}>Add your business logo</Text>
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
              <Text style={styles.uploadButtonText}>Upload photo</Text>
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
            label="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Business name *"
            autoCapitalize="words"
            onClear={handleClearBusinessName}
          />
          {businessNameError && (
            <Text style={styles.errorText}>{businessNameError}</Text>
          )}
        </View>

        <View style={styles.phoneField}>
          <View style={styles.phoneFieldContainer}>
            <Text style={styles.inputLabel}>Phone number</Text>
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
            <Text style={styles.errorText}>Enter a valid phone number</Text>
          )}
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

        <View style={styles.inputContainer}>
          <FloatingInput
            label="Slogan (optional)"
            value={slogan}
            onChangeText={setSlogan}
            placeholder="Slogan (optional)"
            autoCapitalize="sentences"
            onClear={() => setSlogan("")}
          />
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.continueButtonContainer}>
        <Button
          title="Update"
          onPress={handleContinue}
          disabled={!isFormValid || isUpdating}
        />
      </View>

      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={setLogoImageUri}
      />
    </SafeAreaView>
  );
}
