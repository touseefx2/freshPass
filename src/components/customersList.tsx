import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
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
import FloatingInput from "@/src/components/floatingInput";
import RetryButton from "@/src/components/retryButton";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import { Skeleton } from "@/src/components/skeletons";
import { fetchBusinessCustomers } from "@/src/services/customersService";
import type { BusinessCustomer } from "@/src/types/customers";
import {
  getBusinessCustomerContactLine,
  getBusinessCustomerListStatus,
  getStatusPillColors,
} from "@/src/utils/businessCustomerDisplay";

const DEBOUNCE_MS = 400;

type SubscriptionFilter =
  | "all"
  | "none"
  | "pending"
  | "active"
  | "paused"
  | "expired"
  | "cancelled"
  | "trialing";

const FILTER_OPTIONS: { key: SubscriptionFilter; labelKey: string }[] = [
  { key: "all", labelKey: "all" },
  { key: "active", labelKey: "active" },
  { key: "expired", labelKey: "expired" },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    searchContainer: {
      marginTop: moderateHeightScale(12),
      marginBottom: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    filterWrapper: {
      marginBottom: moderateHeightScale(8),
    },
    filterScrollContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(4),
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignSelf: "center",
    },
    filterButtonActive: {
      backgroundColor: theme.lightGreen1,
      borderColor: theme.borderDark,
    },
    filterButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterButtonTextActive: {
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      flexGrow: 1,
    },
    rowContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowContent: {
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    rowName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
      textTransform: "capitalize",
    },
    rowSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    statusPill: {
      flexShrink: 0,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
    },
    statusPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
      alignItems: "center",
    },
  });

export default function CustomersList() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<SubscriptionFilter>("all");

  const isFirstFocusRef = useRef(true);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const currentPageRef = useRef(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildFilters = useCallback(() => {
    const filters: {
      search?: string;
      subscription_state?: string;
    } = {};

    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }
    if (selectedFilter !== "all") {
      filters.subscription_state = selectedFilter;
    }

    return filters;
  }, [debouncedSearch, selectedFilter]);

  const fetchCustomers = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      isRefresh: boolean = false,
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchBusinessCustomers(page, buildFilters());
        const nextHasMore = result.currentPage < result.lastPage;

        if (append) {
          setCustomers((prev) => [...prev, ...result.customers]);
        } else {
          setCustomers(result.customers);
        }

        currentPageRef.current = result.currentPage;
        hasMoreRef.current = nextHasMore;
      } catch (err: any) {
        hasMoreRef.current = false;
        if (!append) {
          setCustomers([]);
          setError(err?.message || t("failedToLoadCustomers"));
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [buildFilters, t],
  );

  useEffect(() => {
    hasMoreRef.current = false;
    currentPageRef.current = 1;
    fetchCustomers(1, false);
  }, [fetchCustomers]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      hasMoreRef.current = false;
      currentPageRef.current = 1;
      fetchCustomers(1, false);
    }, [fetchCustomers]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    hasMoreRef.current = false;
    currentPageRef.current = 1;
    fetchCustomers(1, false, true);
  }, [fetchCustomers]);

  const handleLoadMore = useCallback(() => {
    if (
      isFetchingRef.current ||
      loading ||
      loadingMore ||
      refreshing ||
      !hasMoreRef.current ||
      customers.length === 0
    ) {
      return;
    }
    fetchCustomers(currentPageRef.current + 1, true);
  }, [loading, loadingMore, refreshing, customers.length, fetchCustomers]);

  const handleCustomerPress = useCallback(
    (customer: BusinessCustomer) => {
      router.push({
        pathname: "/(main)/businessCustomerDetail",
        params: { id: customer.id.toString() },
      } as any);
    },
    [router],
  );

  const renderCustomerRow = useCallback(
    ({ item }: { item: BusinessCustomer }) => {
      const statusPill = getBusinessCustomerListStatus(item);
      const pillColors = getStatusPillColors(statusPill.tone, theme);

      return (
        <Pressable
          style={styles.rowContainer}
          onPress={() => handleCustomerPress(item)}
        >
          <BusinessCustomerAvatar
            name={item.name}
            profileImageUrl={item.profile_image_url}
            size={moderateWidthScale(40)}
            style={{ marginRight: moderateWidthScale(12) }}
          />
          <View style={styles.rowContent}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {getBusinessCustomerContactLine(item)}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: pillColors.backgroundColor },
            ]}
          >
            <Text
              style={[styles.statusPillText, { color: pillColors.color }]}
              numberOfLines={1}
            >
              {statusPill.label === "No subscription"
                ? t("noSubscription")
                : statusPill.label}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleCustomerPress, styles, t, theme],
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return <Skeleton screenType="Customers" />;
    }
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <RetryButton
            onPress={() => fetchCustomers(1, false)}
            loading={loading}
          />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t("noCustomersFound")}</Text>
      </View>
    );
  }, [loading, error, styles, t, fetchCustomers]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" />
      <StackHeader title={t("customers")} />
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <FloatingInput
            label={t("searchCustomers")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("searchCustomersPlaceholder")}
            placeholderTextColor={theme.lightGreen}
          />
        </View>

        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTER_OPTIONS.map((option) => {
              const isActive = selectedFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSelectedFilter(option.key)}
                  style={[
                    styles.filterButton,
                    isActive && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isActive && styles.filterButtonTextActive,
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={customers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomerRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
