import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  Pressable,
  Alert,
  Linking,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import FloatingInput from "@/src/components/floatingInput";
import {
  MapPinIcon,
  CloseIcon,
  ChevronDownIcon,
  StarIcon,
} from "@/assets/icons";
import ReviewSuggestionsDropdown from "@/src/components/ReviewSuggestionsDropdown";
import { ApiService } from "@/src/services/api";
import { reviewsEndpoints } from "@/src/services/endpoints";
import { StatusBar } from "react-native";
import { KeyboardAwareScrollView, KeyboardProvider } from "react-native-keyboard-controller";

export default function LeaveReview() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{
    business_id?: string;
    business_name?: string;
    business_address?: string;
    business_logo_url?: string;
    business_latitude?: string;
    business_longitude?: string;
  }>();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  const [showRatingScreen, setShowRatingScreen] = useState(true);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewDetails, setReviewDetails] = useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [reviewSuggestions, setReviewSuggestions] = useState<
    Array<{ id: number; title: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reviewTitleInputRef = useRef<View>(null);

  // Get business data from params
  const businessName = params.business_name || "Business Name";
  const businessAddress = params.business_address || "Business Address";
  const businessLogoUrl =
    params.business_logo_url ||
    "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg";
  const businessLatitude = params.business_latitude
    ? parseFloat(params.business_latitude)
    : null;
  const businessLongitude = params.business_longitude
    ? parseFloat(params.business_longitude)
    : null;

  const handleReviewModalNavigate = async () => {
    if (!businessLatitude || !businessLongitude) {
      Alert.alert("Error", "Location not available");
      return;
    }
    const encodedName = encodeURIComponent(businessName);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${businessLatitude},${businessLongitude}&query_place_id=${encodedName}`;

    try {
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        if (Platform.OS === "ios") {
          const appleMapsUrl = `http://maps.apple.com/?ll=${businessLatitude},${businessLongitude}&q=${encodedName}`;
          await Linking.openURL(appleMapsUrl);
        } else {
          Alert.alert("Error", "Unable to open maps");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open maps");
    }
  };

  const handleClearDescription = useCallback(() => {
    setReviewDetails("");
  }, []);

  // Fetch review suggestions
  useEffect(() => {
    const fetchReviewSuggestions = async () => {
      try {
        const response = await ApiService.get<{
          success: boolean;
          message: string;
          data: Array<{ id: number; title: string }>;
        }>(reviewsEndpoints.suggestions);

        if (response.success && response.data) {
          setReviewSuggestions(response.data);
          // showBanner(
          //   "Success",
          //   response.message || "Review suggestions loaded",
          //   "success",
          //   2000
          // );
        }
      } catch (error: any) {
        console.error("Failed to fetch review suggestions:", error);
        // showBanner(
        //   "Error",
        //   error.message || "Failed to load review suggestions",
        //   "error",
        //   3000
        // );
      }
    };

    fetchReviewSuggestions();
  }, [showBanner]);

  const handleSuggestionSelect = useCallback((title: string, id?: number) => {
    setReviewTitle(title);
    if (id) {
      setSelectedSuggestionId(id);
    }
    setShowSuggestionsDropdown(false);
  }, []);

  const handleStarPress = useCallback((selectedRating: number) => {
    setRating(selectedRating);
  }, []);

  const handleSendFeedback = useCallback(() => {
    if (rating > 0) {
      setShowRatingScreen(false);
    }
  }, [rating]);

  const handleBack = useCallback(() => {
    if (showSuccessScreen) {
      router.back();
      return;
    }
    if (!showRatingScreen) {
      setShowRatingScreen(true);
      return;
    }
    router.back();
  }, [showRatingScreen, showSuccessScreen, router]);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showSuccessScreen) {
          router.back();
          return true;
        }
        if (!showRatingScreen) {
          setShowRatingScreen(true);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [showRatingScreen, showSuccessScreen, router])
  );

  const handleContinue = async () => {
    if (!params.business_id) {
      showBanner("Error", "Business ID is required", "error", 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      const requestBody = {
        business_id: parseInt(params.business_id),
        overall_rating: rating,
        comment: reviewDetails.trim(),
        review_suggestion_id: selectedSuggestionId || null,
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(reviewsEndpoints.create, requestBody);

      if (response.success) {
        setShowSuccessScreen(true);
      } else {
        showBanner(
          "Error",
          response.message || "Failed to submit review",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      showBanner(
        "Error",
        error.message || "Failed to submit review. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExploreMore = useCallback(() => {
    router.back();
  }, [router]);

  const renderRatingScreen = () => (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Business Info */}
        {renderBusineesInfo()}
        <View style={styles.ratingScreenContainer}>
          <Text style={styles.ratingScreenTitle}>
            How was your experience from {businessName}
          </Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <StarIcon
                  width={widthScale(40)}
                  height={heightScale(40)}
                  color={star <= rating ? theme.orangeBrown : theme.lightGreen2}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.rateServiceTitle}>Rate the service</Text>

          <Text style={styles.ratingScreenDescription}>
            Your opinion matters to us. If you have a moment, tell us how was your
            experience?
          </Text>
        </View>
      </ScrollView>
      <View style={styles.sendFeedbackButtonContainer}>
        <Button
          title="Send feedback"
          onPress={handleSendFeedback}
          disabled={rating === 0}
        />
      </View>
    </>
  );

  const renderReviewForm = () => (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        bottomOffset={0}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Business Info */}
        {renderBusineesInfo()}

        {/* Heading */}
        <Text style={styles.heading}>Write your experience.</Text>
        <Text style={styles.subheading}>
          Help others discover the best services by sharing your visit.
        </Text>

        {/* Questions */}
        <Text style={styles.questions}>
          What did you love about the service? How was the stylist? Would you
          recommend this salon to others?
        </Text>

        {/* Review Title Input - Using FloatingInput with Dropdown */}
        <View style={styles.inputContainer}>
          <Pressable
            ref={reviewTitleInputRef}
            onPress={() => setShowSuggestionsDropdown(true)}
          >
            <FloatingInput
              label="Give your review a title."
              value={reviewTitle}
              onChangeText={() => { }}
              placeholder="Enter review title"
              editable={false}
              renderRightAccessory={({ isFocused, hasValue }) => (
                <View style={styles.dropdownArrowButton}>
                  <ChevronDownIcon
                    width={widthScale(12)}
                    height={heightScale(8)}
                    color={theme.darkGreen}
                  />
                </View>
              )}
              showClearButton={false}
            />
          </Pressable>
          <ReviewSuggestionsDropdown
            visible={showSuggestionsDropdown}
            suggestions={reviewSuggestions}
            onSelect={(title, id) => handleSuggestionSelect(title, id)}
            onClose={() => setShowSuggestionsDropdown(false)}
            buttonRef={reviewTitleInputRef}
          />
        </View>

        {/* Review Details Input - Using description style */}
        <View style={styles.inputContainer}>
          <Text style={styles.questions}>Review details.</Text>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={reviewDetails}
              onChangeText={setReviewDetails}
              placeholder="Share your experience..."
              placeholderTextColor={theme.lightGreen2}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
            {reviewDetails.length > 0 && (
              <Pressable
                onPress={handleClearDescription}
                style={styles.clearButton}
                hitSlop={moderateWidthScale(8)}
              >
                <CloseIcon color={theme.darkGreen} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
      <View style={styles.continueButtonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={isSubmitting}
          loading={isSubmitting}
        />
      </View>
    </View>
  );

  const renderBusineesInfo = () => (
    <View>
      {/* Business Info */}
      <View style={styles.businessInfo}>
        <Image source={{ uri: businessLogoUrl }} style={styles.businessLogo} />
        <View style={styles.businessInfoText}>
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.businessAddress}>{businessAddress}</Text>
        </View>
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={handleReviewModalNavigate}
        >
          <MapPinIcon
            width={widthScale(17)}
            height={heightScale(17)}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.line} />
    </View>
  );

  const renderSuccess = () => (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Business Info */}
        {renderBusineesInfo()}


        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Thank you for your review!</Text>

          <Text style={styles.successDescription}>
            Your feedback helps others discover the perfect salon and service. It
            also helps our partner businesses continue to improve.
          </Text>

          <Text style={styles.successDescription}>
            Reviews are typically posted within 24 hours but can sometimes take
            longer - we're working to get your review live as soon as possible!
          </Text>
        </View>
      </ScrollView>
      <View style={styles.sendFeedbackButtonContainer}>
        <Button title="Explore more" onPress={handleExploreMore} />
      </View>
    </>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <StackHeader title="Leave review" onBack={handleBack} />
      <StatusBar barStyle={"dark-content"} />
      {showSuccessScreen
        ? renderSuccess()
        : showRatingScreen
          ? renderRatingScreen()
          : renderReviewForm()}
    </SafeAreaView>

  );
}
