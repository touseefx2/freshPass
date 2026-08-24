import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { resolveTrialDays } from "@/src/services/remoteConfigService";

const isUnlimitedPlan = (plan: SubscriptionPlan): boolean => {
  const planType = plan.planType?.toLowerCase() ?? "";
  const name = plan.name?.toLowerCase() ?? "";
  return planType.includes("unlimited") || name.includes("unlimited");
};

const isSoloPlan = (plan: SubscriptionPlan): boolean => {
  if (plan.is_solo === true) return true;
  if (plan.is_solo === false) return false;
  const name = plan.name?.toLowerCase() ?? "";
  const planType = plan.planType?.toLowerCase() ?? "";
  return name.includes("solo") || planType.includes("solo");
};

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  planType: string;
  active: boolean;
  visits: number | null;
  createdAt: string;
  services: any[];
  app_store_product_id?: string | null;
  is_solo?: boolean;
}

type PlanTab = "solo" | "business";

function SelectedPlanStatus({ label }: { label: string }) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.selectedStatus,
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.82, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Feather
        name="check-circle"
        size={iconScale(18)}
        color={theme.buttonBack}
      />
      <Text style={styles.selectedStatusText}>{label}</Text>
    </Animated.View>
  );
}

export interface AdditionalService {
  id: number;
  name: string;
  price: string;
  type: string;
  active: boolean;
  createdAt: string;
}

interface BusinessPlansPreviewModalProps {
  visible?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  selectedPlanId?: number | null;
  onSelectPlan?: (planId: number) => void;
  plans: SubscriptionPlan[];
  additionalServices: AdditionalService[];
  loading: boolean;
  loadingAdditionalServices: boolean;
  error: string | null;
  apiError: boolean;
  onRetry: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    closeButton: {
      padding: moderateWidthScale(8),
      marginLeft: moderateWidthScale(12),
    },
    introSection: {
      flexDirection: "column",
      paddingLeft: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      paddingRight: moderateWidthScale(4),
      borderLeftWidth: 4,
      borderLeftColor: theme.buttonBack,
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.lightGreen05,
    },
    introSectionRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    introSectionRowSecond: {
      marginTop: moderateHeightScale(10),
    },
    introIconWrap: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(14),
    },
    introRow: {
      flex: 1,
    },
    introText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size22,
    },
    introTextBold: {
      fontFamily: fonts.fontBold,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },
    contentEmbedded: {
      paddingTop: moderateHeightScale(8),
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
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
    planCardEmbedded: {
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    selectPlanButton: {
      marginTop: moderateHeightScale(16),
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(12),
    },
    selectPlanButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    selectedStatus: {
      marginTop: moderateHeightScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
    },
    selectedStatusText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    planTabRow: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(999),
      padding: moderateWidthScale(3),
      gap: moderateWidthScale(2),
    },
    planTab: {
      minWidth: moderateWidthScale(88),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(999),
      backgroundColor: "transparent",
    },
    planTabActive: {
      backgroundColor: theme.buttonBack,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
      elevation: 2,
    },
    planTabText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      letterSpacing: 0.3,
    },
    planTabTextActive: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(12),
    },
    planName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    planPriceContainer: {
      alignItems: "flex-end",
    },
    planPrice: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontExtraBold,
      color: theme.buttonBack,
    },
    planPricePeriod: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(2),
    },
    subscriptionPeriodRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
      paddingVertical: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(12),
      backgroundColor: theme.lightGreen05,
      borderRadius: moderateWidthScale(8),
    },
    subscriptionPeriodText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    planDescription: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(16),
      lineHeight: fontSize.size20,
    },
    planDetails: {
      marginBottom: moderateHeightScale(20),
    },
    billingPeriodLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginBottom: moderateHeightScale(8),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(8),
    },
    detailIcon: {
      marginRight: moderateWidthScale(8),
    },
    detailText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      flex: 1,
    },
    addOnSection: {
      marginBottom: moderateHeightScale(8),
    },
    serviceCheckboxRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(10),
      marginBottom: moderateHeightScale(8),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    addOnIconWrap: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    serviceRowContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    serviceName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    servicePrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
    },
  });

