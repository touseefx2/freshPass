import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fonts, fontSize } from "@/src/theme/fonts";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
      backgroundColor: theme.mapCircleFill,
      width: "100%",
    },
    resultsText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      flexWrap: "wrap",
    },
    resultsTextBold: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    sortByButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    sortByLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
  });

interface ExploreResultsHeaderProps {
  resultsCount: number;
  sortByLabel: string;
  onSortPress: () => void;
}

export default function ExploreResultsHeader({
  resultsCount,
  sortByLabel,
  onSortPress,
}: ExploreResultsHeaderProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={styles.resultsHeader}>
      <Text style={styles.resultsText}>
        Showing:
        <Text style={styles.resultsTextBold}>
          {" "}
          {resultsCount} results
        </Text>
      </Text>
      <Pressable
        onPress={onSortPress}
        style={styles.sortByButton}
        accessibilityLabel="Sort by"
      >
        <Text style={styles.sortByLabel}>Sort by: {sortByLabel} </Text>
        <Feather
          name="chevron-down"
          size={moderateWidthScale(14)}
          color={theme.darkGreen}
        />
      </Pressable>
    </View>
  );
}
