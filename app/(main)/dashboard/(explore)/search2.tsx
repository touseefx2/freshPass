import React, { useMemo, useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
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
import FloatingInput from "@/src/components/floatingInput";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { SearchIcon } from "@/assets/icons";
import type { PopularServiceItem } from "./search";

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
    searchInputContainer: {
      width: "100%",
      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(20),
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

export default function Search2Screen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    popularServices?: string;
    searchQuery?: string;
    serviceId?: string;
    serviceName?: string;
  }>();
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

  useEffect(() => {
    setSearchQuery(initialQuery);
    setSelectedServiceId(initialServiceId);
    setSelectedServiceName(initialServiceName);
  }, [initialQuery, initialServiceId, initialServiceName]);

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(t);
  }, []);

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
    // dispatch(addToRecentSearches(payload));
    dispatch(setSearchState(payload));
    router.back();
  };

  const handleClear = () => {
    setSearchQuery("");
    setSelectedServiceId(null);
    setSelectedServiceName("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader title={t("servicesOrBusinesses")} />
      <StatusBar backgroundColor={theme.white} barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            renderLeftAccessory={() => (
              <SearchIcon
                width={widthScale(18)}
                height={heightScale(18)}
                color={theme.darkGreen}
              />
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
