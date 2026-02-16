import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Text,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { aiTransactionsEndpoints } from "@/src/services/endpoints";
import dayjs from "dayjs";

export default function AiTransactions() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  type AiTransaction = {
    id: number;
    user_id: number;
    type: string;
    credits: number;
    price: string;
    invoice_url: string | null;
    description: string;
    created_at: string;
    updated_at: string;
  };

  type AiTransactionsApiResponse = {
    success: boolean;
    data: {
      current_page: number;
      data: AiTransaction[];
      per_page: number;
      total: number;
      last_page: number;
      next_page_url: string | null;
    };
  };

  const PER_PAGE = 10;

  const [transactions, setTransactions] = useState<AiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const formatDateTime = useCallback((value: string) => {
    const d = dayjs(value);
    if (d.isValid()) {
      return d.format("MMM D, YYYY · h:mm A");
    }
    return value;
  }, []);

  const fetchTransactions = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await ApiService.get<AiTransactionsApiResponse>(
          aiTransactionsEndpoints.list({ page, per_page: PER_PAGE }),
        );

        if (response.success && response.data) {
          const newData = response.data.data ?? [];
          if (append) {
            setTransactions((prev) => [...prev, ...newData]);
          } else {
            setTransactions(newData);
          }

          setCurrentPage(response.data.current_page ?? page);
          const hasNext =
            !!response.data.next_page_url &&
            response.data.current_page < (response.data.last_page ?? 1);
          setHasMore(hasNext);
        } else if (!append) {
          setTransactions([]);
          setHasMore(false);
        }
      } catch (_error) {
        if (!append) {
          setTransactions([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTransactions(1, false);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchTransactions(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchTransactions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions(1, false);
  }, [fetchTransactions]);

  const renderItem = useCallback(
    ({ item }: { item: AiTransaction }) => {
      const isCredit = (item.type ?? "").toLowerCase() === "credit";
      const statusLabel = isCredit ? t("credit") : t("debit");
      const badgeStyle = isCredit
        ? styles.jobCardStatusBadgeCompleted
        : styles.jobCardStatusBadgeFailed;

      return (
        <View style={[styles.jobCard, styles.shadow]}>
          <View style={styles.jobCardInner}>
            <View style={styles.jobCardAccent} />
            <View style={styles.jobCardContent}>
              <View style={styles.jobCardHeader}>
                <Text
                  style={styles.jobCardId}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.description || "-"}
                </Text>
              </View>

              <View style={styles.jobCardMetaRow}>
                <View style={styles.jobCardMetaItem}>
                  <Text style={styles.jobCardMetaLabel}>{t("price")}</Text>
                  <Text style={styles.jobCardMetaValue}>
                    {item.price ? `$${item.price}` : "-"}
                  </Text>
                </View>
                <View style={styles.jobCardMetaItem}>
                  <Text style={styles.jobCardMetaLabel}>{t("credits")}</Text>
                  <Text style={styles.jobCardMetaValue}>
                    {item.credits != null ? String(item.credits) : "-"}
                  </Text>
                </View>
                <View style={styles.jobCardMetaItem}>
                  <Text style={styles.jobCardMetaLabel}>{t("createdAt")}</Text>
                  <Text
                    style={styles.jobCardMetaValue}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatDateTime(item.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [styles, t, formatDateTime, theme.darkGreen, theme.appointmentStatusText],
  );

  const keyExtractor = useCallback(
    (item: AiTransaction) => item.id.toString(),
    [],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [loadingMore, styles.loadingFooter, theme.primary]);

  const listEmptyComponent = useCallback(
    () =>
      !loading ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>{t("noAiTransactions")}</Text>
        </View>
      ) : null,
    [loading, styles.emptyStateContainer, styles.emptyStateText, t],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader title={t("transcations")} />
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={listEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />
    </View>
  );
}
