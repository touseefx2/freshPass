import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { setSelectedBusinessPlanId } from "@/src/state/slices/completeProfileSlice";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTranslation } from "react-i18next";
import BusinessPlansPreviewModal, {
  AdditionalService,
  SubscriptionPlan,
} from "@/src/components/businessPlansPreviewModal";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(12),
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
      lineHeight: fontSize.size20,
    },
  });

export default function StepSix() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { selectedBusinessPlanId } = useAppSelector(
    (state) => state.completeProfile,
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [additionalServices, setAdditionalServices] = useState<
    AdditionalService[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdditionalServices, setLoadingAdditionalServices] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiError(false);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          data: SubscriptionPlan[];
        };
      }>(businessEndpoints.subscriptionPlans());

      if (response.success && response.data?.data) {
        setPlans(response.data.data);
      } else {
        setError("Failed to load subscription plans");
        setApiError(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription plans");
      setApiError(true);
      showBanner(
        t("error"),
        err.message || t("failedToLoadSubscriptionPlans"),
        "error",
        2500,
      );
    } finally {
      setLoading(false);
    }
  }, [showBanner, t]);

  const fetchAdditionalServices = useCallback(async () => {
    setLoadingAdditionalServices(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: AdditionalService[];
      }>(businessEndpoints.additionalServices("business"));

      if (response.success && response.data) {
        setAdditionalServices(response.data);
      }
    } catch {
      // Silent fail; add-ons section will just be empty
    } finally {
      setLoadingAdditionalServices(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
    void fetchAdditionalServices();
  }, [fetchPlans, fetchAdditionalServices]);

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>{t("businessPlans")}</Text>
        <Text style={styles.subtitle}>
          Choose one plan to continue setting up your account.
        </Text>
      </View>

      <BusinessPlansPreviewModal
        embedded
        selectedPlanId={selectedBusinessPlanId}
        onSelectPlan={(planId) => dispatch(setSelectedBusinessPlanId(planId))}
        plans={plans}
        additionalServices={additionalServices}
        loading={loading}
        loadingAdditionalServices={loadingAdditionalServices}
        error={error}
        apiError={apiError}
        onRetry={fetchPlans}
      />
    </View>
  );
}
