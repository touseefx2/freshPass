import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import {
  addToRecentSearches,
  setSearchState,
  clearSearchState,
  clearSearchReturnFromSearch2,
  type SearchState,
} from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import FloatingInput from "@/src/components/floatingInput";
import { SearchIcon, CloseIcon } from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import { exploreEndpoints } from "@/src/services/endpoints";

export type PopularServiceItem = { id: number | null; name: string };

const DEBOUNCE_MS = 400;

export type ServiceTemplateItem = {
  id: number;
  name: string;
  category_id: number;
  category: string;
  base_price: number;
  duration_hours: number;
  duration_minutes: number;
  active: boolean;
  createdAt: string;
};

export type BusinessSearchItem = {
  id: number;
  slug: string;
  title: string;
  logo_url?: string | null;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  country_code: string;
  category: { id: number; name: string };
  owner: { id: number; name: string };
  createdAt: string;
};

type ServiceBusinessListResponse = {
  success: boolean;
  message: string;
  data: {
    service_templates: ServiceTemplateItem[];
    businesses: BusinessSearchItem[];
  };
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const DEFAULT_BUSINESS_LOGO =
  process.env.EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO ?? "";

function getBusinessLogoUrl(logo: string | null | undefined): string {
  if (logo == null || logo.trim() === "") {
    return DEFAULT_BUSINESS_LOGO;
  }
  const trimmed = logo.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${BASE_URL}${trimmed}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(12),
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      minHeight: moderateHeightScale(48),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(20),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(12),
      gap: moderateWidthScale(12),
    },
    searchBoxText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    searchBoxPlaceholder: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    searchBoxClear: {
      padding: moderateWidthScale(4),
    },
    recentSectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(12),
    },
    recentSectionTitleWithResults: {
      marginTop: moderateHeightScale(24),
    },
    recentItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    recentItemLast: {
      borderBottomWidth: 0,
    },
    recentItemContent: {
      flex: 1,
    },
    recentItemText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    recentItemSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(2),
    },
    recentBusinessPlaceholder: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    recentBusinessLogoImage: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(8),
    },
    recentBusinessContent: {
      flex: 1,
    },
    recentBusinessTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    recentBusinessAddress: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginTop: moderateHeightScale(2),
    },
    recentEmpty: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      paddingVertical: moderateHeightScale(15),
    },
    popularSectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(24),
      marginBottom: moderateHeightScale(12),
    },
    popularServicesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(24),
    },
    popularServiceTag: {
      backgroundColor: theme.borderLight,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    popularServiceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    searchInputContainer: {
      width: "100%",
      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(20),
    },
    sectionHeading: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    serviceItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    serviceItemLast: {
      borderBottomWidth: 0,
    },
    serviceItemText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textTransform: "capitalize",
    },
    businessItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    businessItemLast: {
      borderBottomWidth: 0,
    },
    businessPlaceholder: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    businessLogoImage: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(8),
    },
    businessContent: {
      flex: 1,
    },
    businessTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textTransform: "capitalize",
    },
    businessAddress: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      marginTop: moderateHeightScale(2),
    },
    emptyState: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    servicesSection: {
      marginBottom: moderateHeightScale(8),
    },
    businessesSection: {
      marginTop: moderateHeightScale(8),
    },
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
    },
  });

