import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { Skeleton } from "@/src/components/skeletons";
import EmptyState from "@/src/components/emptyState";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import { fetchBusinessCustomers } from "@/src/services/customersService";
import type { BusinessCustomer } from "@/src/types/customers";
import {
  getBusinessCustomerContactLine,
  getBusinessCustomerListStatus,
  getStatusPillColors,
} from "@/src/utils/businessCustomerDisplay";

const PREVIEW_COUNT = 2;
const VIEW_ALL_MIN_COUNT = 3;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    customersContainer: {
      marginBottom: moderateHeightScale(24),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(12),
    },
    sectionTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sectionLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    list: {
      gap: moderateHeightScale(8),
    },
    customerCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(12),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    customerContent: {
      flex: 1,
      marginRight: moderateWidthScale(8),
    },
    customerName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
      textTransform: "capitalize",
    },
    customerSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    statusPill: {
      flexShrink: 0,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: moderateWidthScale(999),
    },
    statusPillText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
    },
    emptyStateContainer: {
      paddingVertical: moderateHeightScale(4),
    },
    retryLink: {
      marginTop: moderateHeightScale(4),
      alignSelf: "center",
    },
  });

export default function CustomersSection() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<BusinessCustomer[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const result = await fetchBusinessCustomers(1, {}, PREVIEW_COUNT);
      setCustomers(result.customers);
      setTotalCount(result.total);
      setLoadError(false);
    } catch {
      setCustomers([]);
      setTotalCount(0);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers]),
  );

  const displayedItems = customers ? customers.slice(0, PREVIEW_COUNT) : [];
  const showViewAll = totalCount >= VIEW_ALL_MIN_COUNT;

  const handleViewAll = () => {
    router.push("/(main)/dashboard/(home)/customers");
  };

  return (
    <View style={styles.customersContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("customers")}</Text>
        {showViewAll ? (
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.sectionLink}>{t("viewAll")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {customers === null ? (
        <Skeleton screenType="Customers" styles={styles} />
      ) : displayedItems.length > 0 ? (
        <View style={styles.list}>
          {displayedItems.map((item) => {
            const statusPill = getBusinessCustomerListStatus(item);
            const pillColors = getStatusPillColors(statusPill.tone, theme);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={styles.customerCard}
                onPress={() => {
                  router.push({
                    pathname: "/(main)/businessCustomerDetail",
                    params: { id: item.id.toString() },
                  } as any);
                }}
              >
                <BusinessCustomerAvatar
                  name={item.name}
                  profileImageUrl={item.profile_image_url}
                  size={moderateWidthScale(40)}
                  style={{ marginRight: moderateWidthScale(12) }}
                />
                <View style={styles.customerContent}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.name?.trim() || "Unknown"}
                  </Text>
                  <Text style={styles.customerSubtitle} numberOfLines={1}>
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
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View>
          <EmptyState
            compact
            icon={loadError ? "cloud-off" : "people-outline"}
            title={
              loadError ? t("failedToLoadCustomers") : t("noCustomersYet")
            }
            subtitle={loadError ? undefined : t("customersEmptySubtitle")}
            containerStyle={styles.emptyStateContainer}
          />
          {loadError ? (
            <TouchableOpacity onPress={fetchCustomers} style={styles.retryLink}>
              <Text style={styles.sectionLink}>{t("retry")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
