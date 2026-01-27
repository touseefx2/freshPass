import React, { useMemo, useState, useCallback } from "react";
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useRouter, useFocusEffect } from "expo-router";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ExploreHeader from "./ExploreHeader";
import { fonts, fontSize } from "@/src/theme/fonts";
import SortByBottomSheet, {
  SORT_OPTIONS,
  type SortByOption,
} from "./SortByBottomSheet";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  BusinessCard,
  ListEmptySection,
} from "./ShowBusinessList";
import { createStyles as createListStyles } from "./ShowBusinessList/styles";
import ShowDeals from "./ShowDeals";



const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    list: {
      flex: 1,
    },
    section: {
      marginTop: moderateHeightScale(16),
      gap: moderateHeightScale(14),

    },
    sectionTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(20),
    },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      backgroundColor: theme.mapCircleFill,
      width: "100%",
    },
    resultsText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flexWrap: "wrap",
    },
    resultsTextBold: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sortByButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    sortByLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(999),
      padding: moderateWidthScale(3),
      marginHorizontal: moderateWidthScale(20),
      marginVertical: moderateHeightScale(12),

    },
    segmentOption: {
      flex: 1,
      paddingVertical: moderateHeightScale(10),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(999),
    },
    segmentOptionActive: {
      backgroundColor: theme.orangeBrown,
    },
    segmentOptionInactive: {
      backgroundColor: "transparent",
    },
    segmentOptionText: {
      fontSize: fontSize.size13,
    },
    segmentOptionTextActive: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    segmentOptionTextInactive: {
      color: theme.segmentInactiveTabText,
      fontFamily: fonts.fontRegular,
    },
  });

interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const listStyles = useMemo(() => createListStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const selectedCategory = useAppSelector(
    (state: any) => state.categories.selectedCategory
  );
  const isCusotmerandGuest = user.isGuest || user.userRole === "customer";
  const [verifiedSalons, setVerifiedSalons] = useState<VerifiedSalon[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState(false);
  const [verifiedSalonsDeals, setVerifiedSalonsDeals] = useState<VerifiedSalon[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState(false);
  const [sortBy, setSortBy] = useState<SortByOption>("recommended");
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<
    "subscriptions" | "individual"
  >("individual");

  const getSortByLabel = (value: SortByOption) =>
    SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Recommended";

  const fetchBusinessesDeals = async () => {
    try {
      setDealsLoading(true);
      setDealsError(false);
      let url = businessEndpoints.businesses();

      if (selectedCategory) {
        url = `${url}?category_ids=${selectedCategory}`;
      }

      // url = `${url}?sort=completed_appointments&direction=desc`;

      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          title: string;
          address: string;
          average_rating: number;
          ratings_count: number;
          image_url: string | null;
          logo_url: string | null;
          portfolio_photos?: Array<{
            id: number;
            path: string;
            url: string;
          }>;
        }>;
      }>(url);

      if (response.success && response.data) {
        // Map API response to VerifiedSalon format
        const mappedSalons: VerifiedSalon[] = response.data.map((item) => {
          let imageUrl = process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "";

          if (
            item.portfolio_photos &&
            item.portfolio_photos.length > 0 &&
            item.portfolio_photos[0]?.url
          ) {
            imageUrl = item.portfolio_photos[0].url;
          }

          return {
            id: item.id,
            businessName: item.title,
            address: item.address,
            rating: item.average_rating || 0,
            reviewCount: item.ratings_count || 0,
            image: imageUrl,
          };
        });

        setVerifiedSalonsDeals(mappedSalons);
      }
    } catch (error) {
      Logger.error("Failed to fetch businesses:", error);
      verifiedSalonsDeals.length <= 0 && setDealsError(true);
    } finally {
      setDealsLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setBusinessesLoading(true);
      setBusinessesError(false);
      let url = businessEndpoints.businesses();


      url = `${url}?sort=completed_appointments&direction=desc`;


      if (selectedCategory) {
        url = `${url}&category_ids=${selectedCategory}`;
      }

      // if (userLocation?.lat && userLocation?.long) {
      //   url += `&latitude=${userLocation.lat}`;
      //   url += `&longitude=${userLocation.long}`;
      //   url += `&radius_km=20`;
      // }

      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          title: string;
          address: string;
          average_rating: number;
          ratings_count: number;
          image_url: string | null;
          logo_url: string | null;
          portfolio_photos?: Array<{
            id: number;
            path: string;
            url: string;
          }>;
        }>;
      }>(url);

      if (response.success && response.data) {
        // Map API response to VerifiedSalon format
        const mappedSalons: VerifiedSalon[] = response.data.map((item) => {
          let imageUrl = process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "";

          if (
            item.portfolio_photos &&
            item.portfolio_photos.length > 0 &&
            item.portfolio_photos[0]?.url
          ) {
            imageUrl = item.portfolio_photos[0].url;
          }

          return {
            id: item.id,
            businessName: item.title,
            address: item.address,
            rating: item.average_rating || 0,
            reviewCount: item.ratings_count || 0,
            image: imageUrl,
          };
        });

        setVerifiedSalons(mappedSalons);

      }
    } catch (error) {
      Logger.error("Failed to fetch businesses:", error);
      verifiedSalons.length <= 0 && setBusinessesError(true);
    } finally {
      setBusinessesLoading(false);
    }
  };



  useFocusEffect(
    useCallback(() => {
      if (isCusotmerandGuest) {
        fetchBusinesses();
        fetchBusinessesDeals();
      }
    }, [selectedCategory]),
  );


  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ExploreHeader />

        <FlatList
          data={verifiedSalons}
          contentContainerStyle={{
            paddingBottom: moderateHeightScale(20),
            flexGrow: 1,
          }}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.3}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <>
              {verifiedSalonsDeals.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>FreshPass Deals</Text>
                  <ShowDeals
                    businessesLoading={dealsLoading}
                    businessesError={dealsError}
                    verifiedSalons={verifiedSalonsDeals}
                    onRetry={fetchBusinessesDeals}
                  />
                </View>
              )}

              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => setSelectedSegment("individual")}
                  style={[
                    styles.segmentOption,
                    selectedSegment === "individual"
                      ? styles.segmentOptionActive
                      : styles.segmentOptionInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentOptionText,
                      selectedSegment === "individual"
                        ? styles.segmentOptionTextActive
                        : styles.segmentOptionTextInactive,
                    ]}
                  >
                    Individual services
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedSegment("subscriptions")}
                  style={[
                    styles.segmentOption,
                    selectedSegment === "subscriptions"
                      ? styles.segmentOptionActive
                      : styles.segmentOptionInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentOptionText,
                      selectedSegment === "subscriptions"
                        ? styles.segmentOptionTextActive
                        : styles.segmentOptionTextInactive,
                    ]}
                  >
                    Subscriptions list
                  </Text>
                </Pressable>
              </View>


              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  Showing:
                  <Text style={styles.resultsTextBold}>
                    {" "}
                    {verifiedSalons.length} results
                  </Text>
                </Text>
                <Pressable
                  onPress={() => setSortSheetVisible(true)}
                  style={styles.sortByButton}
                  accessibilityLabel="Sort by"
                >
                  <Text style={styles.sortByLabel}>
                    Sort by: {getSortByLabel(sortBy)}{" "}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={moderateWidthScale(14)}
                    color={theme.darkGreen}
                  />
                </Pressable>
              </View>
            </>
          }
          ListEmptyComponent={() => (
            <ListEmptySection
              businessesLoading={businessesLoading}
              businessesError={businessesError}
              onRetry={fetchBusinesses}
              styles={listStyles}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: moderateHeightScale(12) }} />
          )}
          renderItem={({ item }) => (
            <BusinessCard item={item} styles={listStyles} />
          )}

        />

      </View>

      <SortByBottomSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </>
  );
}