function RecentBusinessLogo({
  logoUrl,
  theme,
  styles,
}: {
  logoUrl: string | undefined;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const [imageError, setImageError] = useState(false);
  const showPlaceholder =
    !logoUrl ||
    !(logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) ||
    imageError;
  if (showPlaceholder) {
    return (
      <View style={styles.recentBusinessPlaceholder}>
        <Ionicons
          name="person-outline"
          size={moderateWidthScale(22)}
          color={theme.lightGreen}
        />
      </View>
    );
  }
  return (
    <View style={styles.recentBusinessPlaceholder}>
      <Image
        source={{ uri: logoUrl }}
        style={styles.recentBusinessLogoImage}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    </View>
  );
}

function BusinessLogoImage({
  logo,
  theme,
  styles,
}: {
  logo: string | null | undefined;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
}) {
  const [imageError, setImageError] = useState(false);
  const uri = getBusinessLogoUrl(logo);
  const showPlaceholder = !uri || imageError;

  if (showPlaceholder) {
    return (
      <View style={styles.businessPlaceholder}>
        <Ionicons
          name="person-outline"
          size={moderateWidthScale(22)}
          color={theme.lightGreen}
        />
      </View>
    );
  }
  return (
    <View style={styles.businessPlaceholder}>
      <Image
        source={{ uri }}
        style={styles.businessLogoImage}
        onError={() => setImageError(true)}
        resizeMode="cover"
      />
    </View>
  );
}

function parsePopularServices(
  params: Record<string, string | undefined>,
): PopularServiceItem[] {
  try {
    const raw = params?.popularServices;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ popularServices?: string }>();
  const popularServices = useMemo(
    () => parsePopularServices(params as Record<string, string | undefined>),
    [params.popularServices],
  );
  const popularList = useMemo(
    () => popularServices.filter((s) => s.id !== null),
    [popularServices],
  );
  const dispatch = useAppDispatch();
  const recentSearchesRaw = useAppSelector(
    (state) => state.general.recentSearches,
  );
  const recentSearches = useMemo(
    (): SearchState[] =>
      recentSearchesRaw.map((item) =>
        typeof item === "string"
          ? {
              search: item,
              serviceId: null,
              businessId: "",
              businessName: "",
              businessLocationName: "",
            }
          : item,
      ),
    [recentSearchesRaw],
  );

  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const searchState = useAppSelector((state) => state.general.searchState);
  const searchReturnFromSearch2 = useAppSelector(
    (state) => state.general.searchReturnFromSearch2,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const justAppliedReturnRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const [serviceTemplates, setServiceTemplates] = useState<
    ServiceTemplateItem[]
  >([]);
  const [businesses, setBusinesses] = useState<BusinessSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchServiceBusinessList = useCallback(async (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) {
      setServiceTemplates([]);
      setBusinesses([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const url = exploreEndpoints.serviceBusinessList(trimmed);
      const res = (await ApiService.get(url)) as ServiceBusinessListResponse;
      if (res?.success && res?.data) {
        setServiceTemplates(res.data.service_templates ?? []);
        setBusinesses(res.data.businesses ?? []);
      } else {
        setServiceTemplates([]);
        setBusinesses([]);
      }
    } catch {
      setServiceTemplates([]);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setServiceTemplates([]);
      setBusinesses([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchServiceBusinessList(searchQuery);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchServiceBusinessList]);

  useFocusEffect(
    useCallback(() => {
      if (searchReturnFromSearch2) {
        setSearchQuery(searchReturnFromSearch2.search ?? "");
        setSelectedServiceId(searchReturnFromSearch2.serviceId ?? null);
        setSelectedServiceName(searchReturnFromSearch2.serviceName ?? "");
        dispatch(clearSearchReturnFromSearch2());
        justAppliedReturnRef.current = true;
      } else {
        if (justAppliedReturnRef.current) {
          justAppliedReturnRef.current = false;
        } else {
          setSearchQuery(searchState.search ?? "");
          setSelectedServiceId(searchState.serviceId ?? null);
          setSelectedServiceName(searchState.serviceName ?? "");
        }
      }
    }, [
      searchReturnFromSearch2,
      searchState.search,
      searchState.serviceId,
      searchState.serviceName,
      dispatch,
    ]),
  );

  const displayValue = (searchQuery || (searchState.search ?? "")).trim();
  const hasSearchValue = displayValue !== "";

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    setSelectedServiceId(null);
    setSelectedServiceName("");
  };

  const handleInputClear = () => {
    setSearchQuery("");
    setSelectedServiceId(null);
    setSelectedServiceName("");
    setServiceTemplates([]);
    setBusinesses([]);
    setHasSearched(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSearch = () => {
    const query = displayValue;
    Keyboard.dismiss();
    if (!query) {
      dispatch(clearSearchState());
      router.back();
      return;
    }
    const sid = selectedServiceId ?? searchState.serviceId ?? null;
    const sname = selectedServiceName || (searchState.serviceName ?? "");
    const payload: SearchState = {
      search: query,
      serviceId: sid,
      businessId: "",
      businessName: "",
      businessLocationName: "",
      ...(sname ? { serviceName: sname } : {}),
    };
    dispatch(addToRecentSearches(payload));
    dispatch(setSearchState(payload));
    router.back();
  };

  const onServicePress = (item: ServiceTemplateItem) => {
    const query = (item.name || "").trim();
    if (!query) return;
    const payload: SearchState = {
      search: query,
      serviceId: item.id,
      businessId: "",
      businessName: "",
      businessLocationName: "",
      ...(item.name ? { serviceName: item.name } : {}),
    };
    Keyboard.dismiss();
    dispatch(addToRecentSearches(payload));
    dispatch(setSearchState(payload));
    router.back();
  };

  const onBusinessPress = (item: BusinessSearchItem) => {
    const address = [item.street_address, item.city, item.state, item.zip_code]
      .filter(Boolean)
      .join(", ");
    const payload: SearchState = {
      search: searchQuery.trim(),
      serviceId: selectedServiceId ?? null,
      businessId: String(item.id),
      businessName: item.title,
      businessLocationName: address,
      ...(selectedServiceName ? { serviceName: selectedServiceName } : {}),
      businessLogoUrl: getBusinessLogoUrl(item.logo_url),
    };
    Keyboard.dismiss();
    dispatch(addToRecentSearches(payload));
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: item.id.toString() },
    } as any);
  };

  const handleRecentSearchPress = (item: SearchState) => {
    if (item.businessId) {
      router.push({
        pathname: "/(main)/businessDetail",
        params: { business_id: item.businessId },
      } as any);
      return;
    }
    setSearchQuery(item.search);
    setSelectedServiceId(item.serviceId ?? null);
    setSelectedServiceName(item.serviceName ?? "");
  };

  const handlePopularServicePress = (service: {
    id: number | null;
    name: string;
  }) => {
    setSearchQuery(service.name);
    setSelectedServiceId(service.id ?? null);
    setSelectedServiceName(service.name);
  };

  const hasServices = serviceTemplates.length > 0;
  const hasBusinesses = businesses.length > 0;
  const showEmptyState =
    hasSearched && !loading && !hasServices && !hasBusinesses;
  const hasSearchResults =
    loading || hasServices || hasBusinesses || showEmptyState;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader title={t("hiWhatAreYouLookingFor")} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          <FloatingInput
            ref={inputRef}
            label={t("searchServicesOrBusinesses")}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            placeholder={t("searchServicesOrBusinesses")}
            placeholderTextColor={theme.lightGreen}
            containerStyle={styles.searchInputContainer}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onClear={handleInputClear}
            showClearButton
            renderLeftAccessory={() => (
              <SearchIcon
                width={widthScale(18)}
                height={heightScale(18)}
                color={theme.darkGreen}
              />
            )}
          />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          )}

          {!loading && hasServices && (
            <View style={styles.servicesSection}>
              <Text style={styles.sectionHeading}>{t("services")}</Text>
              {serviceTemplates.map((item, index) => (
                <TouchableOpacity
                  key={`service-${item.id}`}
                  style={[
                    styles.serviceItem,
                    index === serviceTemplates.length - 1 &&
                      styles.serviceItemLast,
                  ]}
                  onPress={() => onServicePress(item)}
                  activeOpacity={0.7}
                >
                  <SearchIcon
                    width={widthScale(20)}
                    height={heightScale(20)}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.serviceItemText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!loading && hasBusinesses && (
            <View style={styles.businessesSection}>
              <Text style={styles.sectionHeading}>{t("businesses")}</Text>
              {businesses.map((item, index) => {
                const address = [
                  item.street_address,
                  item.city,
                  item.state,
                  item.zip_code,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TouchableOpacity
                    key={`business-${item.id}`}
                    style={[
                      styles.businessItem,
                      index === businesses.length - 1 &&
                        styles.businessItemLast,
                    ]}
                    onPress={() => onBusinessPress(item)}
                    activeOpacity={0.7}
                  >
                    <BusinessLogoImage
                      logo={item.logo_url}
                      theme={theme}
                      styles={styles}
                    />
                    <View style={styles.businessContent}>
                      <Text style={styles.businessTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {address ? (
                        <Text style={styles.businessAddress} numberOfLines={1}>
                          {address}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {showEmptyState && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {t("noAnyServiceOrBusinessFound")}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.recentSectionTitle,
              hasSearchResults && styles.recentSectionTitleWithResults,
            ]}
          >
            {t("recentSearches")}
          </Text>
          {recentSearches.length > 0 ? (
            recentSearches.map((item, index) => {
              const isLast = index === recentSearches.length - 1;
              const hasBusiness = Boolean(item.businessId);
              const key = hasBusiness
                ? `b-${item.businessId}-${index}`
                : `${item.search}-${item.serviceId ?? "n"}-${index}`;
              if (hasBusiness) {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.recentItem, isLast && styles.recentItemLast]}
                    onPress={() => handleRecentSearchPress(item)}
                    activeOpacity={0.7}
                  >
                    <RecentBusinessLogo
                      logoUrl={item.businessLogoUrl?.trim()}
                      theme={theme}
                      styles={styles}
                    />
                    <View style={styles.recentBusinessContent}>
                      <Text
                        style={styles.recentBusinessTitle}
                        numberOfLines={1}
                      >
                        {item.businessName || item.search}
                      </Text>
                      {item.businessLocationName ? (
                        <Text
                          style={styles.recentBusinessAddress}
                          numberOfLines={1}
                        >
                          {item.businessLocationName}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.recentItem, isLast && styles.recentItemLast]}
                  onPress={() => handleRecentSearchPress(item)}
                  activeOpacity={0.7}
                >
                  <SearchIcon
                    width={widthScale(18)}
                    height={heightScale(18)}
                    color={theme.lightGreen}
                  />
                  <View style={styles.recentItemContent}>
                    <Text style={styles.recentItemText} numberOfLines={1}>
                      {item.search}
                    </Text>
                    {(item.serviceName || item.serviceId != null) && (
                      <Text style={styles.recentItemSubtitle} numberOfLines={1}>
                        {item.serviceName
                          ? `Service: ${item.serviceName}`
                          : `Service ID: ${item.serviceId}`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.recentEmpty}>{t("noRecentSearchFound")}</Text>
          )}

          {popularList.length > 0 && (
            <>
              <Text style={styles.popularSectionTitle}>
                {t("popularServices")}
              </Text>
              <View style={styles.popularServicesContainer}>
                {popularList.map((service) => (
                  <TouchableOpacity
                    key={service.id ?? service.name}
                    style={styles.popularServiceTag}
                    onPress={() => handlePopularServicePress(service)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.popularServiceText}>
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t("search")}
            onPress={handleSearch}
            disabled={!displayValue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
