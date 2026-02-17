import React, { useMemo } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { SearchIcon, FilterIcon } from "@/assets/icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
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
    searchValue: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    filterIconContainer: {
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 9999999,
      padding: 4,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
  });

interface SearchBarProps {
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  location?: string;
  onLocationChange?: (location: string) => void;
}

export default function SearchBar({
  onSearchPress,
  onFilterPress,
  location: initialLocation = "",
}: SearchBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <TouchableOpacity
      style={[styles.searchContainer, styles.shadow]}
      onPress={onSearchPress}
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
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          {t("findServicesToBookIn")}
        </Text>
      </View>
      {/* <TouchableOpacity
        style={styles.filterIconContainer}
        onPress={onFilterPress}
        activeOpacity={0.8}
      >
        <FilterIcon
          width={widthScale(18)}
          height={heightScale(18)}
          color={theme.darkGreen}
        />
      </TouchableOpacity> */}
    </TouchableOpacity>
  );
}
