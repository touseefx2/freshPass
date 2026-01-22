import React, { useCallback, useMemo, useState } from "react";
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
import { Theme } from "@/src/theme/colors";
import { MAIN_ROUTES } from "@/src/constant/routes";
import Button from "@/src/components/button";
import CompleteProfileHeader from "@/src/components/CompleteProfileHeader";
import StepOne from "./components/StepOne";
import StepTwo from "./components/StepTwo";
import StepThree from "./components/StepThree";
import StepFour from "./components/StepFour";
import StepFive from "./components/StepFive";
import StepSix from "./components/StepSix";
import StepSeven from "./components/StepSeven";
import StepEight from "./components/StepEight";
import StepNine from "./components/StepNine";
import StepTen from "./components/StepTen";
import StepEleven from "./components/StepEleven";
import { createStyles } from "./styles";
import {
  goToNextStep,
  goToPreviousStep,
  setAddressStage,
  setSelectedLocation,
} from "@/src/state/slices/completeProfileSlice";
import PrivacyBanner from "@/src/components/privacyBanner";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { validateName } from "@/src/services/validationService";
import { setBusinessId } from "@/src/state/slices/userSlice";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function CompleteProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { showBanner } = useNotificationContext();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipLoading, setIsSkipLoading] = useState(false);
  const {
    currentStep,
    totalSteps,
    businessCategory,
    businessName,
    fullName,
    countryCode,
    phoneNumber,
    phoneIsValid,
    appointmentVolume,
    streetAddress,
    area,
    state,
    zipCode,
    addressStage,
    selectedLocation,
    teamSize,
    businessHours,
    services,
    subscriptions,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    photos,
    serviceTemplates,
  } = useAppSelector((state) => state.completeProfile);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const userRole = useAppSelector((state) => state.user.userRole);

  // Check if onboarding is not completed - prevent back navigation
  // Only for business users (staff and client have their own profile pages)
  const isOnboardingIncomplete = Boolean(
    userRole === "business" &&
      businessStatus &&
      !businessStatus.onboarding_completed
  );

  // Check if user is on the step they landed on from home
  // Only disable back on the initial step they landed on, not on subsequent steps
  const isOnInitialStepFromHome = Boolean(
    isOnboardingIncomplete &&
      businessStatus?.next_step &&
      currentStep === businessStatus.next_step
  );

  const handleBack = useCallback(() => {
    // Prevent back navigation only if user is on the initial step they landed on from home
    if (isOnInitialStepFromHome) {
      return;
    }

    if (currentStep === 4) {
      if (addressStage === "map") {
        // Clear map stage fields (selectedLocation) when going back to confirm
        // Keep confirm stage fields (streetAddress, area, zipCode, selectedAddress)
        dispatch(setSelectedLocation(null));
        dispatch(setAddressStage("confirm"));
        return;
      }
      if (addressStage === "confirm") {
        // Keep confirm stage fields when going back to search
        dispatch(setAddressStage("search"));
        return;
      }
    }
    if (currentStep > 1) {
      dispatch(goToPreviousStep());
      return;
    }

    router.back();
  }, [addressStage, currentStep, dispatch, router, isOnInitialStepFromHome]);

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

  // Build request body based on current step
  const buildRequestBody = () => {
    let body = {};
    // Always include step
    body = {
      step: currentStep.toString(),
    };

    if (currentStep === 1) {
      body = { ...body, category_id: businessCategory?.id.toString() ?? "" }; // step 1 k bad jb tk setp 2 na kr lo detail get ne hti
    }

    if (currentStep === 2) {
      // If phone is empty, send empty string
      // const ownerPhone =
      //   phoneNumber.trim().length > 0 ? `${countryCode}${phoneNumber}` : "";

      body = {
        ...body,
        business_name: businessName.trim(),
        owner_name: fullName.trim(),
        owner_phone: phoneNumber,
        country_code: countryCode,
      };
    }

    if (currentStep === 3) {
      body = {
        ...body,
        weekly_appointment_range: appointmentVolume?.title ?? "",
      };
    }

    if (currentStep === 4) {
      body = {
        ...body,
        street_address: streetAddress,
        city: area,
        state: state,
        zip_code: zipCode, //isko optional krna ha
        latitude: selectedLocation?.latitude ?? 0, // add
        longitude: selectedLocation?.longitude ?? 0, // add
      };
    }

    if (currentStep === 5) {
      body = { ...body, team_member_range: teamSize?.title ?? "" };
    }

    if (currentStep === 6) {
      body = { ...body };
    }

    if (currentStep === 7) {
      // Transform businessHours to API format
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
            dayData.fromMinutes
          ),
          closing_time: formatTimeToHHMM(
            dayData.tillHours,
            dayData.tillMinutes
          ),
          break_hours: breakHours,
        };
      });

      body = { ...body, business_hours: businessHoursArray };
    }

    if (currentStep === 8) {
      // Transform services to API format
      const servicesArray = services.map((service) => ({
        template_id: parseInt(service.id),
        price: service.price,
        description: service.name,
        duration_hours: service.hours,
        duration_minutes: service.minutes,
      }));

      body = { ...body, services: servicesArray };
    }

    if (currentStep === 9) {
      // Transform subscriptions to API format
      const subscriptionPlansArray = subscriptions.map((subscription) => ({
        name: subscription.packageName,
        description: subscription.packageName, // Using packageName as description
        price: subscription.price,
        visits: subscription.servicesPerMonth,
        plan_services: subscription.serviceIds.map((id) => parseInt(id)), // Convert string IDs to numbers (template_id)
      }));

      body = { ...body, subscription_plans: subscriptionPlansArray };
    }

    if (currentStep === 10) {
      const socialMediaLinks: {
        facebook?: string;
        instagram?: string;
        tiktok?: string;
      } = {};

      if (facebookUrl && facebookUrl.trim() !== "") {
        socialMediaLinks.facebook = "https://" + facebookUrl.trim();
      }
      if (instagramUrl && instagramUrl.trim() !== "") {
        socialMediaLinks.instagram = "https://" + instagramUrl.trim();
      }
      if (tiktokUrl && tiktokUrl.trim() !== "") {
        socialMediaLinks.tiktok = "https://" + tiktokUrl.trim();
      }

      body = { ...body, social_media_links: socialMediaLinks };
    }

    return body;
  };

  const handleContinue = async () => {
    // Handle step 4 address stage navigation
    if (currentStep === 4) {
      if (addressStage === "search") {
        return;
      }
      if (addressStage === "confirm") {
        dispatch(setAddressStage("map"));
        return;
      }
    }

    // if (currentStep === 6) {
    //   dispatch(goToNextStep());
    //   return;
    // }

    if (currentStep === 8 && services.length === 0) {
      dispatch(goToNextStep());
      return;
    }

    // Call API for onboarding
    setIsSubmitting(true);
    try {
      let requestBody: any;
      let config: any = undefined;

      if (currentStep === 11) {
        // For step 11, use FormData to send files
        const formData = new FormData();

        // Add step
        formData.append("step", currentStep.toString());

        // Add each photo as a file
        photos.forEach((photo, index) => {
          const fileExtension = photo.uri.split(".").pop() || "jpg";
          const fileName = `portfolio_photo_${index}.${fileExtension}`;

          formData.append(`portfolio_photos[${index}]`, {
            uri: photo.uri,
            type: `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`,
            name: fileName,
          } as any);
        });

        requestBody = formData;
        // Set headers for FormData
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      } else {
        // For other steps, use regular JSON body
        requestBody = buildRequestBody();
      }

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.onboarding, requestBody, config);

      if (response.success) {
        Logger.log("---->business : ", response?.data?.business?.id);
        if (currentStep === 1) {
          dispatch(setBusinessId(response?.data?.business?.id));
        }
        // Move to next step on success
        if (currentStep < totalSteps) {
          dispatch(goToNextStep());
        } else if (currentStep === totalSteps) {
          // Navigate to acceptTerms screen when step 11 is completed
          router.replace(`/(main)/${MAIN_ROUTES.ACCEPT_TERMS}`);
        }
      } else {
        showBanner(
          "Error",
          response.message || "Failed to save step data",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to submit onboarding step:", error);
      showBanner(
        "Error",
        error.message || "Failed to save step data. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Skip button: make API call with empty data for steps 10 and 11
    setIsSkipLoading(true);
    try {
      let requestBody: any;
      let config: any = undefined;

      if (currentStep === 10) {
        // Step 10: Send empty social_media_links object
        requestBody = {
          step: currentStep.toString(),
          social_media_links: {},
        };
      } else if (currentStep === 11) {
        // Step 11: Send empty portfolio_photos array
        const formData = new FormData();
        formData.append("step", currentStep.toString());
        // Don't append any photos - backend will interpret as empty array []
        requestBody = formData;
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      } else {
        // Should not reach here, but just in case
        setIsSkipLoading(false);
        return;
      }

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.onboarding, requestBody, config);

      if (response.success) {
        // Navigate to acceptTerms screen after successful skip
        if (currentStep === 10) {
          dispatch(goToNextStep());
        } else {
          router.replace(`/(main)/${MAIN_ROUTES.ACCEPT_TERMS}`);
        }
      } else {
        showBanner(
          "Error",
          response.message || "Failed to save step data",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to submit onboarding step:", error);
      showBanner(
        "Error",
        error.message || "Failed to save step data. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsSkipLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        // Prevent back navigation only if user is on the initial step they landed on from home
        if (isOnInitialStepFromHome) {
          return true; // Prevent back navigation
        }

        if (currentStep > 1) {
          if (currentStep === 4) {
            if (addressStage === "map") {
              // Clear map stage fields (selectedLocation) when going back to confirm
              // Keep confirm stage fields (streetAddress, area, zipCode, selectedAddress)
              dispatch(setSelectedLocation(null));
              dispatch(setAddressStage("confirm"));
              return true;
            }
            if (addressStage === "confirm") {
              // Keep confirm stage fields when going back to search
              dispatch(setAddressStage("search"));
              return true;
            }
          }
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
    }, [addressStage, currentStep, dispatch, isOnInitialStepFromHome])
  );

  const isContinueDisabled = useMemo(() => {
    if (currentStep === 1) {
      return !businessCategory;
    }
    if (currentStep === 2) {
      // Business name and full name are required
      const businessNameValid = businessName.trim().length > 0;
      const fullNameValid = fullName.trim().length > 0;

      // Phone is optional, but if provided, it must be valid
      const phoneProvided = phoneNumber.trim().length > 0;
      const phoneValid = !phoneProvided || phoneIsValid;

      // Validate names using validation service
      const businessNameValidation = validateName(
        businessName.trim(),
        "Business name"
      );
      const fullNameValidation = validateName(fullName.trim(), "Full name");

      // Enable continue if:
      // 1. Business name and full name are filled and valid
      // 2. Phone is either empty OR valid
      return (
        !businessNameValid ||
        !fullNameValid ||
        !businessNameValidation.isValid ||
        !fullNameValidation.isValid ||
        !phoneValid
      );
    }
    if (currentStep === 3) {
      return !appointmentVolume;
    }
    if (currentStep === 4) {
      if (addressStage === "search") {
        return true;
      }
      if (addressStage === "confirm") {
        return !streetAddress.trim() || !area.trim() || !state.trim();
      }
      return !selectedLocation;
    }
    if (currentStep === 5) {
      return !teamSize;
    }
    if (currentStep === 6) {
      // Step 6 is optional - can continue without invitations
      return false;
    }
    if (currentStep === 7) {
      // Step 7 is optional - can continue without setting business hours
      // User can set business hours later from settings
      return false;
    }
    if (currentStep === 8) {
      // Step 8: Disable continue if:
      // 1. No service templates available (no services found for category)
      // 2. Services are available but none selected (must select at least 1)

      // If no service templates available, disable continue
      if (serviceTemplates.length === 0) {
        return true;
      }

      // If services are available, must have at least 1 selected
      return services.length === 0;
    }
    if (currentStep === 9) {
      // Step 9 is optional - can continue without adding subscriptions
      return false;
    }
    if (currentStep === 10) {
      // Step 10: Disable continue if all social media usernames are empty
      // Enable if at least one username has value
      // Extract usernames from full URLs (remove prefix)
      const getUsername = (url: string, prefix: string) => {
        if (!url) return "";
        if (url.startsWith(prefix)) {
          return url.substring(prefix.length).trim();
        }
        return url.trim();
      };

      const tiktokUsername = getUsername(tiktokUrl, "www.tiktok.com/");
      const instagramUsername = getUsername(instagramUrl, "www.instagram.com/");
      const facebookUsername = getUsername(facebookUrl, "www.facebook.com/");

      const hasAnySocialMedia =
        tiktokUsername !== "" ||
        instagramUsername !== "" ||
        facebookUsername !== "";
      return !hasAnySocialMedia;
    }
    if (currentStep === 11) {
      // Step 11: Disable continue if no photos are selected
      return photos.length <= 0;
    }
    return false;
  }, [
    appointmentVolume,
    area,
    businessCategory,
    businessName,
    currentStep,
    fullName,
    phoneNumber,
    phoneIsValid,
    state,
    streetAddress,
    zipCode,
    addressStage,
    selectedLocation,
    teamSize,
    businessHours,
    services,
    serviceTemplates,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    photos,
  ]);

  const renderStep = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <StepOne />;
      case 2:
        return <StepTwo />;
      case 3:
        return <StepThree />;
      case 4:
        return <StepFour />;
      case 5:
        return <StepFive />;
      case 6:
        return <StepSix />;
      case 7:
        return <StepSeven />;
      case 8:
        return <StepEight />;
      case 9:
        return <StepNine />;
      case 10:
        return <StepTen />;
      case 11:
        return <StepEleven />;
      default:
        return null;
    }
  }, [currentStep]);

  const continueLabel = useMemo(() => {
    if (currentStep === totalSteps) {
      return "You're almost there";
    }
    if (currentStep === 4 && addressStage === "map") {
      return "Next";
    }
    return "Continue";
  }, [addressStage, currentStep, totalSteps]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CompleteProfileHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={handleBack}
        disableBack={isOnInitialStepFromHome}
      />
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep}
        </KeyboardAwareScrollView>
        <View style={styles.buttonWrapper}>
          {(currentStep === 10 || currentStep === 11) && (
            <>
              {currentStep == 11 && (
                <PrivacyBanner message="Our App will only have access to the photos that you select" />
              )}

              <TouchableOpacity
                style={[
                  styles.skipButton,
                  (isSubmitting || isSkipLoading) && styles.skipButtonDisabled,
                ]}
                onPress={handleSkip}
                disabled={isSubmitting || isSkipLoading}
                activeOpacity={0.7}
              >
                {isSkipLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={(colors as Theme).darkGreen}
                  />
                ) : (
                  <Text style={styles.skipButtonText}>Skip</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          <Button
            title={continueLabel}
            onPress={handleContinue}
            disabled={isContinueDisabled || isSubmitting || isSkipLoading}
            loading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
