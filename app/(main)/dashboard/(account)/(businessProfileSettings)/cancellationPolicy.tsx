import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import type { BusinessCancellationPolicy } from "@/src/types/cancellationPolicy";

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
    },
    titleSection: {
      marginBottom: moderateHeightScale(24),
    },
    title: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    helpText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(6),
      lineHeight: fontSize.size20,
    },
    sectionLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    sectionHint: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(12),
      lineHeight: fontSize.size18,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      marginBottom: moderateHeightScale(10),
    },
    optionRowSelected: {
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    radioOuter: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1.5,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
    },
    radioOuterSelected: {
      borderColor: theme.buttonBack,
    },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.buttonBack,
    },
    optionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
    },
    inputLabel: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(8),
    },
    input: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputError: {
      borderColor: theme.red,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      marginTop: moderateHeightScale(4),
    },
    exampleText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(20),
      lineHeight: fontSize.size18,
    },
    membershipSection: {
      marginTop: moderateHeightScale(28),
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
      marginBottom: moderateHeightScale(10),
    },
    switchLabel: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size20,
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const CUTOFF_LABEL_KEYS: Record<string, string> = {
  "12": "cutoff12h",
  "24": "cutoff24h",
  "48": "cutoff48h",
  always: "cutoffAlways",
};

function clampPercent(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned === "") return "";
  const num = Math.min(100, Math.max(0, parseInt(cleaned, 10)));
  return String(num);
}

