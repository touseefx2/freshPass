import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import {
  addToRecentSearches,
  setSearchText,
} from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { SearchIcon } from "@/assets/icons";

export type PopularServiceItem = { id: number | null; name: string };

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(12),
    },
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
    footer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(24),
    },
  });

function parsePopularServices(
  params: Record<string, string | undefined>,
): PopularServiceItem[] {
  try {
    const raw = params?.popularServices;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ popularServices?: string }>();
  const popularServices = useMemo(
    () => parsePopularServices(params as Record<string, string | undefined>),
    [params.popularServices],
  );
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
      dispatch(setSearchText(query));
      router.back();
    }
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const handlePopularServicePress = (serviceName: string) => {
    setSearchQuery(serviceName);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StackHeader title="Hi, what are you looking for?" />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FloatingInput
            label="Search services or businesses"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services or businesses"
            placeholderTextColor={theme.lightGreen}
            containerStyle={styles.searchInputContainer}
            onClear={() => setSearchQuery("")}
            renderLeftAccessory={() => (
              <SearchIcon
                width={widthScale(18)}
                height={heightScale(18)}
                color={theme.darkGreen}
              />
            )}
          />

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
                    <Text style={styles.popularServiceText}>
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Search"
            onPress={handleSearch}
            disabled={!searchQuery.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
