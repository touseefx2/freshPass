import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
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
import RetryButton from "@/src/components/retryButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    categoriesContainer: {
      marginTop: moderateHeightScale(24),
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
      height: heightScale(70),
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
    loadingContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    errorContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    emptyContainer: {
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
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
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  onRetry: () => void;
}

export default function CategorySection({
  selectedCategory,
  onCategorySelect,
  onCategoryScrollingChange,
  categories,
  categoriesLoading,
  categoriesError,
  onRetry,
}: CategorySectionProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const categoryScrollRef = useRef<ScrollView>(null);
  const isCategoryScrollingRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const isScrollingRef = useRef(false);
  const isJumpingRef = useRef(false);

  const handleCategoryScrolling = (isScrolling: boolean) => {
    isCategoryScrollingRef.current = isScrolling;
    onCategoryScrollingChange?.(isScrolling);
  };

  // Create duplicated categories for infinite scroll (3 copies)
  const duplicatedCategories = useMemo(() => {
    if (categories.length === 0) return [];
    return [...categories, ...categories, ...categories];
  }, [categories]);

  // Calculate the width of one set of categories
  const oneSetWidth = useMemo(() => {
    if (categories.length === 0) return 0;
    const itemWidth = widthScale(70);
    const gap = moderateWidthScale(14);
    return (
      moderateWidthScale(20) + // left padding
      categories.length * itemWidth + // all items
      (categories.length - 1) * gap + // gaps between items
      moderateWidthScale(20) // right padding
    );
  }, [categories.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isJumpingRef.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    scrollPositionRef.current = offsetX;

    // If scrolled past the second set (near end), jump to first set smoothly
    if (offsetX >= oneSetWidth * 2 - 150) {
      isJumpingRef.current = true;
      isScrollingRef.current = false;
      categoryScrollRef.current?.scrollTo({
        x: offsetX - oneSetWidth,
        animated: false,
      });
      setTimeout(() => {
        isJumpingRef.current = false;
      }, 100);
    }
    // If scrolled before the first set (near start), jump to second set smoothly
    else if (offsetX <= 150) {
      isJumpingRef.current = true;
      isScrollingRef.current = false;
      categoryScrollRef.current?.scrollTo({
        x: offsetX + oneSetWidth,
        animated: false,
      });
      setTimeout(() => {
        isJumpingRef.current = false;
      }, 100);
    }
  };

  // Initialize scroll position to middle set
  useEffect(() => {
    if (categories.length > 0 && oneSetWidth > 0) {
      setTimeout(() => {
        categoryScrollRef.current?.scrollTo({
          x: oneSetWidth,
          animated: false,
        });
      }, 100);
    }
  }, [categories.length, oneSetWidth]);

  return (
    <ScrollView
      ref={categoryScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesScroll}
      nestedScrollEnabled={true}
      bounces={false}
      scrollEventThrottle={1}
      pagingEnabled={false}
      directionalLockEnabled={true}
      onScroll={handleScroll}
      onTouchStart={() => {
        isScrollingRef.current = true;
        handleCategoryScrolling(true);
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          isScrollingRef.current = false;
          handleCategoryScrolling(false);
        }, 200);
      }}
      onScrollBeginDrag={() => {
        isScrollingRef.current = true;
        handleCategoryScrolling(true);
      }}
      onScrollEndDrag={() => {
        setTimeout(() => {
          isScrollingRef.current = false;
          handleCategoryScrolling(false);
        }, 200);
      }}
      onMomentumScrollBegin={() => {
        isScrollingRef.current = true;
      }}
      onMomentumScrollEnd={() => {
        setTimeout(() => {
          isScrollingRef.current = false;
          handleCategoryScrolling(false);
        }, 200);
      }}
    >
      {categoriesLoading && categories.length === 0 ? (
        <View
          style={[
            styles.loadingContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : categoriesError ? (
        <View
          style={[
            styles.errorContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.errorText}>Failed to load categories</Text>
          <RetryButton onPress={onRetry} loading={categoriesLoading} />
        </View>
      ) : categories.length > 0 ? (
        duplicatedCategories.map((category, index) => (
          <TouchableOpacity
            key={`${category.id}-${index}`}
            style={styles.categoryItem}
            onPress={() => onCategorySelect(category.id)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: category?.image
                  ? category.image.startsWith("http://") ||
                    category.image.startsWith("https://")
                    ? category.image
                    : process.env.EXPO_PUBLIC_API_BASE_URL + category.image
                  : process.env.EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE,
              }}
              style={[
                styles.categoryImage,
                selectedCategory === category.id && styles.categoryImageActive,
                {
                  borderWidth: moderateWidthScale(
                    selectedCategory === category.id ? 3 : 1,
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
        ))
      ) : (
        <View
          style={[
            styles.emptyContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.emptyText}>No category found</Text>
        </View>
      )}
    </ScrollView>
  );
}
