import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { MAIN_ROUTES } from "@/src/constant/routes";
import Button from "@/src/components/button";
import StaffProfileHeader from "./components/StaffProfileHeader";
import StepOne from "./components/StepOne";
import StepTwo from "./components/StepTwo";
import { createStyles } from "./styles";
import {
  goToNextStep,
  goToPreviousStep,
} from "@/src/state/slices/completeProfileSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  validateName,
  validateDescription,
} from "@/src/services/validationService";
import AcceptTermsModal from "@/src/components/acceptTermsModal";
import { setUserDetails } from "@/src/state/slices/userSlice";

export default function CompleteStaffProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { showBanner } = useNotificationContext();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAcceptTermsModal, setShowAcceptTermsModal] = useState(false);
  const {
    currentStep,
    fullName,
    businessHours,
    profileImageUri,
    aboutYourself,
    dateOfBirth,
    countryZipCode,
    countryName,
  } = useAppSelector((state) => state.completeProfile);

  const handleBack = useCallback(() => {
    // Prevent back navigation only if user is on the initial step they landed on from home
    if (currentStep <= 1) {
      return;
    }

    if (currentStep > 1) {
      dispatch(goToPreviousStep());
      return;
    }
  }, [currentStep, dispatch, router]);

  // Helper function to format time to HH:MM
  const formatTimeToHHMM = (hours: number, minutes: number): string => {
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // Helper function to convert day name to lowercase API format
  const getDayApiFormat = (day: string): string => {
    return day.toLowerCase();
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      let requestBody: any;
      let config: any = undefined;

      if (currentStep === 1) {
        // Step 1: Staff details (name, optional description, optional profile image)
        const formData = new FormData();
        // Full name is required → maps to `name`
        formData.append("name", fullName.trim());

        // Description is optional; backend expects field, send empty string if not provided
        formData.append(
          "description",
          aboutYourself.trim().length > 0 ? aboutYourself.trim() : "",
        );

        // Profile image is optional; only append if user selected one
        if (profileImageUri) {
          const fileExtension = profileImageUri.split(".").pop() || "jpg";
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
        } else {
          formData.append("remove_image", "true");
        }

        requestBody = formData;
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      } else if (currentStep === 2) {
        // Step 2: Staff working hours
        const businessHoursArray = Object.keys(businessHours).map((day) => {
          const dayData = businessHours[day];

          // Transform breaks array
          const breakHours = (dayData.breaks || []).map((breakTime) => ({
            start: formatTimeToHHMM(breakTime.fromHours, breakTime.fromMinutes),
            end: formatTimeToHHMM(breakTime.tillHours, breakTime.tillMinutes),
          }));

          return {
            day: getDayApiFormat(day),
            closed: !dayData.isOpen,
            opening_time: formatTimeToHHMM(
              dayData.fromHours,
              dayData.fromMinutes,
            ),
            closing_time: formatTimeToHHMM(
              dayData.tillHours,
              dayData.tillMinutes,
            ),
            break_hours: breakHours,
          };
        });

        requestBody = {
          working_hours: businessHoursArray,
        };
      }

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(staffEndpoints.profile, requestBody, config);

      if (response.success) {
        if (currentStep <= 1) {
          dispatch(
            setUserDetails({
              name: response.data?.name ?? null,
              description: response.data?.description ?? "",
              profile_image_url:
                (response.data as any)?.profile_image_url ?? null,
            }),
          );
          dispatch(goToNextStep());
        } else if (currentStep > 1) {
          // Show accept terms modal when step 2 is completed
          setShowAcceptTermsModal(true);
        }
      } else {
        showBanner(
          "Error",
          response.message || "Failed to save step data",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to submit onboarding step:", error);
      showBanner(
        "Error",
        error.message || "Failed to save step data. Please try again.",
        "error",
        3000,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    ApiService.post(staffEndpoints.profile, { is_onboarded: true });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        // Prevent back navigation only if user is on the initial step they landed on from home
        if (currentStep <= 1) {
          return true; // Prevent back navigation
        }

        if (currentStep > 1) {
          dispatch(goToPreviousStep());
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBackPress,
      );

      return () => subscription.remove();
    }, [currentStep, dispatch]),
  );

  const isContinueDisabled = useMemo(() => {
    if (currentStep === 1) {
      // Step 1: Full name is required, profile image and about yourself are optional
      const fullNameValid = fullName.trim().length > 0;
      const fullNameValidation = validateName(fullName.trim(), "Full name");

      // About yourself is optional, but if provided, it must be valid
      const aboutYourselfProvided = aboutYourself.trim().length > 0;
      const aboutYourselfValidation = aboutYourselfProvided
        ? validateDescription(aboutYourself.trim(), 10, 1000)
        : { isValid: true, error: null };

      return (
        !fullNameValid ||
        !fullNameValidation.isValid ||
        !aboutYourselfValidation.isValid
      );
    }
    if (currentStep === 2) {
      // Step 2: Availability is optional - can continue without setting hours
      return false;
    }
    return false;
  }, [currentStep, fullName, aboutYourself]);

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
    if (currentStep > 1) {
      return "Save";
    }
    return "Create";
  }, [currentStep]);

  const handleAcceptTermsContinue = useCallback(() => {
    setShowAcceptTermsModal(false);
    router.replace(`/(main)/${MAIN_ROUTES.ACCEPT_TERMS}`);
  }, [router]);

  const handleAcceptTermsClose = useCallback(() => {
    setShowAcceptTermsModal(false);
  }, []);

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={"dark-content"} />
        <StaffProfileHeader currentStep={currentStep} onBack={handleBack} />
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
      </SafeAreaView>
      <AcceptTermsModal
        visible={showAcceptTermsModal}
        onClose={handleAcceptTermsClose}
        onContinue={handleAcceptTermsContinue}
      />
    </>
  );
}
