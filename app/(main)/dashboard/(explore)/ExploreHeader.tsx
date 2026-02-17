import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Pressable,
  type LayoutChangeEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector, useTheme, useAppDispatch } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SearchIcon,
  FilterIcon,
  LocationPinIcon,
  CalendarIcon,
  CloseIcon,
} from "@/assets/icons";
import { fontSize, fonts } from "@/src/theme/fonts";
import { useTranslation } from "react-i18next";
import {
  setSelectedCategory,
  Category,
} from "@/src/state/slices/categoriesSlice";
import DatePickerModal from "@/src/components/datePickerModal";
import type { PopularServiceItem } from "./search";
import dayjs from "dayjs";
import {
  setSelectedDate,
  clearSelectedDate,
  clearSearchState,
} from "@/src/state/slices/generalSlice";
import { clearLocation, setLocation } from "@/src/state/slices/userSlice";

function formatSelectedDateLabel(d: dayjs.Dayjs): string {
  if (dayjs().isSame(d, "day")) return "Today";
  if (dayjs().add(1, "day").isSame(d, "day")) return "Tomorrow";
  if (d.year() === dayjs().year()) return d.format("MMM D");
  return d.format("MMM D, YYYY");
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerContainer: {
      backgroundColor: theme.darkGreen,
      // paddingHorizontal: moderateWidthScale(20),
      // paddingBottom: moderateHeightScale(16),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      marginHorizontal: moderateWidthScale(20),
    },
    searchIconContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    searchTextContainer: {
      flex: 1,
    },
    searchPlaceholder: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    filterIconContainer: {
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 9999999,
      padding: 4,
    },
    filtersRow: {
      flexDirection: "row",
      gap: moderateWidthScale(15),
      marginBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
    },
    filterField: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(10),
    },
    filterFieldTouchable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    whereWhenIconContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    filterPlaceholder: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    filterTextContainer: {
      flex: 1,
    },
    filterValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    clearButton: {},
    categoriesContainer: {
      // marginTop: moderateHeightScale(4),
    },
    categoriesScroll: {
      paddingHorizontal: moderateWidthScale(14),
      gap: moderateWidthScale(12),
    },
    categoryItem: {
      paddingHorizontal: moderateWidthScale(6),
      paddingTop: moderateHeightScale(5),
      paddingBottom: moderateHeightScale(12),
      position: "relative",
    },
    categoryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
    },
    categoryTextActive: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    categoryUnderline: {
      position: "absolute",
      bottom: moderateHeightScale(0),
      left: moderateWidthScale(4),
      right: moderateWidthScale(4),
      height: moderateHeightScale(3),
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(1),
    },
  });

interface ExploreHeaderProps {
  popularServices?: PopularServiceItem[];
  setSelectedServiceFilter: (
    service: { id: number; name: string } | null,
  ) => void;
}

