/**
 * Bring Customers Back: the owner's offer emails, with the monthly allowance.
 * Included in the plan (not an in-app purchase). Staff get 403.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Logger from "@/src/services/logger";
import { ClassStateView } from "@/src/components/masterClasses/parts";
import { usePromotionsPlanGate } from "@/src/components/promotions/ownerParts";
import {
  AllowanceCard,
  CAMPAIGN_CREATE_ROUTE,
  CAMPAIGN_DETAIL_ROUTE,
  CampaignCard,
} from "@/src/components/campaigns/campaignParts";
import {
  campaignErrorText,
  fetchCampaignAllowance,
  fetchCampaigns,
  isCampaignForbidden,
} from "@/src/services/campaignService";
import type { Campaign, CampaignAllowance } from "@/src/types/campaign";

const PER_PAGE = 20;

export default function BringCustomersBackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { ensureCanCreate, planModal } = usePromotionsPlanGate();

  const [items, setItems] = useState<Campaign[]>([]);
  const [allowance, setAllowance] = useState<CampaignAllowance | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "quiet") => {
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "initial") setLoading(true);
      try {
        const res = await fetchCampaigns({ page: 1, per_page: PER_PAGE });
        setItems(res.items);
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        // The list carries the allowance; ask for it on its own if missing
        setAllowance(res.allowance ?? (await fetchCampaignAllowance().catch(() => null)));
        setError(null);
        setForbidden(false);
        loadedOnce.current = true;
      } catch (err) {
        Logger.warn("Campaign list failed:", err);
        if (isCampaignForbidden(err)) {
          setForbidden(true);
        } else if (!loadedOnce.current) {
          setError(campaignErrorText(err, t("bcbLoadError")));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? "quiet" : "initial");
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const res = await fetchCampaigns({ page: page + 1, per_page: PER_PAGE });
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.items.filter((c) => !seen.has(c.id))];
      });
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
    } catch (err) {
      Logger.warn("Campaign next page failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, page, lastPage]);

  const openCreate = () => {
    if (ensureCanCreate(true)) router.push(CAMPAIGN_CREATE_ROUTE as any);
  };

  const openDetail = (c: Campaign) =>
    router.push({ pathname: CAMPAIGN_DETAIL_ROUTE, params: { id: String(c.id) } } as any);

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {t("bcbHeading")}
      </Text>
      <Text style={styles.subtitle}>{t("bcbSubtitle")}</Text>
      <AllowanceCard allowance={allowance} style={styles.allowance} />
      {items.length ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openCreate}
          style={styles.createBtn}
          accessibilityRole="button"
          accessibilityLabel={t("bcbCreate")}
        >
          <Ionicons name="paper-plane" size={iconScale(18)} color={theme.white} />
          <Text style={styles.createText}>{t("bcbCreate")}</Text>
        </TouchableOpacity>
      ) : null}
      {items.length ? <Text style={styles.section}>{t("bcbYourEmails")}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("bcbTitle")} />
      {loading ? (
        <ClassStateView loading message={t("bcbLoading")} />
      ) : forbidden ? (
        <ClassStateView
          icon="lock-closed-outline"
          title={t("bcbOwnerOnlyTitle")}
          message={t("bcbOwnerOnlyMessage")}
        />
      ) : error ? (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("bcbLoadErrorTitle")}
          message={error}
          actionLabel={t("retry")}
          onAction={() => load("initial")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <CampaignCard campaign={item} onPress={() => openDetail(item)} />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <ClassStateView
              icon="paper-plane-outline"
              title={t("bcbEmptyTitle")}
              message={t("bcbEmptyMessage")}
              actionLabel={t("bcbCreate")}
              actionIcon="add"
              onAction={openCreate}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={theme.darkGreen}
                style={{ marginVertical: moderateHeightScale(16) }}
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load("refresh")}
              tintColor={theme.darkGreen}
              colors={[theme.darkGreen]}
            />
          }
        />
      )}
      {planModal}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    listContent: {
      paddingHorizontal: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(40),
      gap: moderateHeightScale(10),
      flexGrow: 1,
    },
    headerBlock: {
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(6),
      gap: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    allowance: { marginTop: moderateHeightScale(6) },
    createBtn: {
      marginTop: moderateHeightScale(6),
      minHeight: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
    },
    createText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    section: {
      marginTop: moderateHeightScale(10),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });
