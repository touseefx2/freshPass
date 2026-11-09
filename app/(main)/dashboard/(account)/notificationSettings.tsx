import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import CustomToggle from "@/src/components/customToggle";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { openNotificationSettings } from "@/src/services/notificationPermissionService";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/src/services/notificationPreferencesService";

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
      paddingBottom: moderateHeightScale(40),
    },
    sectionTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
      marginTop: moderateHeightScale(24),
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    sectionTitleFirst: {
      marginTop: 0,
    },
    listContainer: {},
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
      paddingRight: moderateWidthScale(12),
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    capRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
    },
    capControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    capBtn: {
      width: moderateWidthScale(32),
      height: moderateWidthScale(32),
      borderRadius: moderateWidthScale(16),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    capBtnText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    capValue: {
      minWidth: moderateWidthScale(28),
      textAlign: "center",
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    loader: {
      paddingVertical: moderateHeightScale(40),
      alignItems: "center",
    },
    phoneSettingsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
      marginTop: moderateHeightScale(24),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    phoneSettingsText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.buttonBack,
      flex: 1,
    },
    chevron: {
      marginLeft: moderateWidthScale(8),
    },
  });

type BoolPrefKey = Exclude<
  keyof NotificationPreferences,
  "daily_cap_per_business"
>;

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const userRole = useAppSelector((s) => s.user.userRole);
  const isBusiness = userRole === "business";

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNotificationPreferences();
        if (!cancelled) setPrefs(data);
      } catch (error: any) {
        Logger.error("Failed to load notification preferences:", error);
        if (!cancelled) {
          showBanner(
            t("error"),
            error?.message || t("failedToLoadNotificationPrefs"),
            "error",
            3000,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showBanner, t]);

  const patchPref = useCallback(
    async (patch: Partial<NotificationPreferences>, key: string) => {
      if (!prefs) return;
      const previous = prefs;
      setPrefs({ ...prefs, ...patch });
      setSavingKey(key);
      try {
        const next = await updateNotificationPreferences(patch);
        setPrefs(next);
      } catch (error: any) {
        setPrefs(previous);
        Logger.error("Failed to update notification preferences:", error);
        showBanner(
          t("error"),
          error?.message || t("failedToUpdateNotificationPrefs"),
          "error",
          3000,
        );
      } finally {
        setSavingKey(null);
      }
    },
    [prefs, showBanner, t],
  );

  const generalPrefs: { key: BoolPrefKey; title: string }[] = [
    { key: "appointment_reminders", title: t("prefAppointmentReminders") },
    { key: "messages", title: t("prefMessages") },
    { key: "ai_memories", title: t("prefAiMemories") },
  ];

  const followPrefs: { key: BoolPrefKey; title: string }[] = [
    { key: "new_reels", title: t("prefNewReels") },
    { key: "new_services", title: t("prefNewServices") },
    { key: "new_memberships", title: t("prefNewMemberships") },
    { key: "last_minute_openings", title: t("prefLastMinuteOpenings") },
  ];

  const bizPrefs: { key: BoolPrefKey; title: string }[] = [
    { key: "biz_new_follower", title: t("prefBizNewFollower") },
    { key: "biz_reel_comments", title: t("prefBizReelComments") },
    { key: "biz_reel_bookings", title: t("prefBizReelBookings") },
    { key: "biz_orders", title: t("prefBizOrders") },
    { key: "biz_low_stock", title: t("prefBizLowStock") },
    { key: "biz_job_applications", title: t("prefBizJobApplications") },
    { key: "biz_reel_likes", title: t("prefBizReelLikes") },
  ];

  const renderToggleRows = (rows: { key: BoolPrefKey; title: string }[]) =>
    rows.map((row, index) => (
      <View key={row.key}>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <CustomToggle
            value={!!prefs?.[row.key]}
            onValueChange={(next) => patchPref({ [row.key]: next }, row.key)}
            disabled={!prefs || savingKey === row.key}
          />
        </View>
        {index !== rows.length - 1 && <View style={styles.rowDivider} />}
      </View>
    ));

  return (
    <View style={styles.container}>
      <StackHeader title={t("notificationSettings")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
          </View>
        ) : prefs ? (
          <>
            {/* General notifications */}
            <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>
              {t("prefSectionGeneral")}
            </Text>
            <View style={styles.listContainer}>
              {renderToggleRows(generalPrefs)}
            </View>

            {/* Following */}
            <Text style={styles.sectionTitle}>
              {t("prefSectionFollowing")}
            </Text>
            <View style={styles.listContainer}>
              {renderToggleRows(followPrefs)}
              <View style={styles.rowDivider} />
              <View style={styles.capRow}>
                <Text style={styles.rowTitle}>
                  {t("prefDailyCapPerBusiness")}
                </Text>
                <View style={styles.capControls}>
                  <TouchableOpacity
                    style={styles.capBtn}
                    disabled={
                      savingKey === "daily_cap_per_business" ||
                      prefs.daily_cap_per_business <= 1
                    }
                    onPress={() =>
                      patchPref(
                        {
                          daily_cap_per_business: Math.max(
                            1,
                            prefs.daily_cap_per_business - 1,
                          ),
                        },
                        "daily_cap_per_business",
                      )
                    }
                  >
                    <Text style={styles.capBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.capValue}>
                    {prefs.daily_cap_per_business}
                  </Text>
                  <TouchableOpacity
                    style={styles.capBtn}
                    disabled={
                      savingKey === "daily_cap_per_business" ||
                      prefs.daily_cap_per_business >= 20
                    }
                    onPress={() =>
                      patchPref(
                        {
                          daily_cap_per_business: Math.min(
                            20,
                            prefs.daily_cap_per_business + 1,
                          ),
                        },
                        "daily_cap_per_business",
                      )
                    }
                  >
                    <Text style={styles.capBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Email */}
            <Text style={styles.sectionTitle}>{t("prefSectionEmail")}</Text>
            <View style={styles.listContainer}>
              <View style={styles.row}>
                <Text style={styles.rowTitle}>
                  {t("prefPromotionsEmail")}
                </Text>
                <CustomToggle
                  value={!!prefs.promotions}
                  onValueChange={(next) =>
                    patchPref({ promotions: next }, "promotions")
                  }
                  disabled={savingKey === "promotions"}
                />
              </View>
            </View>

            {/* Business */}
            {isBusiness ? (
              <>
                <Text style={styles.sectionTitle}>
                  {t("prefSectionBusiness")}
                </Text>
                <View style={styles.listContainer}>
                  {renderToggleRows(bizPrefs)}
                </View>
              </>
            ) : null}

            {/* Phone settings link */}
            <TouchableOpacity
              style={styles.phoneSettingsRow}
              onPress={openNotificationSettings}
              activeOpacity={0.6}
            >
              <Text style={styles.phoneSettingsText}>
                {t("prefPhoneSettings")}
              </Text>
              <MaterialIcons
                name={
                  Platform.OS === "ios" ? "open-in-new" : "phone-android"
                }
                size={20}
                color={theme.buttonBack}
                style={styles.chevron}
              />
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
