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
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.darkGreenLight,
      gap: moderateWidthScale(4),
    },
    filterButton: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(999),
      borderWidth: moderateWidthScale(1),
      borderColor: theme.borderNormal
    },
    filterButtonActive: {
      backgroundColor: theme.lightGreen1,
      borderColor: theme.borderDark,
    },
    primaryFilterButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.background,
    },
    filterButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterButtonTextActive: {
      // fontFamily: fonts.fontMedium,
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
        {filters.map((filter, index) => (
          <Pressable
            key={filter}
            style={[
              index === 0
                ? styles.primaryFilterButton
                : [
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive,
                ],
            ]}
            onPress={() => onSelect(filter)}
          >
            {index === 0 ? (
              <>
                <Text style={styles.primaryFilterButtonText}>{filter}</Text>
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
                  selectedFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
