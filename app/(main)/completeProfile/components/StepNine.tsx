import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  addSubscription,
  removeSubscription,
  setBusinessServices,
} from "@/src/state/slices/completeProfileSlice";
import EditSubscriptionBottomSheet from "@/src/components/EditSubscriptionBottomSheet";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { AiToolsService } from "@/src/services/aiToolsService";
import GeneratedSubscriptionPlansModal from "@/src/components/GeneratedSubscriptionPlansModal";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setActionLoader,
  setActionLoaderTitle,
} from "@/src/state/slices/generalSlice";
import { Portal } from "@gorhom/portal";
import { useTranslation } from "react-i18next";

// Popular starting points suggestions - will be populated with first 2 services from Step 8
const getPopularSuggestions = (
  services: Array<{ id: string; name: string }>,
) => {
  const firstTwoServiceIds = services.slice(0, 2).map((s) => s.id);

  return [
    {
      id: "basic_plan",
      packageName: "Basic Plan",
      description: "",
      servicesPerMonth: 2,
      price: 145.99,
      currency: "USD",
      serviceIds: firstTwoServiceIds,
    },
  ];
};

const formatPrice = (price: number, currency: string): string => {
  return `$${price.toFixed(2)} ${currency}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
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
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    popularSection: {
      // gap: moderateHeightScale(12),
    },
    popularTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen4,
    },
    suggestionSeparator: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(15),
    },
    suggestionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    selectButtonWrapper: {
      position: "relative",
      alignSelf: "flex-start",
    },
    selectButtonShadow: {
      position: "absolute",
      top: moderateHeightScale(3),
      left: moderateWidthScale(3),
      right: moderateWidthScale(-3),
      bottom: moderateHeightScale(-3),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen2,
    },
    selectButton: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderBottomWidth: moderateWidthScale(2),
      borderRightWidth: moderateWidthScale(2),
      backgroundColor: theme.background,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      zIndex: 1,
    },
    selectButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    selectedButton: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    viewMoreButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      width: "100%",
      backgroundColor: theme.grey15,
      borderRadius: moderateWidthScale(12),
    },
    viewMoreButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subscriptionsContainer: {
      gap: moderateHeightScale(16),
    },
    subscriptionCard: {
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      borderWidth: 0.5,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
    },
    subscriptionSeparator: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
    },

    subscriptionInfo: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    subscriptionName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subscriptionDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      marginTop: moderateHeightScale(4),
    },
    subscriptionDetails: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    subscriptionPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    editButton: {
      marginLeft: moderateWidthScale(8),
    },
    subscriptionCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    subscriptionCardContent: {
      marginTop: moderateHeightScale(12),
    },
    subscriptionDetailSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      // marginBottom: moderateHeightScale(12),
    },
    subscriptionDetailTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    subscriptionDetailPrice: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    subscriptionPriceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subscriptionServicesList: {
      marginTop: moderateHeightScale(6),
      gap: moderateHeightScale(2),
    },
    subscriptionServiceItem: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    aiToolButtonContainer: {
      minWidth: moderateWidthScale(50),
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      position: "absolute",
      right: moderateWidthScale(20),
      opacity: 0.9,
    },
    aiTooltipOverlayBox: {
      position: "absolute",
      bottom: moderateHeightScale(56 + 14),
      right: 0,
      left: moderateWidthScale(-200),
      minWidth: moderateWidthScale(220),
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingRight: moderateWidthScale(32),
      borderWidth: 1,
      borderColor: theme.borderLine,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 8,
    },
    aiTooltipOverlayText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    aiTooltipOverlayClose: {
      position: "absolute",
      top: moderateHeightScale(6),
      right: moderateWidthScale(6),
      padding: moderateWidthScale(4),
    },
    aiToolButton: {
      width: moderateWidthScale(56),
      height: moderateWidthScale(56),
      borderRadius: moderateWidthScale(28),
      backgroundColor: theme.darkGreenLight,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });

export default function StepNine() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const businessId = user?.business_id ?? "";
  const { subscriptions, businessServices } = useAppSelector(
    (state) => state.completeProfile,
  );

  // Button bottom offset for fixed positioning
  const buttonBottomOffset = moderateHeightScale(40);
  const [editSubscriptionVisible, setEditSubscriptionVisible] = useState(false);
  const [addSubscriptionVisible, setAddSubscriptionVisible] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<
    string | null
  >(null);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAiTooltipOverlay, setShowAiTooltipOverlay] = useState(true);
  // Store custom suggestions added via "+" button (not in Redux subscriptions)
  const [customSuggestions, setCustomSuggestions] = useState<
    Array<{
      id: string;
      packageName: string;
      description?: string;
      servicesPerMonth: number;
      price: number;
      currency: string;
      serviceIds: string[];
    }>
  >([]);

  // Animation values for AI tool button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const starAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
    })),
  ).current;

  const dismissAiTooltipOverlay = () => {
    setShowAiTooltipOverlay(false);
  };

  // Start animations when component mounts
  useEffect(() => {
    // Pulse/zoom animation for button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    // Rotate animation for icon
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );

    // Sparkling stars animation
    const starAnimationsLoop = starAnimations.map((star, index) => {
      const angle = (index * 60 * Math.PI) / 180; // 6 stars, 60 degrees apart
      const radius = moderateWidthScale(35);

      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(star.opacity, {
              toValue: 1,
              duration: 500,
              delay: index * 100,
              useNativeDriver: true,
            }),
            Animated.timing(star.scale, {
              toValue: 1,
              duration: 500,
              delay: index * 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(star.opacity, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(star.scale, {
              toValue: 0.8,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(star.rotate, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(star.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(star.scale, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    });

    pulseAnimation.start();
    rotateAnimation.start();
    starAnimationsLoop.forEach((anim) => anim.start());

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      starAnimationsLoop.forEach((anim) => anim.stop());
    };
  }, []);

  // Fetch business services on component mount
  useEffect(() => {
    fetchBusinessServices();
  }, []);

  const fetchBusinessServices = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          template_id: number;
          price: string;
          description: string;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          businessId: number;
          business: string;
          templateId: number;
          name: string;
          category: string;
          created_at: string;
          createdAt: string;
        }>;
      }>(businessEndpoints.services);

      if (response.success && response.data) {
        dispatch(setBusinessServices(response.data));
      }
    } catch (error) {
      Logger.error("Failed to fetch business services:", error);
      // Silent fail - no loader/error shown as per requirement
    }
  };

  // Convert business services to service format for suggestions
  // Use id (business service id) for API calls
  const services = useMemo(() => {
    return businessServices.map((service) => ({
      id: service.id.toString(),
      name: service.name,
    }));
  }, [businessServices]);

  // Get popular suggestions with first 2 services from business services
  const predefinedSuggestions = useMemo(
    () => getPopularSuggestions(services),
    [services],
  );

  // Combine predefined and custom suggestions
  const popularSuggestions = useMemo(
    () => [...predefinedSuggestions, ...customSuggestions],
    [predefinedSuggestions, customSuggestions],
  );

  const handleSelectSuggestion = (
    suggestion: (typeof popularSuggestions)[0],
  ) => {
    const isSelected = subscriptions.some((s) => s.id === suggestion.id);
    if (isSelected) {
      dispatch(removeSubscription(suggestion.id));
    } else {
      dispatch(addSubscription(suggestion));
      // If it's a custom suggestion, remove it from customSuggestions
      setCustomSuggestions((prev) =>
        prev.filter((custom) => custom.id !== suggestion.id),
      );
    }
  };

  const handleDeleteSubscription = (subscriptionId: string) => {
    dispatch(removeSubscription(subscriptionId));
  };

  const handleEditSubscription = (subscriptionId: string) => {
    setEditingSubscriptionId(subscriptionId);
    setEditSubscriptionVisible(true);
  };

  const handleCloseEditSubscription = () => {
    setEditSubscriptionVisible(false);
    setEditingSubscriptionId(null);
  };

  const handleOpenAddSubscription = () => {
    setAddSubscriptionVisible(true);
  };

  const handleCloseAddSubscription = () => {
    setAddSubscriptionVisible(false);
  };

  const handleAddCustomSuggestion = (subscription: {
    id: string;
    packageName: string;
    description?: string;
    servicesPerMonth: number;
    price: number;
    currency: string;
    serviceIds: string[];
  }) => {
    setCustomSuggestions((prev) => [...prev, subscription]);
  };

  const getServiceNames = (serviceIds: string[]): string[] => {
    return serviceIds
      .map((id) => {
        // Find service in businessServices by id (business service id)
        const service = businessServices.find((s) => s.id.toString() === id);
        return service?.name;
      })
      .filter(Boolean) as string[];
  };

  // Filter out selected subscriptions from popular suggestions
  const unselectedSuggestions = popularSuggestions.filter(
    (s) => !subscriptions.some((sub) => sub.id === s.id),
  );

  const onClickAi = async () => {
    if (showAiTooltipOverlay) dismissAiTooltipOverlay();
    if (generatedResult) {
      setModalVisible(true);
    } else {
      if (!businessId) {
        showBanner(
          "Error",
          "Business ID not found. Please complete your business profile.",
          "error",
          3000,
        );
        return;
      }

      dispatch(setActionLoader(true));
      dispatch(setActionLoaderTitle("Generating subscription plans"));

      try {
        const response = await AiToolsService.generateSubscription(
          Number(businessId),
        );

        if (response.status === "success" && response.generated_plans) {
          setGeneratedResult(response);
          setModalVisible(true);
        } else {
          showBanner(
            "Error",
            "Failed to generate subscription plans. Please try again.",
            "error",
            3000,
          );
        }
      } catch (error: any) {
        Logger.error("Failed to generate subscription plans:", error);
        showBanner(
          "Error",
          error?.message ||
            "Failed to generate subscription plans. Please try again.",
          "error",
          3000,
        );
      } finally {
        dispatch(setActionLoader(false));
        dispatch(setActionLoaderTitle(""));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Create subscription plans</Text>
        <Text style={styles.subtitle}>
          Offer monthly memberships to attract loyal customers and secure
          recurring revenue.
        </Text>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You haven't added any subscription yet
          </Text>
        </View>
      ) : (
        <View style={styles.subscriptionsContainer}>
          {subscriptions.map((subscription) => {
            const serviceNames = getServiceNames(subscription.serviceIds);
            return (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionCardHeader}>
                  <View style={styles.subscriptionInfo}>
                    <Text style={styles.subscriptionName}>
                      {subscription.packageName}
                    </Text>
                    {subscription.description ? (
                      <Text
                        style={styles.subscriptionDescription}
                        numberOfLines={2}
                      >
                        {subscription.description}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={{
                      width: moderateWidthScale(50),
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                    onPress={() => handleEditSubscription(subscription.id)}
                  >
                    <Feather
                      name="chevron-right"
                      size={moderateWidthScale(20)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.subscriptionSeparator} />
                <View style={styles.subscriptionCardContent}>
                  <View style={styles.subscriptionDetailSection}>
                    <Text style={styles.subscriptionDetailTitle}>
                      Subscription detail
                    </Text>
                    <View style={styles.subscriptionDetailPrice}>
                      <Text style={styles.subscriptionPriceText}>
                        {formatPrice(subscription.price, subscription.currency)}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteSubscription(subscription.id)
                        }
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={moderateWidthScale(19)}
                          color={theme.red}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.subscriptionServicesList}>
                    {serviceNames.map((serviceName, serviceIndex) => (
                      <Text
                        key={serviceIndex}
                        style={styles.subscriptionServiceItem}
                      >
                        {serviceIndex + 1}. {serviceName}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.popularSection}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={styles.popularTitle}>Popular starting points:</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenAddSubscription}
            style={{
              width: moderateWidthScale(20),
              height: moderateWidthScale(20),
              borderRadius: moderateWidthScale(20 / 2),
              backgroundColor: theme.orangeBrown,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Feather
              name="plus"
              size={moderateWidthScale(16)}
              color={theme.white}
            />
          </TouchableOpacity>
        </View>

        {unselectedSuggestions.length > 0 && (
          <>
            {unselectedSuggestions.map((suggestion) => {
              const isSelected = subscriptions.some(
                (s) => s.id === suggestion.id,
              );
              return (
                <View key={suggestion.id}>
                  <TouchableOpacity
                    onPress={() => handleSelectSuggestion(suggestion)}
                    activeOpacity={0.7}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionText}>
                      {suggestion.packageName}
                    </Text>
                    <View style={styles.selectButtonWrapper}>
                      <View style={styles.selectButtonShadow} />
                      <View
                        style={[
                          styles.selectButton,
                          isSelected && styles.selectedButton,
                        ]}
                      >
                        {isSelected && (
                          <Feather
                            name="check"
                            size={moderateWidthScale(12)}
                            color={theme.darkGreen}
                          />
                        )}
                        <Text style={[styles.selectButtonText]}>
                          {isSelected ? "Selected" : "Select"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.suggestionSeparator} />
                </View>
              );
            })}
          </>
        )}
      </View>

      <EditSubscriptionBottomSheet
        visible={editSubscriptionVisible}
        onClose={handleCloseEditSubscription}
        subscriptionId={editingSubscriptionId}
      />

      <EditSubscriptionBottomSheet
        visible={addSubscriptionVisible}
        onClose={handleCloseAddSubscription}
        subscriptionId={null}
        onAddCustomSuggestion={handleAddCustomSuggestion}
      />

      {/* AI Tool Button - Fixed Position using Portal */}
      <Portal>
        <View
          style={[
            styles.aiToolButtonContainer,
            {
              bottom: buttonBottomOffset + 180,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Sparkling Stars */}
          {starAnimations.map((star, index) => {
            const angle = (index * 60 * Math.PI) / 180; // 6 stars, 60 degrees apart
            const radius = moderateWidthScale(35);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const rotateInterpolate = star.rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  {
                    position: "absolute",
                    left: moderateWidthScale(28) + x - moderateWidthScale(6),
                    top: moderateHeightScale(28) + y - moderateHeightScale(6),
                    transform: [
                      { scale: star.scale },
                      { rotate: rotateInterpolate },
                    ],
                    opacity: star.opacity,
                  },
                ]}
              >
                <MaterialIcons
                  name="star"
                  size={moderateWidthScale(12)}
                  color={theme.white}
                />
              </Animated.View>
            );
          })}

          {/* First-time overlay: tap to create subscription with AI */}
          {showAiTooltipOverlay && (
            <View style={styles.aiTooltipOverlayBox} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.aiTooltipOverlayClose}
                onPress={dismissAiTooltipOverlay}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="x"
                  size={moderateWidthScale(18)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <Text style={styles.aiTooltipOverlayText}>
                {t("tapToCreateSubscriptionWithAi")}
              </Text>
            </View>
          )}

          {/* Ai Tool Button with Zoom Animation */}
          <TouchableOpacity activeOpacity={0.8} onPress={onClickAi}>
            <Animated.View
              style={[
                styles.aiToolButton,
                {
                  transform: [
                    { scale: scaleAnim },
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons
                name="auto-awesome"
                size={moderateWidthScale(28)}
                color={theme.white}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Portal>

      <GeneratedSubscriptionPlansModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        plans={generatedResult?.generated_plans || []}
        onSelectedPlans={(selectedPlans) => {
          // Convert selected plans from modal format to subscription format
          let addedCount = 0;
          selectedPlans.forEach((plan) => {
            // Check if a subscription with the same name already exists
            const existingSubscription = subscriptions.find(
              (sub: { packageName: string }) =>
                sub.packageName.toLowerCase() === plan.name.toLowerCase(),
            );

            if (existingSubscription) {
              // Skip if already exists
              return;
            }

            // Generate a unique ID for the subscription
            const subscriptionId = `ai-generated-${plan.tier.toLowerCase()}-${plan.name
              .toLowerCase()
              .replace(/\s+/g, "-")}-${Date.now()}`;

            // Convert services_included array to serviceIds array
            // Filter out services with null/undefined IDs before mapping
            const serviceIds = plan.services_included
              .filter((service) => service.id != null)
              .map((service) => service.id.toString());

            // Create subscription object in the required format
            // Description defaults to empty when adding from AI-generated plans
            const subscription = {
              id: subscriptionId,
              packageName: plan.name,
              description: "",
              servicesPerMonth: plan.visits_included,
              price: plan.monthly_price,
              currency: plan.currency,
              serviceIds: serviceIds,
            };

            // Add subscription to the list
            dispatch(addSubscription(subscription));
            addedCount++;
          });

          // Show success message
          if (addedCount > 0) {
            showBanner(
              "Success",
              `${addedCount} subscription plan${
                addedCount > 1 ? "s" : ""
              } added successfully`,
              "success",
              3000,
            );
          } else if (selectedPlans.length > 0) {
            showBanner(
              "Info",
              "Selected plans are already in your subscription list",
              "info",
              3000,
            );
          }
        }}
      />
    </View>
  );
}