export default function ExploreHeader({
  popularServices = [],
  setSelectedServiceFilter,
}: ExploreHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.user.location);
  const search = useAppSelector((state) => state.general.searchState);
  const categories = useAppSelector((state) => state.categories.categories);
  const selectedCategory = useAppSelector(
    (state) => state.categories.selectedCategory,
  );
  const router = useRouter();
  const selectedDateISO = useAppSelector((state) => state.general.selectedDate);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const selectedDate = selectedDateISO ? dayjs(selectedDateISO) : null;
  const categoryScrollRef = useRef<ScrollView>(null);
  const categoryXPositionsRef = useRef<number[]>([]);

  // Scroll category list so selected category is at start (when coming from Home)
  useEffect(() => {
    if (categories.length === 0) return;
    const index =
      selectedCategory === undefined
        ? 0
        : 1 + categories.findIndex((c: Category) => c.id === selectedCategory);
    if (index >= 0 && categoryXPositionsRef.current[index] !== undefined) {
      const x = categoryXPositionsRef.current[index];
      setTimeout(() => {
        categoryScrollRef.current?.scrollTo({
          x: Math.max(0, x),
          animated: true,
        });
      }, 300);
    }
  }, [selectedCategory, categories.length]);

  const handleSearchPress = () => {
    router.push({
      pathname: "./search",
      params: { popularServices: JSON.stringify(popularServices) },
    });
  };

  const handleFilterPress = () => {
    // TODO: Open filter modal
    console.log("Filter pressed");
  };

  const handleWherePress = () => {
    router.push("./location");
  };

  const handleWhenPress = () => {
    setDateModalVisible(true);
  };

  const handleCategorySelect = (categoryId: number | "all") => {
    dispatch(
      setSelectedCategory(categoryId === "all" ? undefined : categoryId),
    );
  };

  const hasSearchValue = (search.search ?? "").trim() !== "";
  console.log("------> hasSearchValue", search);

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + moderateHeightScale(10) },
      ]}
    >
      {/* Search Field */}
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <View style={styles.searchIconContainer}>
          <SearchIcon
            width={widthScale(20)}
            height={heightScale(20)}
            color={theme.darkGreen}
          />
        </View>
        <View style={styles.searchTextContainer}>
          <Text
            style={
              hasSearchValue ? styles.filterValue : styles.searchPlaceholder
            }
            numberOfLines={1}
          >
            {hasSearchValue
              ? (search.search ?? "").trim()
              : t("findServicesToBookIn")}
          </Text>
        </View>
        {hasSearchValue && (
          <Pressable
            onPress={() => {
              dispatch(clearSearchState());
              setSelectedServiceFilter(null);
            }}
            style={styles.clearButton}
            hitSlop={moderateWidthScale(8)}
          >
            <CloseIcon
              width={widthScale(18)}
              height={heightScale(18)}
              color={theme.darkGreen}
            />
          </Pressable>
        )}
        {/* <TouchableOpacity
          style={styles.filterIconContainer}
          onPress={handleFilterPress}
          activeOpacity={0.8}
        >
          <FilterIcon
            width={widthScale(18)}
            height={heightScale(18)}
            color={theme.darkGreen}
          />
        </TouchableOpacity> */}
      </TouchableOpacity>

      {/* Where? and When? Fields */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          onPress={handleWherePress}
          activeOpacity={0.8}
          style={styles.filterField}
        >
          <View style={styles.filterFieldTouchable}>
            <View style={styles.whereWhenIconContainer}>
              <LocationPinIcon
                width={widthScale(16)}
                height={heightScale(16)}
                color={theme.darkGreen}
              />
            </View>

            <View style={styles.filterTextContainer}>
              <Text
                style={
                  location?.lat ? styles.filterValue : styles.filterPlaceholder
                }
                numberOfLines={1}
              >
                {location?.lat ? location.locationName : t("where")}
              </Text>
            </View>
          </View>

          {location.lat && (
            <Pressable
              onPress={() => dispatch(clearLocation())}
              style={styles.clearButton}
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

        <TouchableOpacity
          onPress={handleWhenPress}
          activeOpacity={0.8}
          style={styles.filterField}
        >
          <View style={styles.filterFieldTouchable}>
            <View style={styles.whereWhenIconContainer}>
              <CalendarIcon
                width={widthScale(16)}
                height={heightScale(16)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.filterTextContainer}>
              <Text
                style={
                  selectedDate ? styles.filterValue : styles.filterPlaceholder
                }
                numberOfLines={1}
              >
                {selectedDate
                  ? formatSelectedDateLabel(selectedDate)
                  : t("when")}
              </Text>
            </View>
          </View>
          {selectedDate && (
            <Pressable
              onPress={() => dispatch(clearSelectedDate())}
              style={styles.clearButton}
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
      </View>

      {/* Category List */}
      <ScrollView
        ref={categoryScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesScroll}
      >
        {/* All Category */}
        <TouchableOpacity
          style={styles.categoryItem}
          onPress={() => handleCategorySelect("all")}
          onLayout={(e: LayoutChangeEvent) => {
            categoryXPositionsRef.current[0] = e.nativeEvent.layout.x;
          }}
          activeOpacity={0.8}
        >
          <Text
            style={
              selectedCategory === undefined
                ? styles.categoryTextActive
                : styles.categoryText
            }
          >
            All
          </Text>
          {selectedCategory === undefined && (
            <View style={styles.categoryUnderline} />
          )}
        </TouchableOpacity>

        {/* Other Categories */}
        {categories.map((category: Category, index: number) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategorySelect(category.id)}
              onLayout={(e: LayoutChangeEvent) => {
                const layout = e.nativeEvent.layout;
                categoryXPositionsRef.current[index + 1] = layout.x;
              }}
              activeOpacity={0.8}
            >
              <Text
                style={
                  isSelected ? styles.categoryTextActive : styles.categoryText
                }
              >
                {category.name}
              </Text>
              {isSelected && <View style={styles.categoryUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          dispatch(setSelectedDate(date.toISOString()));
        }}
      />
    </View>
  );
}