export default function CancellationPolicyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cutoff, setCutoff] = useState("24");
  const [cutoffOptions, setCutoffOptions] = useState<string[]>([
    "12",
    "24",
    "48",
    "always",
  ]);
  const [cancellationFee, setCancellationFee] = useState("50");
  const [noShowFee, setNoShowFee] = useState("70");
  const [lateCancelUsesVisit, setLateCancelUsesVisit] = useState(true);
  const [noShowUsesVisit, setNoShowUsesVisit] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    setFieldErrors({});
    try {
      const response = await ApiService.get<{
        success: boolean;
        data: BusinessCancellationPolicy;
        message?: string;
      }>(businessEndpoints.cancellationPolicy);

      if (response.success && response.data) {
        const data = response.data;
        setCutoff(String(data.cancellation_cutoff ?? "24"));
        setCancellationFee(String(data.cancellation_fee_percent ?? 0));
        setNoShowFee(String(data.no_show_fee_percent ?? 0));
        setLateCancelUsesVisit(
          data.membership_late_cancel_forfeits_visit ?? true,
        );
        setNoShowUsesVisit(data.membership_no_show_forfeits_visit ?? true);
        if (Array.isArray(data.cutoff_options) && data.cutoff_options.length) {
          setCutoffOptions(data.cutoff_options.map(String));
        }
      } else {
        showBanner(
          "Error",
          response.message || t("cancellationPolicyLoadError"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to load cancellation policy:", error);
      showBanner(
        "Error",
        error?.message || t("cancellationPolicyLoadError"),
        "error",
        3000,
      );
    } finally {
      setLoading(false);
    }
  }, [showBanner, t]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const cancelAmount = Math.round(
    (100 * (parseInt(cancellationFee || "0", 10) || 0)) / 100,
  );
  const noShowAmount = Math.round(
    (100 * (parseInt(noShowFee || "0", 10) || 0)) / 100,
  );

  const handleSave = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      const response = await ApiService.put<{
        success: boolean;
        data?: BusinessCancellationPolicy;
        message?: string;
        errors?: Record<string, string | string[]>;
      }>(businessEndpoints.cancellationPolicy, {
        cancellation_cutoff: cutoff,
        cancellation_fee_percent: parseInt(cancellationFee || "0", 10) || 0,
        no_show_fee_percent: parseInt(noShowFee || "0", 10) || 0,
        membership_late_cancel_forfeits_visit: lateCancelUsesVisit,
        membership_no_show_forfeits_visit: noShowUsesVisit,
      });

      if (response.success) {
        showBanner(
          "Success",
          response.message || t("cancellationPolicySaved"),
          "success",
          3000,
        );
        if (response.data) {
          setCutoff(String(response.data.cancellation_cutoff ?? cutoff));
          setCancellationFee(
            String(response.data.cancellation_fee_percent ?? cancellationFee),
          );
          setNoShowFee(
            String(response.data.no_show_fee_percent ?? noShowFee),
          );
          setLateCancelUsesVisit(
            response.data.membership_late_cancel_forfeits_visit ??
              lateCancelUsesVisit,
          );
          setNoShowUsesVisit(
            response.data.membership_no_show_forfeits_visit ?? noShowUsesVisit,
          );
        }
      } else {
        showBanner(
          "Error",
          response.message || t("cancellationPolicySaveError"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to save cancellation policy:", error);
      const errors = error?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        const mapped: Record<string, string> = {};
        Object.entries(errors).forEach(([key, value]) => {
          mapped[key] = Array.isArray(value) ? String(value[0]) : String(value);
        });
        setFieldErrors(mapped);
      }
      showBanner(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          t("cancellationPolicySaveError"),
        "error",
        3000,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("cancellationPolicy")} />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.darkGreen} />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t("cancellationPolicy")}</Text>
              <Text style={styles.helpText}>{t("cancellationPolicyHelp")}</Text>
              <Text style={styles.helpText}>
                {t("cancellationPolicyNewBookingsOnly")}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>
              {t("freeCancellationCutoff")}
            </Text>
            <Text style={styles.sectionHint}>
              {t("cancellationPolicyCutoffHelp")}
            </Text>
            {cutoffOptions.map((option) => {
              const selected = cutoff === option;
              const labelKey = CUTOFF_LABEL_KEYS[option];
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.optionRow,
                    selected && styles.optionRowSelected,
                  ]}
                  onPress={() => setCutoff(option)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={styles.optionText}>
                    {labelKey ? t(labelKey) : option}
                  </Text>
                </Pressable>
              );
            })}
            {fieldErrors.cancellation_cutoff ? (
              <Text style={styles.errorText}>
                {fieldErrors.cancellation_cutoff}
              </Text>
            ) : null}

            <Text style={styles.inputLabel}>{t("cancellationFeePercent")}</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.cancellation_fee_percent && styles.inputError,
              ]}
              value={cancellationFee}
              onChangeText={(v) => setCancellationFee(clampPercent(v))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={theme.lightGreen2}
            />
            {fieldErrors.cancellation_fee_percent ? (
              <Text style={styles.errorText}>
                {fieldErrors.cancellation_fee_percent}
              </Text>
            ) : null}

            <Text style={styles.inputLabel}>{t("noShowFeePercent")}</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.no_show_fee_percent && styles.inputError,
              ]}
              value={noShowFee}
              onChangeText={(v) => setNoShowFee(clampPercent(v))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={theme.lightGreen2}
            />
            {fieldErrors.no_show_fee_percent ? (
              <Text style={styles.errorText}>
                {fieldErrors.no_show_fee_percent}
              </Text>
            ) : null}

            <Text style={styles.exampleText}>
              {t("cancellationPolicyExample", {
                cancelAmount,
                noShowAmount,
              })}
            </Text>

            <View style={styles.membershipSection}>
              <Text style={styles.sectionLabel}>{t("membershipsSection")}</Text>
              <Text style={styles.sectionHint}>
                {t("membershipPolicyHelp")}
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {t("membershipLateCancelUsesVisit")}
                </Text>
                <Switch
                  value={lateCancelUsesVisit}
                  onValueChange={setLateCancelUsesVisit}
                  trackColor={{
                    false: theme.borderLight,
                    true: theme.buttonBack,
                  }}
                  thumbColor={theme.white}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {t("membershipNoShowUsesVisit")}
                </Text>
                <Switch
                  value={noShowUsesVisit}
                  onValueChange={setNoShowUsesVisit}
                  trackColor={{
                    false: theme.borderLight,
                    true: theme.buttonBack,
                  }}
                  thumbColor={theme.white}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t("saveCancellationPolicy")}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
