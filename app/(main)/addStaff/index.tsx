import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Pressable,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Feather, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import CustomToggle from "@/src/components/customToggle";
import BusinessHoursBottomSheet from "@/src/components/businessHoursBottomSheet";
import { validateEmail } from "@/src/services/validationService";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  CountryPicker,
  CountryItem,
  Style as CountryPickerStyle,
} from "react-native-country-codes-picker";

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
    inputSection: {
      marginBottom: moderateHeightScale(20),
    },
    hint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
    readOnlyField: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.lightGreen07,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(12),
    },
    readOnlyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
    },
    label: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(4),
    },
    phoneField: {
      marginBottom: moderateHeightScale(20),
    },
    phoneInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(10),
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
    phoneInput: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      paddingVertical: 0,
      minHeight: moderateHeightScale(22),
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
    toggleLabel: {
      flex: 1,
      marginLeft: moderateWidthScale(12),
    },
    toggleTitle: {
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
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
    },
    dayName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      minWidth: moderateWidthScale(90),
    },
    dayHours: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
    },
    footerRow: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
  });

export default function AddStaffScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();

  const [staffEmail, setStaffEmail] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
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
  const [errors, setErrors] = useState<{
    email?: string;
    name?: string;
    phone?: string;
  }>({});

  const handleCountrySelect = useCallback((country: CountryItem) => {
    setCountryCode(country.dial_code);
    setPickerVisible(false);
  }, []);

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/\D/g, ""));
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

  const getDayDisplayText = (day: string): string => {
    const dayData = businessHours[day];
    if (!dayData?.isOpen) return "Closed";
    if (!dayData.fromHours && !dayData.tillHours) return "Select";
    return formatTimeRange(
      dayData.fromHours,
      dayData.fromMinutes,
      dayData.tillHours,
      dayData.tillMinutes,
    );
  };

  const handleCreate = () => {
    const newErrors: typeof errors = {};

    if (!staffEmail.trim()) {
      newErrors.email = "Staff email is required";
    } else {
      const emailValidation = validateEmail(staffEmail.trim());
      if (emailValidation.error) newErrors.email = emailValidation.error;
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (phoneNumber.trim()) {
      try {
        const parsed = parsePhoneNumberFromString(
          `${countryCode}${phoneNumber.replace(/\D/g, "")}`,
        );
        if (!parsed?.isValid()) {
          newErrors.phone = "Enter a valid phone number";
        }
      } catch {
        newErrors.phone = "Enter a valid phone number";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // TODO: API call to create staff member
    router.back();
  };

  const pickerStyles = useMemo<CountryPickerStyle>(
    () => ({
      modal: {
        backgroundColor: theme.background,
      },
      dialCode: {
        color: theme.darkGreen,
        fontFamily: fonts.fontMedium,
      },
      countryName: {
        color: theme.darkGreen,
        fontFamily: fonts.fontRegular,
      },
    }),
    [theme],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="New Staff Member" />
      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSec}>
          <Text style={styles.title}>New Staff Member</Text>
          <Text style={styles.subtitle}>
            Add a new staff member to your business. They will receive an
            invitation to join.
          </Text>
        </View>

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

        <View style={styles.inputSection}>
          <FloatingInput
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
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Business</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>Business 1</Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <FloatingInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Staff member name"
            autoCapitalize="words"
          />
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name}</Text>
          ) : null}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Phone number</Text>
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
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.lightGreen2}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone ? (
            <Text style={styles.errorText}>{errors.phone}</Text>
          ) : null}
          <CountryPicker
            show={pickerVisible}
            pickerButtonOnPress={handleCountrySelect}
            onBackdropPress={() => setPickerVisible(false)}
            onRequestClose={() => setPickerVisible(false)}
            style={pickerStyles}
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
        </View>

        <View style={styles.toggleRow}>
          <CustomToggle value={isActive} onValueChange={setIsActive} />
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleTitle}>
              Active (will be activated after invitation acceptance)
            </Text>
            <Text style={styles.hint}>
              An invitation email will be sent to the provided email address.
              They must accept the invitation to activate their account.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Working hours</Text>

        {DAYS.map((day, index) => {
          const dayData = businessHours[day];
          const isOpen = dayData?.isOpen ?? false;
          return (
            <View key={day}>
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <CustomToggle
                  value={isOpen}
                  onValueChange={(value) => {
                    setBusinessHours((prev) => ({
                      ...prev,
                      [day]: {
                        ...(prev[day] || defaultDayData()),
                        isOpen: value,
                      },
                    }));
                  }}
                />
                <Text style={styles.dayName}>{day}</Text>
                <Text style={styles.dayHours} numberOfLines={1}>
                  {getDayDisplayText(day)}
                </Text>
                <Feather
                  name="chevron-right"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              {index < DAYS.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </KeyboardAwareScrollView>

      <View style={styles.footerRow}>
        <Button title="Create Staff Member" onPress={handleCreate} />
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
