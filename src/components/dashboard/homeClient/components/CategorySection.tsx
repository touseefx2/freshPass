import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import RetryButton from "@/src/components/retryButton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    categoriesContainer: {
      marginVertical: moderateHeightScale(12),
    },
    categoriesScroll: {
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateWidthScale(14),
    },
    categoryItem: {
      alignItems: "center",
      width: widthScale(70),
    },
    categoryImage: {
      width: widthScale(70),
      height: heightScale(68),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen2,
      borderColor: theme.lightGreen1,
      borderWidth: 0.5,
      overflow: "hidden",
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    categoryImageActive: {
      borderColor: theme.selectCard,
    },
    categoryText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(4),
      textAlign: "center",
      flexWrap: "wrap",
      width: widthScale(60),
    },
    categoryTextActive: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      marginTop: moderateHeightScale(4),
      textAlign: "center",
      flexWrap: "wrap",
      width: widthScale(60),
    },
  });

interface Category {
  id: number;
  name: string;
  image: string | null;
}

interface CategorySectionProps {
  selectedCategory?: string | number | undefined;
  onCategorySelect: (categoryId: number) => void;
  onCategoryScrollingChange?: (isScrolling: boolean) => void;
  onCategoriesLoaded?: (categories: Category[]) => void;
}

export default function CategorySection({
  selectedCategory,
  onCategorySelect,
  onCategoryScrollingChange,
  onCategoriesLoaded,
}: CategorySectionProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const categoryScrollRef = useRef<ScrollView>(null);
  const isCategoryScrollingRef = useRef(false);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(false);
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
        // Map API response to component format (imageUrl -> image)
        const mappedCategories: Category[] = response.data.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.imageUrl,
        }));
        setCategories(mappedCategories);
        onCategoriesLoaded?.(mappedCategories);
      }
    } catch (error) {
      Logger.error("Failed to fetch categories:", error);
      setCategoriesError(true);
      showBanner("API Failed", "API failed to fetch categories", "error", 2500);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryScrolling = (isScrolling: boolean) => {
    isCategoryScrollingRef.current = isScrolling;
    onCategoryScrollingChange?.(isScrolling);
  };

  if (categoriesLoading) {
    return (
      <View
        style={[
          styles.categoriesContainer,
          {
            paddingVertical: moderateHeightScale(20),
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (categoriesError) {
    return (
      <View
        style={[
          styles.categoriesContainer,
          {
            paddingVertical: moderateHeightScale(20),
            alignItems: "center",
            justifyContent: "center",
            gap: moderateHeightScale(12),
          },
        ]}
      >
        <Text
          style={{
            fontSize: fontSize.size14,
            fontFamily: fonts.fontRegular,
            color: theme.lightGreen,
            textAlign: "center",
          }}
        >
          Failed to load categories
        </Text>
        <RetryButton
          onPress={fetchCategories}
          loading={categoriesLoading}
        />
      </View>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <ScrollView
      ref={categoryScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesScroll}
      nestedScrollEnabled={true}
      bounces={true}
      alwaysBounceHorizontal={true}
      overScrollMode="always"
      decelerationRate="fast"
      scrollEventThrottle={16}
      onTouchStart={() => {
        handleCategoryScrolling(true);
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          handleCategoryScrolling(false);
        }, 100);
      }}
      onScrollBeginDrag={() => {
        handleCategoryScrolling(true);
      }}
      onScrollEndDrag={() => {
        setTimeout(() => {
          handleCategoryScrolling(false);
        }, 100);
      }}
      onMomentumScrollEnd={() => {
        setTimeout(() => {
          handleCategoryScrolling(false);
        }, 100);
      }}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryItem}
          onPress={() => onCategorySelect(category.id)}
          activeOpacity={0.8}
        >
          <Image
            source={{
              uri: category?.image
                ? process.env.EXPO_PUBLIC_API_BASE_URL + category?.image
                : process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE,
            }}
            style={[
              styles.categoryImage,
              selectedCategory === category.id && styles.categoryImageActive,
              {
                borderWidth: moderateWidthScale(
                  selectedCategory === category.id ? 3 : 1
                ),
              },
            ]}
            resizeMode="cover"
          />
          <Text
            style={
              selectedCategory === category.id
                ? styles.categoryTextActive
                : styles.categoryText
            }
            numberOfLines={2}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
