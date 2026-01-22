import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { setUserDetails } from "@/src/state/slices/userSlice";
import { Theme } from "@/src/theme/colors";
import { MAIN_ROUTES } from "@/src/constant/routes";
import Button from "@/src/components/button";
import CompleteProfileHeader from "@/src/components/CompleteProfileHeader";
import StepOne from "./components/StepOne";
import StepTwo from "./components/StepTwo";
import { createStyles } from "./styles";
import {
  goToNextStep,
  goToPreviousStep,
  setTotalSteps,
} from "@/src/state/slices/completeProfileSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { userEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { validateName } from "@/src/services/validationService";
import RegisterTermsModal from "@/src/components/registerTermsModal";

export default function completeCusotmerProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { showBanner } = useNotificationContext();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const {
    currentStep,
    totalSteps,
    fullName,
    phoneNumber,
    phoneIsValid,
    countryCode,
    countryIso,
    countryZipCode,
    countryName,
    dateOfBirth,
  } = useAppSelector((state) => state.completeProfile);

  // Set total steps to 2 on mount
  React.useEffect(() => {
    if (totalSteps !== 2) {
      dispatch(setTotalSteps(2));
    }
  }, [dispatch, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      dispatch(goToPreviousStep());
      return;
    }
    router.back();
  }, [currentStep, dispatch, router]);

  // Build FormData for Step 1 API call
  const buildFormDataStep1 = () => {
    const formData = new FormData();

    // Convert month abbreviation to number (e.g., "Sep" -> "09")
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

    // name - send empty string if not provided
    formData.append("name", fullName.trim() || "");

    // phone - send empty string if not provided
    formData.append("phone", phoneNumber || "");

    // country_code - send empty string if not provided (use countryIso or countryCode)
    // API accepts ISO 3166-1 alpha-2/3 country code or phone country code
    const countryCodeValue = countryIso || countryCode || "";
    formData.append("country_code", countryCodeValue);

    // date_of_birth - format as YYYY-MM-DD, send empty string if not provided
    if (dateOfBirth?.date && dateOfBirth?.month && dateOfBirth?.year) {
      const monthNumber = monthMap[dateOfBirth.month] || dateOfBirth.month;
      const formattedDate = `${dateOfBirth.year}-${monthNumber}-${dateOfBirth.date.padStart(2, "0")}`;
      formData.append("date_of_birth", formattedDate);
    } else {
      formData.append("date_of_birth", "");
    }

    return formData;
  };

  // Build FormData for Step 2 API call
  const buildFormDataStep2 = () => {
    const formData = new FormData();

    // country_name - send empty string if not provided
    formData.append("country_name", countryName?.trim() || "");

    // zip_code - send empty string if not provided
    formData.append("zip_code", countryZipCode?.trim() || "");

    return formData;
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      let formData: FormData;

      // Step 1: Call API to update user profile (name, phone, country_code, date_of_birth)
      if (currentStep === 1) {
        formData = buildFormDataStep1();
      } else if (currentStep === 2) {
        // Step 2: Call API to update country_name and zip_code
        formData = buildFormDataStep2();
      } else {
        setIsSubmitting(false);
        return;
      }

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(userEndpoints.update, formData, config);

      if (response.success) {
        if (currentStep === 1) {
          // Update user slice with Step 1 values
          dispatch(
            setUserDetails({
              name: fullName.trim() || null,
              phone: phoneNumber || null,
              country_code: countryCode || countryIso || null,
              dateOfBirth: dateOfBirth || null,
            })
          );
          // Move to next step on success
          dispatch(goToNextStep());
        } else if (currentStep === 2) {
          // Update user slice with Step 2 values
          dispatch(
            setUserDetails({
              countryZipCode: countryZipCode || "",
              countryName: countryName || "",
            })
          );
          // Open terms modal after Step 2 API call
          setShowTermsModal(true);
        }
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update profile",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update profile:", error);
      showBanner(
        "Error",
        error.message || "Failed to update profile. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (currentStep > 1) {
          dispatch(goToPreviousStep());
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBackPress
      );

      return () => subscription.remove();
    }, [currentStep, dispatch])
  );

  const isContinueDisabled = useMemo(() => {
    if (currentStep === 1) {
      // Full name is required
      const fullNameValid = fullName.trim().length > 0;
      const fullNameValidation = validateName(fullName.trim(), "Full name");

      // Phone is optional, but if provided, it must be valid
      const phoneProvided = phoneNumber.trim().length > 0;
      const phoneValid = !phoneProvided || phoneIsValid;

      // Date of birth validation: optional, but if any field is selected, all must be selected
      const hasDate = dateOfBirth?.date && dateOfBirth.date.trim().length > 0;
      const hasMonth = dateOfBirth?.month && dateOfBirth.month.trim().length > 0;
      const hasYear = dateOfBirth?.year && dateOfBirth.year.trim().length > 0;
      
      // If at least one field is selected, all three must be selected
      const dateOfBirthValid =
        (!hasDate && !hasMonth && !hasYear) || // All empty (optional)
        (hasDate && hasMonth && hasYear); // All filled

      return (
        !fullNameValid ||
        !fullNameValidation.isValid ||
        !phoneValid ||
        !dateOfBirthValid
      );
    }

    if (currentStep === 2) {
      // Country name is required
      return !countryName || countryName.trim().length === 0;
    }

    return false;
  }, [
    fullName,
    phoneNumber,
    phoneIsValid,
    dateOfBirth,
    countryName,
  ]);

  const renderStep = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <StepOne />;
      case 2:
        return <StepTwo />;
      default:
        return null;
    }
  }, [currentStep]);

  const continueLabel = useMemo(() => {
    return "Continue";
  }, [ currentStep, totalSteps]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CompleteProfileHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={handleBack}
        disableBack={currentStep === 1 ? true : false}
      />
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep}
        </ScrollView>
        <View style={styles.buttonWrapper}>
          <Button
            title={continueLabel}
            onPress={handleContinue}
            disabled={isContinueDisabled || isSubmitting}
            loading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>

      <RegisterTermsModal
        visible={showTermsModal}
        onClose={() => {
          // Empty function - modal is non-closable
        }}
        onContinue={() => {
          router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/${MAIN_ROUTES.HOME}` as any);
        }}
        nonClosable={true}
      />
    </SafeAreaView>
  );
}
