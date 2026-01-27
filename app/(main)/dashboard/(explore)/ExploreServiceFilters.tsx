import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fonts, fontSize } from "@/src/theme/fonts";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    filterWrapper: {
      paddingTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(16),
    },
    filterScrollContent: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(20),
    },
    primaryFilterButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.darkGreenLight,
      gap: moderateWidthScale(4),
    },
    filterButton: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.borderNormal
    },
    filterButtonActive: {
      backgroundColor: theme.lightGreen1,
      borderColor: theme.borderDark,
    },
    primaryFilterButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.background,
    },
    filterButtonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterButtonTextActive: {
      // fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export type ExploreFilterType = "service" | "subscription";

export type FilterOption = { id: number | null; name: string };

interface ExploreServiceFiltersProps {
  type: ExploreFilterType;
  filters: FilterOption[];
  selectedFilter: { id: number; name: string } | null;
  onSelect: (value: { id: number; name: string } | null) => void;
}

export default function ExploreServiceFilters({
  type,
  filters,
  selectedFilter,
  onSelect,
}: ExploreServiceFiltersProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (filters.length === 0) return null;

  return (
    <View style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filters.map((filter, index) => (
          <Pressable
            key={filter.id !== null ? `filter-${filter.id}` : "filter-services"}
            style={[
              index === 0
                ? styles.primaryFilterButton
                : [
                  styles.filterButton,
                  selectedFilter?.id != null &&
                  selectedFilter.id === filter.id &&
                  styles.filterButtonActive,
                ],
            ]}
            onPress={() =>
              onSelect(index === 0 ? null : { id: filter.id!, name: filter.name })
            }
          >
            {index === 0 ? (
              <>
                <Text style={styles.primaryFilterButtonText}>{filter.name}</Text>
                <Feather
                  name="chevron-right"
                  size={moderateWidthScale(12)}
                  color={theme.background}
                />
              </>
            ) : (
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter?.id != null &&
                  selectedFilter.id === filter.id &&
                  styles.filterButtonTextActive,
                ]}
              >
                {filter.name}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
