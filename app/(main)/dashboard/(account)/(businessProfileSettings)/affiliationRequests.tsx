import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import RetryButton from "@/src/components/retryButton";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { ApiService } from "@/src/services/api";
import { affiliationEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import type {
  AffiliationRequestItem,
  AffiliationRequestsResponse,
} from "@/src/types/affiliation";
import Logger from "@/src/services/logger";

type AffiliationTab = "pending" | "approved";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const DEFAULT_AVATAR = process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";

const resolveImageUrl = (path?: string | null) => {
  if (!path) return DEFAULT_AVATAR;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(20),
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(4),
      marginBottom: moderateHeightScale(20),
      gap: moderateWidthScale(4),
    },
    tab: {
      flex: 1,
      minHeight: heightScale(40),
      borderRadius: moderateWidthScale(9),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(10),
    },
    tabActive: {
      backgroundColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: moderateWidthScale(3),
      elevation: 2,
    },
    tabText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    tabTextActive: {
      color: theme.darkGreen,
      fontFamily: fonts.fontBold,
    },
    list: {
      gap: moderateHeightScale(14),
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(14),
      gap: moderateHeightScale(14),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(8),
      elevation: 2,
    },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    avatar: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: moderateWidthScale(26),
      backgroundColor: theme.lightGreen07,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    details: {
      flex: 1,
      gap: moderateHeightScale(3),
      minWidth: 0,
    },
    name: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    businessName: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(2),
    },
    date: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    actionButton: {
      flex: 1,
      minHeight: heightScale(42),
      borderRadius: moderateWidthScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
      paddingHorizontal: moderateWidthScale(12),
    },
    approveButton: {
      backgroundColor: theme.buttonBack,
    },
    rejectButton: {
      backgroundColor: theme.lightRed,
      borderWidth: 1,
      borderColor: theme.lightRedBorder,
    },
    removeButton: {
      flex: 1,
      backgroundColor: theme.lightRed,
      borderWidth: 1,
      borderColor: theme.lightRedBorder,
    },
    approveText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    rejectText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    actionLoading: {
      opacity: 0.6,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(60),
    },
    error: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
      paddingVertical: moderateHeightScale(40),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function AffiliationRequestsScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  const [activeTab, setActiveTab] = useState<AffiliationTab>("pending");
  const [items, setItems] = useState<AffiliationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchRequests = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(false);
      try {
        const response = await ApiService.get<AffiliationRequestsResponse>(
          affiliationEndpoints.list({
            status: activeTab,
            page: 1,
            per_page: 100,
          }),
        );
        const requests = Array.isArray(response.data)
          ? response.data
          : (response.data?.requests ?? response.data?.data ?? []);
        setItems(response.success ? requests : []);
      } catch (requestError) {
        Logger.error("Failed to fetch affiliation requests:", requestError);
        setItems([]);
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests]),
  );

  const runAction = useCallback(
    async (
      item: AffiliationRequestItem,
      action: "approve" | "reject" | "remove",
    ) => {
      setActionId(item.id);
      try {
        const endpoint =
          action === "approve"
            ? affiliationEndpoints.approve(item.id)
            : action === "reject"
              ? affiliationEndpoints.reject(item.id)
              : affiliationEndpoints.remove(item.id);
        const response = await ApiService.post<{
          success: boolean;
          message: string;
        }>(endpoint, {});
        if (!response.success) {
          throw new Error(response.message);
        }
        showBanner(
          t("success"),
          response.message || t("affiliationActionSuccess"),
          "success",
          3000,
        );
        await fetchRequests(true);
      } catch (actionError: any) {
        showBanner(
          t("error"),
          actionError?.message || t("affiliationActionFailed"),
          "error",
          3000,
        );
      } finally {
        setActionId(null);
      }
    },
    [fetchRequests, showBanner, t],
  );

  const confirmAction = useCallback(
    (
      item: AffiliationRequestItem,
      action: "approve" | "reject" | "remove",
    ) => {
      if (action === "approve") {
        runAction(item, action);
        return;
      }
      Alert.alert(
        action === "reject"
          ? t("rejectAffiliationRequest")
          : t("removeAffiliation"),
        action === "reject"
          ? t("rejectAffiliationConfirm")
          : t("removeAffiliationConfirm"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: action === "reject" ? t("reject") : t("remove"),
            style: "destructive",
            onPress: () => runAction(item, action),
          },
        ],
      );
    },
    [runAction, t],
  );

  const formatDate = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("affiliationRequests")} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRequests(true)}
            tintColor={theme.darkGreen}
          />
        }
      >
        <View style={styles.tabs}>
          {(["pending", "approved"] as AffiliationTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "pending"
                  ? t("pendingRequests")
                  : t("approvedAffiliations")}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.darkGreen} />
          </View>
        ) : error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>
              {t("failedToFetchAffiliationRequests")}
            </Text>
            <RetryButton onPress={() => fetchRequests()} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="group"
            compact
            title={
              activeTab === "pending"
                ? t("noPendingAffiliationRequests")
                : t("noApprovedAffiliations")
            }
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const busy = actionId === item.id;
              const date =
                activeTab === "pending"
                  ? item.requested_at
                  : item.responded_at;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.personRow}>
                    <Image
                      source={{
                        uri: resolveImageUrl(
                          item.solo_user.profile_image_url ||
                            item.solo_business.logo_url ||
                            item.solo_business.logo,
                        ),
                      }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                    <View style={styles.details}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.solo_user.name}
                      </Text>
                      <Text style={styles.businessName} numberOfLines={1}>
                        {item.solo_business.title}
                      </Text>
                      {!!date && (
                        <View style={styles.metaRow}>
                          <MaterialIcons
                            name="event"
                            size={moderateWidthScale(14)}
                            color={theme.lightGreen}
                          />
                          <Text style={styles.date}>{formatDate(date)}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {activeTab === "pending" ? (
                      <>
                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.rejectButton,
                            busy && styles.actionLoading,
                          ]}
                          disabled={busy}
                          onPress={() => confirmAction(item, "reject")}
                          accessibilityLabel={t("reject")}
                        >
                          <MaterialIcons
                            name="close"
                            size={moderateWidthScale(18)}
                            color={theme.red}
                          />
                          <Text style={styles.rejectText}>{t("reject")}</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.approveButton,
                            busy && styles.actionLoading,
                          ]}
                          disabled={busy}
                          onPress={() => confirmAction(item, "approve")}
                          accessibilityLabel={t("approve")}
                        >
                          {busy ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.buttonText}
                            />
                          ) : (
                            <>
                              <MaterialIcons
                                name="check"
                                size={moderateWidthScale(18)}
                                color={theme.buttonText}
                              />
                              <Text style={styles.approveText}>
                                {t("approve")}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        style={[
                          styles.actionButton,
                          styles.removeButton,
                          busy && styles.actionLoading,
                        ]}
                        disabled={busy}
                        onPress={() => confirmAction(item, "remove")}
                        accessibilityLabel={t("remove")}
                      >
                        {busy ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.red}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="person-remove"
                              size={moderateWidthScale(18)}
                              color={theme.red}
                            />
                            <Text style={styles.rejectText}>{t("remove")}</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
