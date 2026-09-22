import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
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
      marginTop: moderateHeightScale(16),
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

  const [showNotifications, setShowNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [showOnLockScreen, setShowOnLockScreen] = useState(false);

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

  const deviceSettings = [
    {
      key: "showNotifications",
      title: t("showNotifications"),
      value: showNotifications,
      onValueChange: setShowNotifications,
    },
    {
      key: "notificationSound",
      title: t("notificationSound"),
      value: notificationSound,
      onValueChange: setNotificationSound,
    },
    {
      key: "showOnLockScreen",
      title: t("showOnLockScreen"),
      value: showOnLockScreen,
      onValueChange: setShowOnLockScreen,
    },
  ];

  const followPrefs: { key: BoolPrefKey; title: string }[] = [
    { key: "new_reels", title: t("prefNewReels") },
    { key: "new_services", title: t("prefNewServices") },
    { key: "new_memberships", title: t("prefNewMemberships") },
    { key: "promotions", title: t("prefPromotions") },
    { key: "last_minute_openings", title: t("prefLastMinuteOpenings") },
  ];

  const bizPrefs: { key: BoolPrefKey; title: string }[] = [
    { key: "biz_new_follower", title: t("prefBizNewFollower") },
    { key: "biz_reel_comments", title: t("prefBizReelComments") },
    { key: "biz_reel_bookings", title: t("prefBizReelBookings") },
    { key: "biz_reel_likes", title: t("prefBizReelLikes") },
  ];

  const renderToggleRows = (
    rows: { key: BoolPrefKey; title: string }[],
  ) =>
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
      >
        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>
          {t("prefSectionDevice")}
        </Text>
        <View style={styles.listContainer}>
          {deviceSettings.map((setting, index) => (
            <View key={setting.key}>
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{setting.title}</Text>
                <CustomToggle
                  value={setting.value}
                  onValueChange={setting.onValueChange}
                />
              </View>
              {index !== deviceSettings.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
          </View>
        ) : prefs ? (
          <>
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
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
