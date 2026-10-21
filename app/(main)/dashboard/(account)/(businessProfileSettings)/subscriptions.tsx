import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { Skeleton } from "@/src/components/skeletons";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { AiToolsService } from "@/src/services/aiToolsService";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  addSubscription,
  removeSubscription,
  setBusinessServices,
  setSubscriptions,
} from "@/src/state/slices/completeProfileSlice";
import EditSubscriptionBottomSheet from "@/src/components/EditSubscriptionBottomSheet";
import GeneratedSubscriptionPlansModal from "@/src/components/GeneratedSubscriptionPlansModal";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setActionLoader,
  setActionLoaderTitle,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";

interface ModuleSubscriptionService {
  id: number;
  name: string;
  quantity?: number;
}

interface ModuleSubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  plan_type: string;
  active: boolean;
  visits: number;
  created_at: string;
  services: ModuleSubscriptionService[];
}

const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

const getSuggestionIdForName = (name: string) => {
  const normalized = name.trim().toLowerCase();

  if (normalized === "vip glam package") {
    return "vip-glam-package";
  }
  if (normalized === "gold package") {
    return "gold-package";
  }
  if (normalized === "platinum package") {
    return "platinum-package";
  }
  if (normalized === "silver package") {
    return "silver-package";
  }

  return null;
};

// Popular starting points suggestions - will be populated with first 2 services
const getPopularSuggestions = (
  services: Array<{ id: string; name: string }>,
) => {
  const firstTwoServiceIds = services.slice(0, 2).map((s) => s.id);
  const serviceCounts = firstTwoServiceIds.reduce<Record<string, number>>(
    (acc, serviceId) => {
      acc[serviceId] = 1;
      return acc;
    },
    {},
  );

  return [
    {
      id: "basic_plan",
      packageName: "Basic Plan",
      servicesPerMonth: 2,
      price: 145.99,
      currency: "USD",
      serviceIds: firstTwoServiceIds,
      serviceCounts,
    },
  ];
};

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
      paddingVertical: moderateHeightScale(20),
      gap: moderateHeightScale(14),
    },
    sectionLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
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
    infoCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(16),
      gap: moderateHeightScale(12),
    },
    infoHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    infoIconWrap: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    infoHeaderText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    infoBodyText: {
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
    subscriptionsContainer: {
      gap: moderateHeightScale(16),
    },
    actionRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    addMembershipButton: {
      flex: 1,
      minHeight: moderateHeightScale(48),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(12),
    },
    addMembershipText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    createAiButton: {
      flex: 1,
      minHeight: moderateHeightScale(48),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      backgroundColor: theme.tilePeach,
      paddingHorizontal: moderateWidthScale(12),
    },
    createAiText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subscriptionCard: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(18),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    subscriptionCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
    },
    subscriptionName: {
      flex: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    editButton: {
      minHeight: moderateWidthScale(36),
      paddingLeft: moderateWidthScale(12),
      alignItems: "flex-end",
      justifyContent: "center",
    },
    editText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.orangeBrownText,
    },
    subscriptionDescription: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: moderateHeightScale(-2),
      gap: moderateWidthScale(4),
    },
    priceText: {
      fontSize: fontSize.size24 * 1.5,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    perMonthText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    accentBar: {
      width: moderateWidthScale(44),
      height: moderateHeightScale(3),
      borderRadius: moderateHeightScale(2),
      backgroundColor: theme.orangeBrown,
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(16),
    },
    includedLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    includedList: {
      gap: moderateHeightScale(8),
    },
    includedItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    checkCircle: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    includedText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    includedCount: {
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
    visitsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(14),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.tilePeach,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
    },
    visitsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    popularSection: {},
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
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    // Styles for BusinessPlans skeleton
    plansContainer: {
      gap: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    planCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      padding: moderateWidthScale(20),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(12),
    },
  });

