import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
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

interface SearchBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    searchInputContainer: {
      width: "100%",
      marginBottom: moderateHeightScale(24),
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

// Mock data - replace with actual data from state/API
const mockRecentSearches = [
  "Female Haircut",
  "Male Haircut",
  "Beard Shaping",
  "Skin Fade",
  "Line Up",
];

const mockPopularServices = [
  "Tattoo Session",
  "Tattoo Consultation",
  "Haircut",
  "Beard Trim",
  "Facial",
  "Massage",
];

export default function SearchBottomSheet({
  visible,
  onClose,
  onSearch,
}: SearchBottomSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
      onClose();
    }
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
    onClose();
  };

  const handlePopularServicePress = (service: string) => {
    setSearchQuery(service);
    onSearch?.(service);
    onClose();
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
      {mockRecentSearches.length > 0 && (
        <>
          <Text style={styles.recentSectionTitle}>Recent searches</Text>
          {mockRecentSearches.map((search, index) => {
            const isLast = index === mockRecentSearches.length - 1;
            return (
              <TouchableOpacity
                key={index}
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
          })}
        </>
      )}

      {/* Popular Services Section */}
      <Text style={styles.popularSectionTitle}>Popular Services</Text>
      <View style={styles.popularServicesContainer}>
        {mockPopularServices.map((service, index) => (
          <TouchableOpacity
            key={index}
            style={styles.popularServiceTag}
            onPress={() => handlePopularServicePress(service)}
            activeOpacity={0.7}
          >
            <Text style={styles.popularServiceText}>{service}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ModalizeBottomSheet>
  );
}