function BusinessPlansPreviewModalContent({
  onClose,
  embedded,
  selectedPlanId,
  onSelectPlan,
  plans,
  additionalServices,
  loading,
  loadingAdditionalServices,
  error,
  apiError,
  onRetry,
}: Omit<BusinessPlansPreviewModalProps, "visible">) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const [trialDays, setTrialDays] = useState("");
  const [activeTab, setActiveTab] = useState<PlanTab>("solo");

  useEffect(() => {
    let cancelled = false;
    void resolveTrialDays()
      .then((days) => {
        if (!cancelled) setTrialDays(days);
      })
      .catch(() => {
        if (!cancelled) setTrialDays("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const standardPlans = useMemo(
    () => plans.filter((plan) => !isUnlimitedPlan(plan)),
    [plans],
  );

  const soloPlans = useMemo(
    () => standardPlans.filter((plan) => isSoloPlan(plan)),
    [standardPlans],
  );

  const businessPlans = useMemo(
    () => standardPlans.filter((plan) => !isSoloPlan(plan)),
    [standardPlans],
  );

  const usePlanTabs = Boolean(
    onSelectPlan && soloPlans.length > 0 && businessPlans.length > 0,
  );

  useEffect(() => {
    if (!usePlanTabs) return;
    if (selectedPlanId == null) return;
    const selected = standardPlans.find((plan) => plan.id === selectedPlanId);
    if (!selected) return;
    setActiveTab(isSoloPlan(selected) ? "solo" : "business");
  }, [selectedPlanId, standardPlans, usePlanTabs]);

  const visiblePlans = useMemo(() => {
    if (!usePlanTabs) return standardPlans;
    return activeTab === "solo" ? soloPlans : businessPlans;
  }, [usePlanTabs, activeTab, standardPlans, soloPlans, businessPlans]);

  const showTrialBanner = Number.parseInt(trialDays, 10) > 0;

  const featuredAddOnPrice = (() => {
    const addOn = additionalServices.find((s) => s.active);
    if (!addOn) return null;
    const p = parseFloat(addOn.price);
    return Number.isNaN(p) ? null : p.toFixed(2);
  })();

  const formatPlanPrice = (price: string): string => {
    const parsed = parseFloat(price);
    if (Number.isNaN(parsed)) return price;
    return parsed.toFixed(2);
  };

  const overlayStyle = embedded
    ? styles.modalContainer
    : [
        styles.modalOverlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + moderateHeightScale(20),
        },
      ];

  return (
    <View style={overlayStyle}>
      <View style={styles.modalContainer}>
        {!embedded && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("businessPlans")}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Feather name="x" size={iconScale(24)} color={theme.darkGreen} />
            </TouchableOpacity>
          </View>
        )}

        {loading && plans.length === 0 ? (
          <Skeleton screenType="BusinessPlans" styles={styles} />
        ) : apiError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <RetryButton onPress={onRetry} loading={loading} />
          </View>
        ) : standardPlans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t("noSubscriptionPlansAvailable")}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={embedded ? undefined : styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.plansContainer,
              embedded && styles.contentEmbedded,
            ]}
            scrollEnabled={!embedded}
          >
            <View style={styles.introSection}>
              <View style={styles.introSectionRow}>
                <View style={styles.introIconWrap}>
                  <Feather
                    name="globe"
                    size={iconScale(20)}
                    color={theme.buttonBack}
                  />
                </View>
                <View style={styles.introRow}>
                  <Text style={styles.introText}>
                    {t("businessPlansChoosePlanIntro")}
                  </Text>
                </View>
              </View>
              <View
                style={[styles.introSectionRow, styles.introSectionRowSecond]}
              >
                <View style={styles.introIconWrap}>
                  <Feather
                    name="star"
                    size={iconScale(20)}
                    color={theme.buttonBack}
                  />
                </View>
                <View style={styles.introRow}>
                  <Text style={styles.introText}>
                    {t("businessPlansFeaturedAddonIntro", {
                      price:
                        featuredAddOnPrice != null
                          ? t("businessPlansFeaturedPricePerMonth", {
                              price: featuredAddOnPrice,
                            })
                          : t("seeBelow"),
                    })}
                  </Text>
                </View>
              </View>
              {showTrialBanner ? (
                <View
                  style={[styles.introSectionRow, styles.introSectionRowSecond]}
                >
                  <View style={styles.introIconWrap}>
                    <Feather
                      name="gift"
                      size={iconScale(20)}
                      color={theme.buttonBack}
                    />
                  </View>
                  <View style={styles.introRow}>
                    <Text style={styles.introText}>
                      {t("firstTimeFreeTrialHint", { trialDays })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {usePlanTabs ? (
              <View style={styles.planTabRow}>
                <TouchableOpacity
                  style={[
                    styles.planTab,
                    activeTab === "solo" && styles.planTabActive,
                  ]}
                  onPress={() => setActiveTab("solo")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.planTabText,
                      activeTab === "solo" && styles.planTabTextActive,
                    ]}
                  >
                    {t("solo")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.planTab,
                    activeTab === "business" && styles.planTabActive,
                  ]}
                  onPress={() => setActiveTab("business")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.planTabText,
                      activeTab === "business" && styles.planTabTextActive,
                    ]}
                  >
                    {t("business")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {visiblePlans.map((plan) => {
              const planPrice = formatPlanPrice(plan.price);
              const isSelected = selectedPlanId === plan.id;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    styles.shadow,
                    embedded && styles.planCardEmbedded,
                  ]}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.planPriceContainer}>
                      <Text style={styles.planPrice}>${planPrice}</Text>
                      <Text style={styles.planPricePeriod}>
                        {t("businessPlanPerMonth")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subscriptionPeriodRow}>
                    <Feather
                      name="refresh-cw"
                      size={iconScale(14)}
                      color={theme.darkGreen}
                      style={styles.detailIcon}
                    />
                    <Text style={styles.subscriptionPeriodText}>
                      {t("businessPlanMonthlySubscription")}
                    </Text>
                  </View>

                  {plan.description ? (
                    <Text style={styles.planDescription}>
                      {plan.description}
                    </Text>
                  ) : null}
                  {!loadingAdditionalServices &&
                    additionalServices.length > 0 && (
                      <View style={styles.addOnSection}>
                        {additionalServices
                          .filter((s) => s.active)
                          .map((service) => (
                            <View
                              key={service.id}
                              style={styles.serviceCheckboxRow}
                            >
                              <View style={styles.addOnIconWrap}>
                                <Feather
                                  name="star"
                                  size={iconScale(14)}
                                  color={theme.buttonBack}
                                />
                              </View>
                              <View style={styles.serviceRowContent}>
                                <Text
                                  style={styles.serviceName}
                                  numberOfLines={2}
                                >
                                  {service.name}
                                </Text>
                                <Text style={styles.servicePrice}>
                                  {t("featuredAddOnPerMonth", {
                                    price: service.price,
                                  })}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </View>
                    )}
                  {onSelectPlan ? (
                    isSelected ? (
                      <SelectedPlanStatus label={t("selected")} />
                    ) : (
                      <TouchableOpacity
                        style={styles.selectPlanButton}
                        onPress={() => onSelectPlan(plan.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectPlanButtonText}>
                          {t("select")}
                        </Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default function BusinessPlansPreviewModal({
  visible = true,
  onClose,
  embedded = false,
  selectedPlanId,
  onSelectPlan,
  plans,
  additionalServices,
  loading,
  loadingAdditionalServices,
  error,
  apiError,
  onRetry,
}: BusinessPlansPreviewModalProps) {
  const content = (
    <BusinessPlansPreviewModalContent
      onClose={onClose}
      embedded={embedded}
      selectedPlanId={selectedPlanId}
      onSelectPlan={onSelectPlan}
      plans={plans}
      additionalServices={additionalServices}
      loading={loading}
      loadingAdditionalServices={loadingAdditionalServices}
      error={error}
      apiError={apiError}
      onRetry={onRetry}
    />
  );

  if (embedded) {
    return content;
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      {content}
    </Modal>
  );
}
