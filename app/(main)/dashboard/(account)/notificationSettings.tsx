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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    },
    sectionWrap: {
      marginTop: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(16),
    },
    sectionWrapFirst: {
      marginTop: moderateHeightScale(8),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(4),
    },
    sectionIcon: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(8),
    },
    sectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    card: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: moderateWidthScale(6),
        },
        android: {
          elevation: 2,
          shadowColor: theme.darkGreen,
        },
        default: {},
      }),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
    },
    rowTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flex: 1,
      paddingRight: moderateWidthScale(12),
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderLight,
      marginLeft: moderateWidthScale(16),
    },
    capRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
    },
    capControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    capBtn: {
      width: moderateWidthScale(30),
      height: moderateWidthScale(30),
      borderRadius: moderateWidthScale(15),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    capBtnText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    capValue: {
      minWidth: moderateWidthScale(24),
      textAlign: "center",
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(60),
    },
    phoneSettingsCard: {
      marginTop: moderateHeightScale(24),
      marginHorizontal: moderateWidthScale(16),
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: moderateWidthScale(6),
        },
        android: {
          elevation: 2,
          shadowColor: theme.darkGreen,
        },
        default: {},
      }),
    },
    phoneSettingsInner: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(15),
      paddingHorizontal: moderateWidthScale(16),
    },
    phoneSettingsIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.buttonBack,
      marginRight: moderateWidthScale(12),
    },
    phoneSettingsTextWrap: {
      flex: 1,
    },
    phoneSettingsTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    phoneSettingsSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
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
  const insets = useSafeAreaInsets();
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

  const renderSection = (
    title: string,
    iconName: keyof typeof MaterialIcons.glyphMap,
    iconBg: string,
    content: React.ReactNode,
    isFirst?: boolean,
  ) => (
    <View style={[styles.sectionWrap, isFirst && styles.sectionWrapFirst]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
          <MaterialIcons name={iconName} size={16} color={theme.white} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>{content}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("notificationSettings")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingTop: moderateHeightScale(12),
          paddingBottom:
            Math.max(insets.bottom, moderateHeightScale(16)) +
            moderateHeightScale(24),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
          </View>
        ) : prefs ? (
          <>
            {renderSection(
              t("prefSectionGeneral"),
              "notifications-active",
              theme.buttonBack,
              renderToggleRows(generalPrefs),
              true,
            )}

            {renderSection(
              t("prefSectionFollowing"),
              "people",
              theme.selectCard,
              <>
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
              </>,
            )}

            {renderSection(
              t("prefSectionEmail"),
              "email",
              theme.orangeBrownText,
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{t("prefPromotionsEmail")}</Text>
                <CustomToggle
                  value={!!prefs.promotions}
                  onValueChange={(next) =>
                    patchPref({ promotions: next }, "promotions")
                  }
                  disabled={savingKey === "promotions"}
                />
              </View>,
            )}

            {isBusiness
              ? renderSection(
                  t("prefSectionBusiness"),
                  "storefront",
                  theme.darkGreen,
                  renderToggleRows(bizPrefs),
                )
              : null}

            {/* Phone settings link */}
            <TouchableOpacity
              style={styles.phoneSettingsCard}
              onPress={openNotificationSettings}
              activeOpacity={0.7}
            >
              <View style={styles.phoneSettingsInner}>
                <View style={styles.phoneSettingsIcon}>
                  <MaterialIcons
                    name={
                      Platform.OS === "ios"
                        ? "phone-iphone"
                        : "phone-android"
                    }
                    size={20}
                    color={theme.white}
                  />
                </View>
                <View style={styles.phoneSettingsTextWrap}>
                  <Text style={styles.phoneSettingsTitle}>
                    {t("prefPhoneSettings")}
                  </Text>
                  <Text style={styles.phoneSettingsSub}>
                    {t("prefPhoneSettingsSub")}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={theme.lightGreen5}
                  style={styles.chevron}
                />
              </View>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
