import React, { useMemo, useState, useCallback, useEffect } from "react";
import { FlatList, StatusBar, StyleSheet, Text, View } from "react-native";
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
  BusinessCardType,
  ListEmptySection,
} from "./ShowBusinessList";
import { createStyles as createListStyles } from "./ShowBusinessList/styles";
import ShowDeals from "./ShowDeals";
import ExploreSegmentToggle, {
  type ExploreSegmentValue,
} from "./ExploreSegmentToggle";
import ExploreResultsHeader from "./ExploreResultsHeader";
import ExploreServiceFilters from "./ExploreServiceFilters";
import type {
  ServiceItem,
  SubscriptionItem,
} from "@/src/components/businessList";
import TryOnModal from "./TryOnModal";
import { setIsFirstShowTryOn } from "@/src/state/slices/generalSlice";
import TryOnBanner from "./TryOnBanner";

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
  });

interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
  services?: ServiceItem[];
  subscriptions?: SubscriptionItem[];
}

const SUBSCRIPTION_TEMPLATES: Array<{ id: number; name: string }> = [
  { id: 1, name: "Classic Care" },
  { id: 2, name: "Gold Glam" },
  { id: 3, name: "VIP Elite" },
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const listStyles = useMemo(() => createListStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const isFirstTryon = useAppSelector(
    (state) => state.general.isFirstShowTryOn,
  );
  const categories = useAppSelector(
    (state: any) => state.categories.categories,
  );
  const selectedCategory = useAppSelector(
    (state: any) => state.categories.selectedCategory,
  );
  const isCusotmerandGuest = user.isGuest || user.userRole === "customer";
  const [verifiedSalons, setVerifiedSalons] = useState<VerifiedSalon[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState(false);
  const [verifiedSalonsDeals, setVerifiedSalonsDeals] = useState<
    VerifiedSalon[]
  >([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState(false);
  const [sortBy, setSortBy] = useState<SortByOption>("recommended");
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] =
    useState<ExploreSegmentValue>("individual");

  const [selectedServiceFilter, setSelectedServiceFilter] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [serviceTemplates, setServiceTemplates] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [selectedSubscriptionFilter, setSelectedSubscriptionFilter] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Reset both filters when category changes
  useEffect(() => {
    setSelectedServiceFilter(null);
    setSelectedSubscriptionFilter(null);
  }, [selectedCategory]);

  const handleServiceFilterSelect = useCallback(
    (value: { id: number; name: string } | null) => {
      setSelectedServiceFilter(value);
      setSelectedSubscriptionFilter(null);
    },
    [],
  );

  const handleSubscriptionFilterSelect = useCallback(
    (value: { id: number; name: string } | null) => {
      setSelectedSubscriptionFilter(value);
      setSelectedServiceFilter(null);
    },
    [],
  );

  const subscriptionFilters = useMemo(
    () =>
      [
        { id: null, name: "Subscriptions" },
        ...SUBSCRIPTION_TEMPLATES,
      ] as Array<{ id: number | null; name: string }>,
    [],
  );

  const serviceFilters = useMemo(
    () =>
      serviceTemplates.length > 0
        ? ([{ id: null, name: "Services" }, ...serviceTemplates] as Array<{
            id: number | null;
            name: string;
          }>)
        : [],
    [serviceTemplates],
  );

  const getSortByLabel = (value: SortByOption) =>
    SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Recommended";

  const fetchServiceTemplates = async (categoryId: number) => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          name: string;
          category_id: number;
          category: string;
          base_price: number;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          createdAt: string;
        }>;
      }>(businessEndpoints.serviceTemplates(categoryId));

      if (response.success && response.data) {
        setServiceTemplates(response.data);
      }
    } catch (error) {
      Logger.error("Failed to fetch service templates:", error);
    }
  };

  const fetchBusinessesDeals = async () => {
    try {
      setDealsLoading(true);
      setDealsError(false);
      let url = businessEndpoints.businesses();
      url = `${url}?type=featured`;
      if (selectedCategory) {
        url = `${url}&category_ids=${selectedCategory}`;
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
      const params: string[] = [];

      if (selectedCategory) {
        params.push(`category_ids=${selectedCategory}`);
      }
      if (selectedServiceFilter) {
        params.push(
          `service_template_id=${selectedServiceFilter.id}`,
          `with_services=true`,
        );
      }
      if (selectedSubscriptionFilter) {
        params.push(`with_subscription_plans=true`);
      }
      if (sortBy === "recommended") {
        params.push(`sort=completed_appointments`, `direction=desc`);
      }

      if (params.length > 0) {
        url = `${url}?${params.join("&")}`;
      }
      // if (userLocation?.lat && userLocation?.long) {
      //   url += `&latitude=${userLocation.lat}`;
      //   url += `&longitude=${userLocation.long}`;
      //   url += `&radius_km=20`;
      // }

      console.log("----------->url", url);

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
          portfolio_photos?: Array<{ id: number; path: string; url: string }>;
          services?: Array<{
            id: number;
            name: string;
            description?: string;
            price: string | number;
            duration_hours?: number;
            duration_minutes?: number;
          }>;
          subscription_plans?: Array<{
            id: number;
            name: string;
            price: string | number;
            original_price?: string | number;
            visits?: number;
            offer?: string;
            offer2?: string;
            image_url?: string | null;
            image?: string | null;
            services?: Array<{ name: string }>;
          }>;
        }>;
      }>(url);

      if (response.success && response.data) {
        const mappedSalons: VerifiedSalon[] = response.data.map((item) => {
          let imageUrl = process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE ?? "";

          if (
            item.portfolio_photos &&
            item.portfolio_photos.length > 0 &&
            item.portfolio_photos[0]?.url
          ) {
            imageUrl = item.portfolio_photos[0].url;
          }

          const base = {
            id: item.id,
            businessName: item.title,
            address: item.address,
            rating: item.average_rating || 0,
            reviewCount: item.ratings_count || 0,
            image: imageUrl,
          };

          const services: ServiceItem[] | undefined = item.services?.map(
            (s) => {
              const h = s.duration_hours ?? 0;
              const m = s.duration_minutes ?? 0;
              let duration = "";
              if (h > 0 && m > 0) duration = `${h}h ${m}m`;
              else if (h > 0) duration = `${h}h`;
              else if (m > 0) duration = `${m} Mins`;
              else duration = "45 Mins";
              const price =
                typeof s.price === "string" ? parseFloat(s.price) : s.price;

              const originalPrice = Number((price * 1.1).toFixed(2));
              return {
                id: s.id,
                title: s.name,
                price,
                originalPrice: originalPrice,
                description: s.description ?? "",
                duration,
              };
            },
          );

          const subscriptions: SubscriptionItem[] | undefined =
            item.subscription_plans?.map((p) => {
              const price =
                typeof p.price === "string" ? parseFloat(p.price) : p.price;
              const orig = Number((price * 1.1).toFixed(2));
              return {
                id: p.id,
                title: p.name,
                price,
                originalPrice: orig,
                offer: p.offer ?? `${p.visits ?? 0} visits/month`,
                offer2: p.offer2,
                inclusions: p.services?.map((s) => s.name) ?? [],
                image: p.image_url ?? p.image ?? null,
              };
            });

          return {
            ...base,
            ...(services && services.length > 0 ? { services } : {}),
            ...(subscriptions && subscriptions.length > 0
              ? { subscriptions }
              : {}),
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
        fetchBusinessesDeals();
        fetchBusinesses();
        fetchServiceTemplates(
          selectedCategory ? Number(selectedCategory) : categories?.[0]?.id,
        );
      }
    }, [selectedCategory, selectedServiceFilter, selectedSubscriptionFilter]),
  );

  return (
    <>
      <View style={styles.container}>
        <StatusBar
          backgroundColor={theme.darkGreen}
          barStyle="light-content"
          translucent
        />
        <ExploreHeader popularServices={serviceFilters} />

        <FlatList
          data={verifiedSalons}
          style={styles.list}
          contentContainerStyle={{
            paddingBottom: moderateHeightScale(20),
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.3}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <>
              {(verifiedSalonsDeals.length > 0 || dealsLoading) && (
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

              <ExploreSegmentToggle
                value={selectedSegment}
                onSelect={setSelectedSegment}
              />

              {selectedSegment === "individual" &&
                serviceFilters.length > 0 && (
                  <ExploreServiceFilters
                    type="service"
                    filters={serviceFilters}
                    selectedFilter={selectedServiceFilter}
                    onSelect={handleServiceFilterSelect}
                  />
                )}

              {selectedSegment === "subscriptions" &&
                subscriptionFilters.length > 0 && (
                  <ExploreServiceFilters
                    type="subscription"
                    filters={subscriptionFilters}
                    selectedFilter={selectedSubscriptionFilter}
                    onSelect={handleSubscriptionFilterSelect}
                  />
                )}

              <ExploreResultsHeader
                resultsCount={verifiedSalons.length}
                sortByLabel={getSortByLabel(sortBy)}
                onSortPress={() => setSortSheetVisible(true)}
              />
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
            <View
              style={{
                height: moderateHeightScale(
                  selectedServiceFilter || selectedSubscriptionFilter ? 5 : 16,
                ),
              }}
            />
          )}
          renderItem={({ item, index }) =>
            selectedServiceFilter || selectedSubscriptionFilter ? (
              <BusinessCardType
                item={item}
                index={index}
                styles={listStyles}
                type={selectedServiceFilter ? "individual" : "subscriptions"}
              />
            ) : (
              <BusinessCard item={item} styles={listStyles} />
            )
          }
        />

        {isFirstTryon && <TryOnBanner onPress={() => {}} />}
      </View>

      <SortByBottomSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {!isFirstTryon && (
        <TryOnModal
          visible={!isFirstTryon}
          // visible={true}
          onClose={() => dispatch(setIsFirstShowTryOn(true))}
          onUnlockPress={() => {}}
        />
      )}
    </>
  );
}
