import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Pressable,
  Image,
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
import { SearchIcon, CloseIcon } from "@/assets/icons";

export type PopularServiceItem = { id: number | null; name: string };

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
    <Image
      source={{ uri: logoUrl }}
      style={styles.recentBusinessLogoImage}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
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

  console.log("------> recentSearches", recentSearches);

  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const searchState = useAppSelector((state) => state.general.searchState);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );
  const [selectedServiceName, setSelectedServiceName] = useState("");

  useFocusEffect(
    useCallback(() => {
      setSearchQuery(searchState.search ?? "");
      setSelectedServiceId(searchState.serviceId ?? null);
      setSelectedServiceName(searchState.serviceName ?? "");
    }, [searchState.search, searchState.serviceId, searchState.serviceName]),
  );

  const displayValue = (searchQuery || (searchState.search ?? "")).trim();
  const hasSearchValue = displayValue !== "";

  const handleSearchBoxPress = () => {
    const sid = selectedServiceId ?? searchState.serviceId ?? null;
    router.push({
      pathname: "./search2",
      params: {
        popularServices: params.popularServices ?? "",
        searchQuery: (searchQuery || (searchState.search ?? "")).trim(),
        serviceId: sid != null ? String(sid) : "",
        serviceName: selectedServiceName || (searchState.serviceName ?? ""),
      },
    });
  };

  const handleSearchBoxClear = () => {
    setSearchQuery("");
    setSelectedServiceId(null);
    setSelectedServiceName("");
    dispatch(clearSearchState());
  };

  const handleSearch = () => {
    const query = displayValue;
    if (!query) return;
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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader title={t("hiWhatAreYouLookingFor")} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.searchBox}
          onPress={handleSearchBoxPress}
          activeOpacity={0.8}
        >
          <SearchIcon
            width={widthScale(18)}
            height={heightScale(18)}
            color={theme.darkGreen}
          />
          <Text
            style={[
              styles.searchBoxText,
              !hasSearchValue && styles.searchBoxPlaceholder,
            ]}
            numberOfLines={1}
          >
            {hasSearchValue ? displayValue : t("searchServicesOrBusinesses")}
          </Text>
          {hasSearchValue && (
            <Pressable
              onPress={handleSearchBoxClear}
              style={styles.searchBoxClear}
              hitSlop={moderateWidthScale(8)}
            >
              <CloseIcon
                width={widthScale(18)}
                height={heightScale(18)}
                color={theme.darkGreen}
              />
            </Pressable>
          )}
        </TouchableOpacity>

        <Text style={styles.recentSectionTitle}>{t("recentSearches")}</Text>
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
                    <Text style={styles.recentBusinessTitle} numberOfLines={1}>
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
                  <Text style={styles.popularServiceText}>{service.name}</Text>
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
    </SafeAreaView>
  );
}
