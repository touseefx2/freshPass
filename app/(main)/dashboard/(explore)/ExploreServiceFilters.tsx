import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
    filterButton: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.borderLight,
    },
    filterButtonActive: {
      backgroundColor: theme.lightGreen015,
      borderColor: theme.darkGreen,
    },
    filterButtonText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    filterButtonTextActive: {
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

interface ExploreServiceFiltersProps {
  filters: string[];
  selectedFilter: string;
  onSelect: (value: string) => void;
}

export default function ExploreServiceFilters({
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
        {filters.map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => onSelect(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