export default function ManageSubscriptionsScreen() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((state) => state.user);
  const businessId = user?.business_id ?? "";
  const canCreatePlans =
    user?.businessStatus?.stripe_onboarding_status === "completed";

  const requireStripeToCreate = () => {
    if (canCreatePlans) return true;
    dispatch(setStripeConnectModalVisible(true));
    return false;
  };

  const { subscriptions, businessServices } = useAppSelector(
    (state) => state.completeProfile,
  );

  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<
    string | null
  >(null);
  // Map of local subscription id (could be suggestion id) -> backend subscription plan id
  const [subscriptionPlanIdMap, setSubscriptionPlanIdMap] = useState<
    Record<string, number>
  >({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [editSubscriptionVisible, setEditSubscriptionVisible] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<
    string | null
  >(null);
  const [addSubscriptionVisible, setAddSubscriptionVisible] = useState(false);
  const [customSuggestions, setCustomSuggestions] = useState<
    Array<{
      id: string;
      packageName: string;
      servicesPerMonth: number;
      price: number;
      currency: string;
      serviceIds: string[];
      serviceCounts?: Record<string, number>;
    }>
  >([]);

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
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          subscription_plans: ModuleSubscriptionPlan[];
        };
      }>(businessEndpoints.moduleData("subscription-plans"));

      if (
        response.success &&
        response.data &&
        response.data.subscription_plans
      ) {
        const mapped = response.data.subscription_plans.map((plan) => {
          const suggestionId = getSuggestionIdForName(plan.name);

          return {
            // If this matches one of our default suggestions, use that id
            // so it is treated as "already selected" in the popular list
            id: suggestionId ?? plan.id.toString(),
            packageName: plan.name,
            description: plan.description || undefined,
            servicesPerMonth: plan.visits,
            price: parseFloat(plan.price),
            currency: "USD",
            serviceIds: plan.services.map((service) => service.id.toString()),
            serviceCounts: plan.services.reduce<Record<string, number>>(
              (acc, service) => {
                acc[service.id.toString()] = service.quantity ?? 1;
                return acc;
              },
              {},
            ),
          };
        });

        const planIdMap: Record<string, number> = {};
        response.data.subscription_plans.forEach((plan) => {
          const suggestionId = getSuggestionIdForName(plan.name);
          if (suggestionId) {
            planIdMap[suggestionId] = plan.id;
          }
          planIdMap[plan.id.toString()] = plan.id;
        });

        setSubscriptionPlanIdMap(planIdMap);
        dispatch(setSubscriptions(mapped));
      } else {
        setSubscriptionPlanIdMap({});
        dispatch(setSubscriptions([]));
      }
    } catch (error: any) {
      Logger.error("Failed to fetch subscription plans module data:", error);
      showBanner(
        "Error",
        error?.message ||
          "Failed to fetch subscription plans. Please try again.",
        "error",
        3000,
      );
      setSubscriptionPlanIdMap({});
      dispatch(setSubscriptions([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessServices();
    fetchSubscriptions();
  }, []);

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

  const getServiceItems = (
    serviceIds: string[],
    serviceCounts?: Record<string, number>,
  ) => {
    return serviceIds
      .map((id) => {
        const service = businessServices.find((s) => s.id.toString() === id);
        if (!service) return null;
        return { id, name: service.name, count: serviceCounts?.[id] || 1 };
      })
      .filter((value): value is { id: string; name: string; count: number } =>
        Boolean(value),
      );
  };

  const confirmDeleteSubscription = (
    subscriptionId: string,
    subscriptionName: string,
  ) => {
    if (deletingSubscriptionId) {
      return;
    }

    Alert.alert(
      "Delete membership",
      `Are you sure you want to delete "${subscriptionName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteSubscription(subscriptionId),
        },
      ],
    );
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    const backendPlanId = subscriptionPlanIdMap[subscriptionId];

    // If plan exists on backend, delete via API
    if (backendPlanId) {
      setDeletingSubscriptionId(subscriptionId);
      try {
        const response = await ApiService.delete<{
          success: boolean;
          message: string;
        }>(`/api/subscription-plan/${backendPlanId}`);

        if (response.success) {
          dispatch(removeSubscription(subscriptionId));
          setSubscriptionPlanIdMap((prev) => {
            const updated = { ...prev };
            delete updated[subscriptionId];
            return updated;
          });
          showBanner(
            "Success",
            response.message || "Subscription plan deleted successfully.",
            "success",
            3000,
          );
        } else {
          showBanner(
            "Error",
            response.message || "Failed to delete subscription plan.",
            "error",
            3000,
          );
        }
      } catch (error: any) {
        Logger.error("Failed to delete subscription plan:", error);
        showBanner(
          "Error",
          error?.message ||
            "Failed to delete subscription plan. Please try again.",
          "error",
          3000,
        );
      } finally {
        setDeletingSubscriptionId(null);
      }
      return;
    }

    // For newly added plans (not yet saved on backend), just remove from local list
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
    if (!requireStripeToCreate()) return;
    setAddSubscriptionVisible(true);
  };

  const handleCloseAddSubscription = () => {
    setAddSubscriptionVisible(false);
  };

  const handleAddCustomSuggestion = (subscription: {
    id: string;
    packageName: string;
    description?: string;
    price: number;
    currency: string;
    serviceIds: string[];
    serviceCounts?: Record<string, number>;
    servicesPerMonth?: number;
  }) => {
    if (!requireStripeToCreate()) return;
    setCustomSuggestions((prev) => [
      ...prev,
      {
        ...subscription,
        servicesPerMonth:
          typeof subscription.servicesPerMonth === "number" &&
          subscription.servicesPerMonth >= 1
            ? subscription.servicesPerMonth
            : Object.values(subscription.serviceCounts || {}).reduce(
                (sum, qty) => sum + (qty || 0),
                0,
              ) || 1,
      },
    ]);
  };

  const handleSelectSuggestion = (
    suggestion: (typeof popularSuggestions)[0],
  ) => {
    if (!requireStripeToCreate()) return;
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

  const handleUpdate = async () => {
    if (!requireStripeToCreate()) return;
    setIsUpdating(true);
    try {
      const payload = subscriptions.map((subscription) => {
        const planServices = subscription.serviceIds.map((id) => Number(id));
        const serviceQuantities = subscription.serviceIds.reduce<
          Record<string, number>
        >((acc, id) => {
          acc[id] = subscription.serviceCounts?.[id] ?? 1;
          return acc;
        }, {});

        return {
          name: subscription.packageName,
          description: subscription.description ?? subscription.packageName,
          price: subscription.price,
          visits_included: Math.max(
            1,
            Object.values(serviceQuantities).reduce((sum, qty) => sum + qty, 0),
          ),
          plan_services: planServices,
          service_quantities: serviceQuantities,
        };
      });

      const formData = new FormData();
      formData.append("subscription_plans", JSON.stringify(payload));

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
          response.message || "Subscription plans updated successfully",
          "success",
          3000,
        );
        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update subscription plans",
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to update subscription plans:", error);
      showBanner(
        "Error",
        error?.message ||
          "Failed to update subscription plans. Please try again.",
        "error",
        3000,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter out selected subscriptions from popular suggestions
  const unselectedSuggestions = popularSuggestions.filter(
    (s) => !subscriptions.some((sub) => sub.id === s.id),
  );

  const onClickAi = async () => {
    if (!requireStripeToCreate()) return;
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

        if (
          response.status === "success" &&
          response.generated_plans.length > 0
        ) {
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
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("membershipList")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="BusinessPlans" styles={styles} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {canCreatePlans
                ? "Customer membership plans"
                : t("subscriptionPlansConnectStripeHint")}
            </Text>

            {canCreatePlans && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.addMembershipButton}
                  onPress={handleOpenAddSubscription}
                  accessibilityRole="button"
                >
                  <Feather
                    name="plus"
                    size={moderateWidthScale(18)}
                    color={theme.white}
                  />
                  <Text style={styles.addMembershipText} numberOfLines={1}>
                    Add Membership
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.createAiButton}
                  onPress={onClickAi}
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={moderateWidthScale(18)}
                    color={theme.orangeBrown}
                  />
                  <Text style={styles.createAiText} numberOfLines={1}>
                    Create with AI
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!canCreatePlans && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconWrap}>
                    <Feather
                      name="info"
                      size={moderateWidthScale(18)}
                      color={theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.infoHeaderText}>
                    {t("subscriptionPlansConnectStripeRequired")}
                  </Text>
                </View>
                <Text style={styles.infoBodyText}>
                  {t("subscriptionPlansConnectStripeHint")}
                </Text>
              </View>
            )}

            {subscriptions.length === 0 ? (
              canCreatePlans ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    You haven't added any subscription yet
                  </Text>
                </View>
              ) : null
            ) : (
              <View style={styles.subscriptionsContainer}>
                {subscriptions.map((subscription) => {
                  const serviceItems = getServiceItems(
                    subscription.serviceIds,
                    subscription.serviceCounts,
                  );
                  const description = subscription.description?.trim();
                  const showDescription =
                    !!description &&
                    description.toLowerCase() !==
                      subscription.packageName.trim().toLowerCase();
                  const totalUses = serviceItems.reduce(
                    (sum, item) => sum + item.count,
                    0,
                  );
                  return (
                    <View key={subscription.id} style={styles.subscriptionCard}>
                      <View style={styles.subscriptionCardHeader}>
                        <Text style={styles.subscriptionName}>
                          {subscription.packageName}
                        </Text>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() =>
                            handleEditSubscription(subscription.id)
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${subscription.packageName}`}
                        >
                          <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                      {showDescription ? (
                        <Text
                          style={styles.subscriptionDescription}
                          numberOfLines={2}
                        >
                          {description}
                        </Text>
                      ) : null}
                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>
                          {formatPrice(subscription.price)}
                        </Text>
                        <Text style={styles.perMonthText}>/month</Text>
                      </View>
                      <View style={styles.accentBar} />
                      {serviceItems.length > 0 ? (
                        <>
                          <Text style={styles.includedLabel}>
                            Included each month
                          </Text>
                          <View style={styles.includedList}>
                            {serviceItems.map((item) => (
                              <View key={item.id} style={styles.includedItem}>
                                <View style={styles.checkCircle}>
                                  <Feather
                                    name="check"
                                    size={moderateWidthScale(13)}
                                    color={theme.white}
                                  />
                                </View>
                                <Text style={styles.includedText}>
                                  <Text style={styles.includedCount}>
                                    {item.count}
                                  </Text>
                                  {"  "}
                                  {item.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : null}
                      {totalUses > 0 ? (
                        <View style={styles.visitsPill}>
                          <Feather
                            name="calendar"
                            size={moderateWidthScale(18)}
                            color={theme.orangeBrownText}
                          />
                          <Text style={styles.visitsText}>
                            {totalUses} service{totalUses === 1 ? "" : "s"} to
                            use anytime this month
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {canCreatePlans && unselectedSuggestions.length > 0 && (
              <View style={styles.popularSection}>
                <Text style={styles.popularTitle}>
                  Popular starting points:
                </Text>

              {unselectedSuggestions.length > 0 &&
                unselectedSuggestions.map((suggestion) => {
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
                            <Text style={styles.selectButtonText}>
                              {isSelected ? "Selected" : "Select"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.suggestionSeparator} />
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          {canCreatePlans ? (
            <Button
              title={t("updateProfileToApply")}
              onPress={handleUpdate}
              disabled={isUpdating}
            />
          ) : (
            <Button
              title={t("connectNow")}
              onPress={() => dispatch(setStripeConnectModalVisible(true))}
            />
          )}
        </View>
      )}

      <EditSubscriptionBottomSheet
        visible={editSubscriptionVisible}
        onClose={handleCloseEditSubscription}
        subscriptionId={editingSubscriptionId}
        onDelete={(id) => {
          const name =
            subscriptions.find((sub) => sub.id === id)?.packageName ?? "";
          handleCloseEditSubscription();
          confirmDeleteSubscription(id, name);
        }}
      />

      <EditSubscriptionBottomSheet
        visible={addSubscriptionVisible}
        onClose={handleCloseAddSubscription}
        subscriptionId={null}
        onAddCustomSuggestion={handleAddCustomSuggestion}
      />

      <GeneratedSubscriptionPlansModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        plans={generatedResult?.generated_plans || []}
        onSelectedPlans={(selectedPlans) => {
          if (!requireStripeToCreate()) return;
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

            // // Convert services_included array to serviceIds array
            // const serviceIds = plan.services_included.map((service) =>
            //   service.id.toString()
            // );

            const serviceIds = plan.services_included
              .filter(
                (service) => Number.isFinite(service.id) && service.id > 0,
              )
              .map((service) => service.id.toString());
            const serviceCounts = plan.services_included.reduce<
              Record<string, number>
            >((acc, service) => {
              if (Number.isFinite(service.id) && service.id > 0) {
                acc[service.id.toString()] = service.count;
              }
              return acc;
            }, {});

            // Create subscription object in the required format
            const subscription = {
              id: subscriptionId,
              packageName: plan.name,
              servicesPerMonth: plan.visits_included,
              price: plan.monthly_price,
              currency: plan.currency,
              serviceIds: serviceIds,
              serviceCounts,
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
    </SafeAreaView>
  );
}
