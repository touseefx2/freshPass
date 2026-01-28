import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
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
} from "@/assets/icons";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  setSelectedCategory,
  Category,
} from "@/src/state/slices/categoriesSlice";
import DatePickerModal from "@/src/components/datePickerModal";
import dayjs from "dayjs";
import { setSelectedDate } from "@/src/state/slices/generalSlice";

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
    whereWhenIconContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    filterPlaceholder: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
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

export default function ExploreHeader() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const categories = useAppSelector(
    (state: any) => state.categories.categories,
  );
  const selectedCategory = useAppSelector(
    (state: any) => state.categories.selectedCategory,
  );
  const selectedDateISO = useAppSelector((state) => state.general.selectedDate);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const selectedDate = selectedDateISO ? dayjs(selectedDateISO) : null;

  console.log("selectedDate", selectedDate);

  const handleSearchPress = () => {
    // TODO: Navigate to search screen or open search modal
    console.log("Search pressed");
  };

  const handleFilterPress = () => {
    // TODO: Open filter modal
    console.log("Filter pressed");
  };

  const handleWherePress = () => {
    // TODO: Navigate to location selection screen
    console.log("Where pressed");
  };

  const handleWhenPress = () => {
    setDateModalVisible(true);
  };

  const handleCategorySelect = (categoryId: number | "all") => {
    dispatch(
      setSelectedCategory(categoryId === "all" ? undefined : categoryId),
    );
  };

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
          <Text style={styles.searchPlaceholder}>
            Find services & subscription
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterIconContainer}
          onPress={handleFilterPress}
          activeOpacity={0.8}
        >
          <FilterIcon
            width={widthScale(18)}
            height={heightScale(18)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Where? and When? Fields */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={styles.filterField}
          onPress={handleWherePress}
          activeOpacity={0.8}
        >
          <View style={styles.whereWhenIconContainer}>
            <LocationPinIcon
              width={widthScale(16)}
              height={heightScale(16)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.filterPlaceholder}>Where?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterField}
          onPress={handleWhenPress}
          activeOpacity={0.8}
        >
          <View style={styles.whereWhenIconContainer}>
            <CalendarIcon
              width={widthScale(16)}
              height={heightScale(16)}
              color={theme.darkGreen}
            />
          </View>
          <Text style={styles.filterPlaceholder}>When?</Text>
        </TouchableOpacity>
      </View>

      {/* Category List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesScroll}
      >
        {/* All Category */}
        <TouchableOpacity
          style={styles.categoryItem}
          onPress={() => handleCategorySelect("all")}
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
        {categories.map((category: Category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategorySelect(category.id)}
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
