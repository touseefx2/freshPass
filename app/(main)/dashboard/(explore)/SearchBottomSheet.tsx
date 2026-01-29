import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { addToRecentSearches } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import { SearchIcon } from "@/assets/icons";

export type PopularServiceItem = { id: number | null; name: string };

interface SearchBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
  popularServices?: PopularServiceItem[];
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    searchInputContainer: {
      width: "100%",

      marginTop: moderateHeightScale(10),
      marginBottom: moderateHeightScale(20),
    },
    recentSectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(12),
    },
    recentItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    recentItemLast: {
      borderBottomWidth: 0,
    },
    recentItemText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    recentEmpty: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      paddingVertical: moderateHeightScale(15),
    },
    popularSectionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(24),
      marginBottom: moderateHeightScale(12),
    },
    popularServicesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(24),
    },
    popularServiceTag: {
      backgroundColor: theme.borderLight,
      borderRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
    },
    popularServiceText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
  });

export default function SearchBottomSheet({
  visible,
  onClose,
  onSearch,
  popularServices = [],
}: SearchBottomSheetProps) {
  const popularList = useMemo(
    () => popularServices.filter((s) => s.id !== null),
    [popularServices],
  );
  const dispatch = useAppDispatch();
  const recentSearches = useAppSelector(
    (state) => state.general.recentSearches,
  );
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (query) {
      dispatch(addToRecentSearches(query));
      onSearch?.(query);
      onClose();
    }
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const handlePopularServicePress = (serviceName: string) => {
    setSearchQuery(serviceName);
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title="Hi, what are you looking for?"
      footerButtonTitle="Search"
      onFooterButtonPress={handleSearch}
      footerButtonDisabled={!searchQuery.trim()}
      modalHeightPercent={0.85}
    >
      {/* Search Field */}
      <FloatingInput
        label="Search services or businesses"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search services or businesses"
        placeholderTextColor={theme.lightGreen}
        containerStyle={styles.searchInputContainer}
        onClear={() => {
          setSearchQuery("");
        }}
        renderLeftAccessory={() => (
          <SearchIcon
            width={widthScale(18)}
            height={heightScale(18)}
            color={theme.darkGreen}
          />
        )}
      />

      {/* Recent Searches Section */}
      <Text style={styles.recentSectionTitle}>Recent searches</Text>
      {recentSearches.length > 0 ? (
        recentSearches.map((search, index) => {
          const isLast = index === recentSearches.length - 1;
          return (
            <TouchableOpacity
              key={`${search}-${index}`}
              style={[styles.recentItem, isLast && styles.recentItemLast]}
              onPress={() => handleRecentSearchPress(search)}
              activeOpacity={0.7}
            >
              <SearchIcon
                width={widthScale(18)}
                height={heightScale(18)}
                color={theme.lightGreen}
              />
              <Text style={styles.recentItemText}>{search}</Text>
            </TouchableOpacity>
          );
        })
      ) : (
        <Text style={styles.recentEmpty}>No recent search found</Text>
      )}

      {/* Popular Services Section */}
      {popularList.length > 0 && (
        <>
          <Text style={styles.popularSectionTitle}>Popular Services</Text>
          <View style={styles.popularServicesContainer}>
            {popularList.map((service) => (
              <TouchableOpacity
                key={service.id ?? service.name}
                style={styles.popularServiceTag}
                onPress={() => handlePopularServicePress(service.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.popularServiceText}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ModalizeBottomSheet>
  );
}
