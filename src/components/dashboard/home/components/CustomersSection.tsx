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
import { fetchBusinessCustomers } from "@/src/services/customersService";
import type { BusinessCustomer } from "@/src/types/customers";
import {
  getBusinessCustomerListStatus,
  getStatusPillColors,
} from "@/src/utils/businessCustomerDisplay";

const PREVIEW_COUNT = 5;

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
    customerItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(10),
    },
    customerName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginRight: moderateWidthScale(8),
      textTransform: "capitalize",
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
    line: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: moderateHeightScale(4),
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    retryLink: {
      marginTop: moderateHeightScale(8),
    },
  });

export default function CustomersSection() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<BusinessCustomer[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const result = await fetchBusinessCustomers(1, {}, PREVIEW_COUNT);
      setCustomers(result.customers);
      setLoadError(false);
    } catch {
      setCustomers([]);
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

  const handleViewAll = () => {
    router.push("/(main)/dashboard/(home)/customers");
  };

  return (
    <View style={styles.customersContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("customers")}</Text>
        {displayedItems.length > 0 ? (
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.sectionLink}>{t("viewAll")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {customers === null ? (
        <Skeleton screenType="Customers" styles={styles} />
      ) : displayedItems.length > 0 ? (
        displayedItems.map((item, index) => {
          const statusPill = getBusinessCustomerListStatus(item);
          const pillColors = getStatusPillColors(statusPill.tone, theme);

          return (
            <View key={item.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.customerItem}
                onPress={() => {
                  router.push({
                    pathname: "/(main)/businessCustomerDetail",
                    params: { id: item.id.toString() },
                  } as any);
                }}
              >
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.name}
                </Text>
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
              {index < displayedItems.length - 1 ? (
                <View style={styles.line} />
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {loadError ? t("failedToLoadCustomers") : t("noCustomersFound")}
          </Text>
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
