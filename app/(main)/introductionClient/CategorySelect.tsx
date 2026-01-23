import React, { useMemo, useEffect, useCallback, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";
import FloatingInput from "@/src/components/floatingInput";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Button from "@/src/components/button";
import { LeafLogo } from "@/assets/icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  setSelectBsnsCategory,
  setIsGuest,
} from "@/src/state/slices/userSlice";
import { setIsVisitFirst } from "@/src/state/slices/generalSlice";

interface CategorySelectProps {
  onNext: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      // marginBottom: moderateHeightScale(10),
    },
    logoContainer: {
      marginBottom: moderateHeightScale(5),
    },
    skipButton: {
      padding: moderateWidthScale(8),
    },
    skipButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    titleSec: {
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
      flex: 1,
    },
    categoriesGrid: {
      width: "100%",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(20),
    },
    categoriesGridSkeleton: {
      width: "100%",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(20),
      flexDirection: "row",
      flexWrap: "wrap",
      gap: "5%",
      rowGap: moderateHeightScale(12),
    },
    categoryCard: {
      width: "30%",
      height: heightScale(118),
      position: "relative",
    },
    categoryImage: {
      width: "100%",
      height: heightScale(90),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen2,
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
    selectedBadge: {
      position: "absolute",
      bottom: moderateHeightScale(45),
      left: moderateWidthScale(8),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    selectedBadgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    otherCategoriesContainer: {
      gap: moderateHeightScale(15),
      paddingHorizontal: moderateWidthScale(20),
    },
    otherCategoriesTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen2,
    },
    otherCategoryContainer: {
      gap: moderateHeightScale(12),
    },
    otherCategoryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    catSeparator: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
    },
    otherCategoryLabel: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      flex: 1,
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
    buttonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(20),
    },
  });

export default function CategorySelect({ onNext }: CategorySelectProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const { showBanner } = useNotificationContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [categories, setCategories] = useState<
    Array<{
      id: number;
      name: string;
      imageUrl: string | null;
    }>
  >([]);

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setApiError(false);

      // API service automatically uses guest token if access token is not available
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
        setCategories(response.data);
      }
    } catch (error) {
      Logger.error("Failed to fetch categories:", error);
      setApiError(true);
      showBanner("API Failed", "API failed to fetch categories", "error", 2500);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Filter all categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return categories;
    }
    const term = searchTerm.toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      setSelectedCategories((prev) => {
        if (prev.includes(categoryId)) {
          // Deselect
          return prev.filter((id) => id !== categoryId);
        } else {
          // Select (max 5)
          if (prev.length >= 5) {
            showBanner(
              "Limit Reached",
              "You can select up to 5 categories",
              "error",
              2000
            );
            return prev;
          }
          return [...prev, categoryId];
        }
      });
    },
    [showBanner]
  );

  const renderCategoryItem = useCallback(
    ({
      item,
    }: {
      item: { id: number; name: string; imageUrl: string | null };
    }) => {
      const isSelected = selectedCategories.includes(item.id);
      const selectedIndex = isSelected
        ? selectedCategories.indexOf(item.id) + 1
        : null;
      return (
        <Pressable
          onPress={() => handleSelectCategory(item.id)}
          style={styles.categoryCard}
        >
          {isSelected && selectedIndex && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedIndex}</Text>
            </View>
          )}
          <Image
            source={{
              uri: item?.imageUrl
                ? process.env.EXPO_PUBLIC_API_BASE_URL + item?.imageUrl
                : process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE,
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
    },
    [selectedCategories, handleSelectCategory]
  );

  const handleSkip = () => {
    dispatch(setIsGuest(true));
    dispatch(setIsVisitFirst(false));
    onNext();
  };

  const handleContinue = () => {
    // Map selected category IDs to the format needed for Redux
    const selectedCategoriesData = selectedCategories
      .map((categoryId) => {
        const category = categories.find((cat) => cat.id === categoryId);
        return category
          ? {
            id: category.id,
            name: category.name,
          }
          : null;
      })
      .filter((cat) => cat !== null) as Array<{
        id: number;
        name: string;
      }>;

    // Dispatch selected categories and set isGuest to true
    dispatch(setSelectBsnsCategory(selectedCategoriesData));
    dispatch(setIsGuest(true));
    dispatch(setIsVisitFirst(false));
    onNext();
  };

  const hasNoData = !categoriesLoading && !apiError && categories.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <LeafLogo />
        </View>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleSec}>
            <Text style={styles.title}>What&apos;s on your self-care radar?</Text>
            <Text style={styles.subtitle}>
              Select up to 5 categories you&apos;re interested in, and we&apos;ll
              show you personalized picks?
            </Text>
          </View>

          {categoriesLoading ? (
            <Skeleton screenType="CategorySelect" styles={styles} />
          ) : apiError ? (
            <View style={styles.emptyStateContainer}>
              <RetryButton onPress={fetchCategories} loading={categoriesLoading} />
            </View>
          ) : hasNoData ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Category data not found</Text>
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <FloatingInput
                  label="Search"
                  value={searchTerm}
                  onChangeText={handleSearchChange}
                  placeholder="Search"
                  placeholderTextColor={(colors as Theme).lightGreen2}
                  onClear={() => setSearchTerm("")}
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
                <FlatList
                  data={filteredCategories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={3}
                  columnWrapperStyle={{
                    gap: "5%",
                    marginBottom: moderateHeightScale(12),
                  }}
                  contentContainerStyle={styles.categoriesGrid}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button title="Continue" onPress={handleContinue} />
              </View>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
