import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FloatingInput from "@/src/components/floatingInput";
import Button from "@/src/components/button";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import CountryFlag from "@/src/components/countryFlag";

// Popular countries list with their flag emojis and zip code formats
const POPULAR_COUNTRIES = [
  {
    code: "RU",
    name: "Russia",
    flag: "🇷🇺",
    zipCode: "101000",
    zipCodeFormat: "6 digits",
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    zipCode: "10001",
    zipCodeFormat: "5 digits",
  },
  {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    zipCode: "100000",
    zipCodeFormat: "6 digits",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    zipCode: "2000",
    zipCodeFormat: "4 digits",
  },
  {
    code: "PL",
    name: "Poland",
    flag: "🇵🇱",
    zipCode: "00-001",
    zipCodeFormat: "XX-XXX",
  },
  {
    code: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    zipCode: "44000",
    zipCodeFormat: "5 digits",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    zipCode: "SW1A 1AA",
    zipCodeFormat: "SW1A 1AA",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    zipCode: "K1A 0B1",
    zipCodeFormat: "K1A 0B1",
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    zipCode: "110001",
    zipCodeFormat: "6 digits",
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    zipCode: "",
    zipCodeFormat: "Not used",
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    zipCode: "75001",
    zipCodeFormat: "5 digits",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    zipCode: "10115",
    zipCodeFormat: "5 digits",
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    zipCode: "00118",
    zipCodeFormat: "5 digits",
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    zipCode: "28001",
    zipCodeFormat: "5 digits",
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    zipCode: "01310-100",
    zipCodeFormat: "XXXXX-XXX",
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "🇲🇽",
    zipCode: "01000",
    zipCodeFormat: "5 digits",
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    zipCode: "100-0001",
    zipCodeFormat: "XXX-XXXX",
  },
  {
    code: "KR",
    name: "South Korea",
    flag: "🇰🇷",
    zipCode: "03051",
    zipCodeFormat: "5 digits",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    zipCode: "11564",
    zipCodeFormat: "5 digits",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    zipCode: "",
    zipCodeFormat: "Not used",
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "🇹🇷",
    zipCode: "34000",
    zipCodeFormat: "5 digits",
  },
  {
    code: "ID",
    name: "Indonesia",
    flag: "🇮🇩",
    zipCode: "10110",
    zipCodeFormat: "5 digits",
  },
  {
    code: "PH",
    name: "Philippines",
    flag: "🇵🇭",
    zipCode: "1000",
    zipCodeFormat: "4 digits",
  },
  {
    code: "VN",
    name: "Vietnam",
    flag: "🇻🇳",
    zipCode: "100000",
    zipCodeFormat: "6 digits",
  },
  {
    code: "TH",
    name: "Thailand",
    flag: "🇹🇭",
    zipCode: "10100",
    zipCodeFormat: "5 digits",
  },
  {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    zipCode: "50000",
    zipCodeFormat: "5 digits",
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    zipCode: "018956",
    zipCodeFormat: "6 digits",
  },
  {
    code: "NZ",
    name: "New Zealand",
    flag: "🇳🇿",
    zipCode: "1010",
    zipCodeFormat: "4 digits",
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    zipCode: "0001",
    zipCodeFormat: "4 digits",
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    zipCode: "11511",
    zipCodeFormat: "5 digits",
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    zipCode: "C1000",
    zipCodeFormat: "XXXX",
  },
  {
    code: "CL",
    name: "Chile",
    flag: "🇨🇱",
    zipCode: "8320000",
    zipCodeFormat: "7 digits",
  },
  {
    code: "CO",
    name: "Colombia",
    flag: "🇨🇴",
    zipCode: "110111",
    zipCodeFormat: "6 digits",
  },
  {
    code: "PE",
    name: "Peru",
    flag: "🇵🇪",
    zipCode: "15001",
    zipCodeFormat: "5 digits",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    zipCode: "1012 AB",
    zipCodeFormat: "XXXX XX",
  },
  {
    code: "BE",
    name: "Belgium",
    flag: "🇧🇪",
    zipCode: "1000",
    zipCodeFormat: "4 digits",
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "🇨🇭",
    zipCode: "8001",
    zipCodeFormat: "4 digits",
  },
  {
    code: "AT",
    name: "Austria",
    flag: "🇦🇹",
    zipCode: "1010",
    zipCodeFormat: "4 digits",
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
    zipCode: "111 22",
    zipCodeFormat: "XXX XX",
  },
  {
    code: "NO",
    name: "Norway",
    flag: "🇳🇴",
    zipCode: "0001",
    zipCodeFormat: "4 digits",
  },
  {
    code: "DK",
    name: "Denmark",
    flag: "🇩🇰",
    zipCode: "1000",
    zipCodeFormat: "4 digits",
  },
  {
    code: "FI",
    name: "Finland",
    flag: "🇫🇮",
    zipCode: "00100",
    zipCodeFormat: "5 digits",
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "🇵🇹",
    zipCode: "1000-001",
    zipCodeFormat: "XXXX-XXX",
  },
  {
    code: "GR",
    name: "Greece",
    flag: "🇬🇷",
    zipCode: "101 10",
    zipCodeFormat: "XXX XX",
  },
  {
    code: "IE",
    name: "Ireland",
    flag: "🇮🇪",
    zipCode: "D02 AF30",
    zipCodeFormat: "Dublin format",
  },
  {
    code: "IL",
    name: "Israel",
    flag: "🇮🇱",
    zipCode: "9100001",
    zipCodeFormat: "7 digits",
  },
  {
    code: "JO",
    name: "Jordan",
    flag: "🇯🇴",
    zipCode: "11118",
    zipCodeFormat: "5 digits",
  },
  {
    code: "KW",
    name: "Kuwait",
    flag: "🇰🇼",
    zipCode: "13001",
    zipCodeFormat: "5 digits",
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    zipCode: "",
    zipCodeFormat: "Not used",
  },
  {
    code: "BH",
    name: "Bahrain",
    flag: "🇧🇭",
    zipCode: "",
    zipCodeFormat: "Not used",
  },
  {
    code: "OM",
    name: "Oman",
    flag: "🇴🇲",
    zipCode: "100",
    zipCodeFormat: "3 digits",
  },
];

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
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    countryList: {
      gap: 0,
      marginTop: moderateHeightScale(24),
    },
    countryItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: moderateWidthScale(12),
    },
    countryItemSelected: {
      borderBottomWidth: 0,
    },
    radioButton: {
      width: moderateWidthScale(16),
      height: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16 / 2),
      borderWidth: 2,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    radioButtonSelected: {
      borderColor: theme.darkGreen,
    },
    radioButtonInner: {
      width: moderateWidthScale(6),
      height: moderateWidthScale(6),
      borderRadius: moderateWidthScale(6 / 2),
      backgroundColor: theme.orangeBrown,
    },
    countryFlag: {
      width: moderateWidthScale(28),
      height: moderateHeightScale(20),
    },
    countryName: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    zipCodeContainer: {
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    buttonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
      paddingTop: moderateHeightScale(4),
    },
  });

