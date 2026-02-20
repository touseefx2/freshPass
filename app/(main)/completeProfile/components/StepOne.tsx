import React, { useMemo, useEffect, useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
  setSearchTerm,
  setCategories,
} from "@/src/state/slices/completeProfileSlice";
import FloatingInput from "@/src/components/floatingInput";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
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

export default function StepOne() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { showBanner } = useNotificationContext();
  const { searchTerm, businessCategory, categories } = useAppSelector(
    (state) => state.completeProfile,
  );

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

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

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return categories;
    }
    const term = searchTerm.toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(term),
    );
  }, [categories, searchTerm]);

  const getCategoryImageUri = useCallback((imageUrl: string | null) => {
    if (!imageUrl || !imageUrl.trim()) {
      return process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE ?? "";
    }
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    return (process.env.EXPO_PUBLIC_API_BASE_URL ?? "") + imageUrl;
  }, []);

  const handleSearchChange = (value: string) => {
    dispatch(setSearchTerm(value));
  };

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
        <>
          <View style={styles.titleSec}>
            <Text style={styles.title}>{t("whatsYourBusiness")}</Text>
            <Text style={styles.subtitle}>{t("selectCategorySubtitle")}</Text>
          </View>

          <View style={styles.searchContainer}>
            <FloatingInput
              label={t("search")}
              value={searchTerm}
              onChangeText={handleSearchChange}
              placeholder={t("search")}
              placeholderTextColor={(colors as Theme).lightGreen2}
              onClear={() => dispatch(setSearchTerm(""))}
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
        </>
      )}
    </View>
  );
}
