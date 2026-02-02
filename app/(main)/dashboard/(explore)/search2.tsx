import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Pressable,
  Image,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import {
  setSearchState,
  setSearchReturnFromSearch2,
  clearSearchState,
  addToRecentSearches,
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
import FloatingInput from "@/src/components/floatingInput";
import StackHeader from "@/src/components/StackHeader";
import { SearchIcon } from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import { exploreEndpoints } from "@/src/services/endpoints";
import type { PopularServiceItem } from "./search";

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
    searchRow: {
      paddingHorizontal: moderateWidthScale(20),
    },

    searchInputContainer: {
      width: "100%",
      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(20),
    },
    cancelButton: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(4),
    },
    cancelText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
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
  });

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
  const path = trimmed;
  return `${BASE_URL}${path}`;
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

export default function Search2Screen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    popularServices?: string;
    searchQuery?: string;
    serviceId?: string;
    serviceName?: string;
    fromSearchScreen?: string;
  }>();
  const popularServices = useMemo(
    () => parsePopularServices(params as Record<string, string | undefined>),
    [params.popularServices],
  );
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const initialQuery = (params.searchQuery ?? "").trim();
  const initialServiceId = params.serviceId
    ? Number(params.serviceId) || null
    : null;
  const initialServiceName = (params.serviceName ?? "").trim();

  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    initialServiceId,
  );
  const [selectedServiceName, setSelectedServiceName] =
    useState(initialServiceName);
  const [serviceTemplates, setServiceTemplates] = useState<
    ServiceTemplateItem[]
  >([]);
  const [businesses, setBusinesses] = useState<BusinessSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setSearchQuery(initialQuery);
    setSelectedServiceId(initialServiceId);
    setSelectedServiceName(initialServiceName);
  }, [initialQuery, initialServiceId, initialServiceName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    setSelectedServiceId(null);
    setSelectedServiceName("");
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      dispatch(clearSearchState());
      router.back();
      return;
    }
    const payload: SearchState = {
      search: query,
      serviceId: selectedServiceId ?? null,
      businessId: "",
      businessName: "",
      businessLocationName: "",
      ...(selectedServiceName ? { serviceName: selectedServiceName } : {}),
    };
    dispatch(addToRecentSearches(payload));
    if (params.fromSearchScreen === "1") {
      dispatch(
        setSearchReturnFromSearch2({
          search: query,
          serviceId: selectedServiceId ?? null,
          serviceName: selectedServiceName ?? "",
        }),
      );
    }
    router.back();
  };

  const handleClear = () => {
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

  const onServicePress = (item: ServiceTemplateItem) => {
    const payload: SearchState = {
      search: item.name || "",
      serviceId: item.id,
      businessId: "",
      businessName: "",
      businessLocationName: "",
      serviceName: item.name,
    };
    Keyboard.dismiss();
    dispatch(addToRecentSearches(payload));
    if (params.fromSearchScreen === "1") {
      dispatch(
        setSearchReturnFromSearch2({
          search: item.name || "",
          serviceId: selectedServiceId ?? null,
          serviceName: selectedServiceName ?? "",
        }),
      );
    }
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

  const hasServices = serviceTemplates.length > 0;
  const hasBusinesses = businesses.length > 0;
  const showEmptyState =
    hasSearched && !loading && !hasServices && !hasBusinesses;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader title={t("servicesOrBusinesses")} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.searchRow}>
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
            onClear={handleClear}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