export default function CountryChangeScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);

  // Initialize state from user slice
  const [selectedCountryName, setSelectedCountryName] = useState<string>(
    user.countryName || "",
  );
  const [selectedZipCode, setSelectedZipCode] = useState<string>(
    user.countryZipCode || "",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Update state when user slice changes (e.g., when coming back from another screen)
  useEffect(() => {
    if (user.countryName) {
      setSelectedCountryName(user.countryName);
    }
    if (user.countryZipCode) {
      setSelectedZipCode(user.countryZipCode);
    }
  }, [user.countryName, user.countryZipCode]);

  const handleCountryPress = useCallback(
    (country: (typeof POPULAR_COUNTRIES)[0]) => {
      setSelectedCountryName(country.name);
      // Pre-fill zip code if available
      if (country.zipCode) {
        setSelectedZipCode(country.zipCode);
      } else {
        // Clear zip code if country doesn't use zip codes
        setSelectedZipCode("");
      }
    },
    [],
  );

  const handleZipCodeChange = useCallback((value: string) => {
    // Only allow numbers - remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    setSelectedZipCode(numericValue);
  }, []);

  // Check if a country from the popular list is selected
  const selectedCountryData = useMemo(() => {
    if (!selectedCountryName) return null;
    return POPULAR_COUNTRIES.find(
      (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase(),
    );
  }, [selectedCountryName]);

  // Show zip code input when any country is selected
  const showZipCode = !!selectedCountryData;

  const handleUpdateCountry = async () => {
    if (!selectedCountryName || selectedCountryName.trim().length === 0) {
      showBanner(t("error"), t("pleaseSelectCountry"), "error", 3000);
      return;
    }

    setIsUpdating(true);

    try {
      const formData = new FormData();

      // country_name - send empty string if not provided
      formData.append("country_name", selectedCountryName.trim() || "");

      // zip_code - send empty string if not provided
      formData.append("zip_code", selectedZipCode?.trim() || "");

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(userEndpoints.update, formData, config);

      if (response.success) {
        // Update user slice with country values
        dispatch(
          setUserDetails({
            countryZipCode: selectedZipCode || "",
            countryName: selectedCountryName || "",
          }),
        );

        showBanner(
          t("success"),
          response.message || t("countryUpdatedSuccess"),
          "success",
          3000,
        );

        router.back();
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToUpdateCountry"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update country:", error);
      showBanner(
        t("error"),
        error.message || t("failedToUpdateCountryTryAgain"),
        "error",
        3000,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("country")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleSec}>
          <Text style={styles.title}>{t("whatsYourCountry")}</Text>
          <Text style={styles.subtitle}>{t("getAccurateInfoInArea")}</Text>
        </View>

        <ScrollView
          style={styles.countryList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {POPULAR_COUNTRIES.map((country) => {
            const isSelected =
              selectedCountryName?.toLowerCase() === country.name.toLowerCase();
            return (
              <React.Fragment key={country.code}>
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    isSelected && styles.countryItemSelected,
                  ]}
                  onPress={() => handleCountryPress(country)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                  <CountryFlag code={country.code} style={styles.countryFlag} />
                  <Text style={styles.countryName}>{country.name}</Text>
                </TouchableOpacity>
                {isSelected && (
                  <View style={styles.zipCodeContainer}>
                    <FloatingInput
                      label={t("zipCode")}
                      value={selectedZipCode}
                      onChangeText={handleZipCodeChange}
                      placeholder={`${t("zipCode")} ( ${country.zipCode} )`}
                      keyboardType="number-pad"
                      onClear={() => {
                        setSelectedZipCode("");
                      }}
                    />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t("updateCountry")}
          onPress={handleUpdateCountry}
          loading={isUpdating}
          disabled={!selectedCountryName || isUpdating}
        />
      </View>
    </SafeAreaView>
  );
}
