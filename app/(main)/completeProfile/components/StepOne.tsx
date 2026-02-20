import React, {
  useMemo,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setBusinessCategory,
  setCategories,
} from "@/src/state/slices/completeProfileSlice";
import FloatingInput from "@/src/components/floatingInput";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const SEARCH_DEBOUNCE_MS = 400;

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
};

type StepOneProps = {
  onContinueFromSearch?: () => void;
};

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
    },
    containerInner: {
      flex: 1,
      gap: moderateHeightScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
      paddingHorizontal: moderateWidthScale(20),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    searchContainer: {
      marginTop: moderateHeightScale(5),
      marginHorizontal: moderateWidthScale(20),
    },
    searchDropdown: {
      position: "absolute",
      left: moderateWidthScale(20),
      right: moderateWidthScale(20),
      top: "100%",
      marginTop: moderateHeightScale(4),
      maxHeight: heightScale(220),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
      zIndex: 10,
    },
    searchDropdownItem: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    searchDropdownItemLast: {
      borderBottomWidth: 0,
    },
    searchDropdownItemText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    searchDropdownEmpty: {
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(16),
      alignItems: "center",
    },
    searchDropdownEmptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    searchDropdownLoader: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
    },
    lineSeparator: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
      position: "absolute",
    },
    categoriesContainer: {
      paddingVertical: moderateHeightScale(20),
    },
    categoriesGrid: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      rowGap: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      gap: "5%",
    },
    categoryCard: {
      width: "30%",
      height: heightScale(118),
    },
    categoryImage: {
      width: "100%",
      height: heightScale(90),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(12),
    },
    categoryCardSelected: {
      borderColor: theme.selectCard,
      borderWidth: 3,
    },
    categoryLabelContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(8),
      backgroundColor: theme.background,
    },
    categoryLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function StepOne({ onContinueFromSearch }: StepOneProps = {}) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { showBanner } = useNotificationContext();
  const { businessCategory, categories } = useAppSelector(
    (state) => state.completeProfile,
  );

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<CategoryItem[]>([]);
  const [searchResultsLoading, setSearchResultsLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setApiError(false);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          name: string;
          imageUrl: string | null;
        }>;
      }>(businessEndpoints.categories);

      if (response.success && response.data) {
        dispatch(setCategories(response.data));
      }
    } catch (error) {
      Logger.error("Failed to fetch categories:", error);
      setApiError(true);
      showBanner(t("apiFailed"), t("apiFailedFetchCategories"), "error", 2500);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSearchCategories = useCallback(async (search?: string) => {
    try {
      setSearchResultsLoading(true);
      const url = search?.trim()
        ? `${businessEndpoints.categories}?search=${encodeURIComponent(search.trim())}`
        : businessEndpoints.categories;
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: CategoryItem[];
      }>(url);
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      Logger.error("Failed to fetch search categories:", error);
      setSearchResults([]);
    } finally {
      setSearchResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearchFocused) return;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const query = searchQuery.trim();
    const delay = query ? SEARCH_DEBOUNCE_MS : 0;
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      fetchSearchCategories(query || undefined);
    }, delay);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [isSearchFocused, searchQuery, fetchSearchCategories]);

  const getCategoryImageUri = useCallback((imageUrl: string | null) => {
    if (!imageUrl || !imageUrl.trim()) {
      return process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE ?? "";
    }
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    return (process.env.EXPO_PUBLIC_API_BASE_URL ?? "") + imageUrl;
  }, []);

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
    setSearchQuery("");
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setIsSearchFocused(false);
  }, []);

  const handleDismissSearch = useCallback(() => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setIsSearchFocused(false);
    setSearchQuery("");
  }, []);

  const handleSelectSearchResult = useCallback(
    (item: CategoryItem) => {
      Keyboard.dismiss();
      searchInputRef.current?.blur();
      dispatch(setBusinessCategory({ id: item.id, name: item.name }));
      setSearchQuery("");
      setIsSearchFocused(false);
    },
    [dispatch, onContinueFromSearch],
  );

  const handleSelectCategory = useCallback(
    (categoryId: number, categoryName: string) => {
      dispatch(setBusinessCategory({ id: categoryId, name: categoryName }));
    },
    [dispatch],
  );

  const hasNoData = !categoriesLoading && !apiError && categories.length === 0;
  const showSkeleton = categoriesLoading && categories.length === 0;

  return (
    <View style={styles.container}>
      {showSkeleton ? (
        <Skeleton screenType="StepOne" styles={styles} />
      ) : apiError ? (
        <View style={styles.emptyStateContainer}>
          <RetryButton onPress={fetchCategories} loading={categoriesLoading} />
        </View>
      ) : hasNoData ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {t("businessCategoryNotFound")}
          </Text>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={handleDismissSearch}>
          <View style={styles.containerInner}>
            <View style={styles.titleSec}>
              <Text style={styles.title}>{t("whatsYourBusiness")}</Text>
              <Text style={styles.subtitle}>{t("selectCategorySubtitle")}</Text>
            </View>

            <View style={styles.searchContainer}>
              <FloatingInput
                ref={searchInputRef}
                label={t("search")}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("search")}
                placeholderTextColor={(colors as Theme).lightGreen2}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onClear={handleSearchClear}
                containerStyle={{
                  borderRadius: moderateWidthScale(999),
                }}
                inputStyle={{
                  height: heightScale(18),
                }}
                renderLeftAccessory={() => (
                  <Feather
                    name="search"
                    size={moderateWidthScale(18)}
                    color={(colors as Theme).darkGreen}
                  />
                )}
              />
              {isSearchFocused && (
                <View style={styles.searchDropdown}>
                  {searchResultsLoading ? (
                    <View style={styles.searchDropdownLoader}>
                      <ActivityIndicator
                        size="small"
                        color={(colors as Theme).darkGreen}
                      />
                    </View>
                  ) : searchResults.length > 0 ? (
                    <View>
                      {searchResults.map((item, index) => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.searchDropdownItem,
                            index === searchResults.length - 1 &&
                              styles.searchDropdownItemLast,
                          ]}
                          onPress={() => handleSelectSearchResult(item)}
                        >
                          <Text
                            numberOfLines={1}
                            style={styles.searchDropdownItemText}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.searchDropdownEmpty}>
                      <Text style={styles.searchDropdownEmptyText}>
                        {t("noDataFound")}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.categoriesContainer}>
              <View style={[styles.lineSeparator, { top: 0 }]} />
              <View style={styles.categoriesGrid}>
                {categories.map((item) => {
                  const isSelected = businessCategory?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectCategory(item.id, item.name)}
                      style={styles.categoryCard}
                    >
                      <Image
                        source={{
                          uri: getCategoryImageUri(item.imageUrl),
                        }}
                        style={[
                          styles.categoryImage,
                          isSelected && styles.categoryCardSelected,
                        ]}
                        resizeMode="cover"
                      />
                      <View style={styles.categoryLabelContainer}>
                        <Text numberOfLines={2} style={styles.categoryLabel}>
                          {item.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}
