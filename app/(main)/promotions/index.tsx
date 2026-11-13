/**
 * Owner "Offers" (Profile Promotions) list. Offers are included in the plan;
 * the server decides who qualifies and every price.
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
import {
  PromotionInfoNote,
  PromotionOwnerCard,
  usePromotionsPlanGate,
} from "@/src/components/promotions/ownerParts";
import {
  fetchMyPromotions,
  promotionErrorText,
} from "@/src/services/promotionService";
import type { Promotion } from "@/src/types/promotion";

const PER_PAGE = 20;
const EDITOR_ROUTE = "/(main)/promotions/editor";
const DETAIL_ROUTE = "/(main)/promotions/detail";

export default function PromotionsListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { ensureCanCreate, planModal } = usePromotionsPlanGate();

  const [items, setItems] = useState<Promotion[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [canPromote, setCanPromote] = useState(true);
  const [includedNote, setIncludedNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "quiet") => {
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "initial") setLoading(true);
      try {
        const res = await fetchMyPromotions({ page: 1, per_page: PER_PAGE });
        setItems(res.items);
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setCanPromote(res.can_promote);
        setIncludedNote(res.included_note);
        setError(null);
        loadedOnce.current = true;
      } catch (err) {
        Logger.warn("Offers list failed:", err);
        // Keep what's on screen after a failed quiet refresh
        if (!loadedOnce.current) setError(promotionErrorText(err, t("proLoadError")));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  // Back from the editor / detail: show the latest
  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? "quiet" : "initial");
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const res = await fetchMyPromotions({ page: page + 1, per_page: PER_PAGE });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
    } catch (err) {
      Logger.warn("Offers next page failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, page, lastPage]);

  const openCreate = () => {
    if (ensureCanCreate(canPromote)) router.push(EDITOR_ROUTE as any);
  };

  const openDetail = (p: Promotion) =>
    router.push({ pathname: DETAIL_ROUTE, params: { id: String(p.id) } } as any);

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {t("proListHeading")}
      </Text>
      <Text style={styles.subtitle}>{t("proListSubtitle")}</Text>
      <PromotionInfoNote text={includedNote} style={styles.note} />
      {items.length ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openCreate}
          style={styles.createBtn}
          accessibilityRole="button"
          accessibilityLabel={t("proCreateOffer")}
        >
          <Ionicons name="add" size={iconScale(20)} color={theme.white} />
          <Text style={styles.createText}>{t("proCreateOffer")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader title={t("proListTitle")} />
      {loading ? (
        <ClassStateView loading message={t("proLoading")} />
      ) : error ? (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("proLoadErrorTitle")}
          message={error}
          actionLabel={t("retry")}
          onAction={() => load("initial")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <PromotionOwnerCard promotion={item} onPress={() => openDetail(item)} />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <ClassStateView
              icon="pricetag-outline"
              title={t("proEmptyTitle")}
              message={t("proEmptyMessage")}
              actionLabel={t("proCreateOffer")}
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
    note: { marginTop: moderateHeightScale(4) },
    createBtn: {
      marginTop: moderateHeightScale(6),
      minHeight: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    createText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });
