import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StatusBar,
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
  visible: boolean;
  onClose: () => void;
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

  return (
    <View
      style={[
        styles.modalOverlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + moderateHeightScale(20),
        },
      ]}
    >
      <View style={styles.modalContainer}>
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
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.plansContainer}
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
                    Choose one plan to activate your account and list your
                    business publicly.
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
                    For more visibility, add the Featured add-on to appear in
                    Featured businesses —{" "}
                    {featuredAddOnPrice != null ? (
                      <Text style={styles.introTextBold}>
                        ${featuredAddOnPrice}/month
                      </Text>
                    ) : (
                      "see below"
                    )}
                    .
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

            {standardPlans.map((plan) => {
              const planPrice = formatPlanPrice(plan.price);
              return (
                <View key={plan.id} style={[styles.planCard, styles.shadow]}>
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
                  <Text style={styles.billingPeriodLabel}>
                    {t("businessPlanBillingPeriodIncludes")}
                  </Text>
                  <View style={styles.planDetails}>
                    {plan.visits !== null && (
                      <View style={styles.detailRow}>
                        <Feather
                          name="calendar"
                          size={iconScale(16)}
                          color={theme.darkGreen}
                          style={styles.detailIcon}
                        />
                        <Text style={styles.detailText}>
                          {plan.visits} {t("visitsIncluded")}
                        </Text>
                      </View>
                    )}
                    {plan.services && plan.services.length > 0 && (
                      <View style={styles.detailRow}>
                        <Feather
                          name="check-circle"
                          size={iconScale(16)}
                          color={theme.darkGreen}
                          style={styles.detailIcon}
                        />
                        <Text style={styles.detailText}>
                          {plan.services.length} {t("servicesIncluded")}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Feather
                        name="check-circle"
                        size={iconScale(16)}
                        color={theme.darkGreen}
                        style={styles.detailIcon}
                      />
                      <Text style={styles.detailText}>
                        {t("activePlanReady")}
                      </Text>
                    </View>
                  </View>
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
  visible,
  onClose,
  plans,
  additionalServices,
  loading,
  loadingAdditionalServices,
  error,
  apiError,
  onRetry,
}: BusinessPlansPreviewModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <BusinessPlansPreviewModalContent
        onClose={onClose}
        plans={plans}
        additionalServices={additionalServices}
        loading={loading}
        loadingAdditionalServices={loadingAdditionalServices}
        error={error}
        apiError={apiError}
        onRetry={onRetry}
      />
    </Modal>
  );
}
