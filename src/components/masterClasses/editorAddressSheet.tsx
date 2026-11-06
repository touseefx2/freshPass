// Custom class address: Google Places search (same API as the business
// Location screen) → formatted address + coordinates.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  fetchPlaceDetails,
  fetchSuggestions,
  getSuggestionErrorMessage,
  logPlacesApiFailure,
  resolvePlaceDetailsError,
  resolveSuggestionError,
} from "@/src/services/googlePlacesApi";
import type { PlacePrediction } from "@/src/types/location";

export type PickedAddress = {
  address: string;
  latitude: number;
  longitude: number;
};

const newSessionToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export function EditorAddressSheet({
  visible,
  initialQuery,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialQuery?: string;
  onSelect: (picked: PickedAddress) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();

  const inputRef = useRef<TextInput>(null);
  const sessionRef = useRef(newSessionToken());
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    sessionRef.current = newSessionToken();
    setQuery(initialQuery ?? "");
    setPredictions([]);
    setError(null);
    setResolvingId(null);
    // Reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const search = useCallback(async (text: string) => {
    const request = ++requestRef.current;
    if (!text.trim()) {
      setPredictions([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSuggestions(text, sessionRef.current);
      if (request !== requestRef.current) return;
      if (res.status === "OK" || res.status === "ZERO_RESULTS") {
        setPredictions(res.predictions);
      } else {
        logPlacesApiFailure("Autocomplete", res.status, res.errorMessage);
        setPredictions([]);
        setError(getSuggestionErrorMessage(res.status, res.errorMessage));
      }
    } catch (err) {
      if (request !== requestRef.current) return;
      setPredictions([]);
      setError(resolveSuggestionError(err));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => void search(query), 300);
    return () => clearTimeout(handle);
  }, [query, search, visible]);

  const pick = async (prediction: PlacePrediction) => {
    if (resolvingId) return;
    setResolvingId(prediction.place_id);
    setError(null);
    try {
      const details = await fetchPlaceDetails(
        prediction.place_id,
        sessionRef.current,
      );
      if (details.latitude == null || details.longitude == null) {
        setError(t("mcAddressNoCoordinates"));
        return;
      }
      onSelect({
        address: details.formattedAddress || prediction.description,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } catch (err) {
      setError(resolvePlaceDetailsError(err));
    } finally {
      setResolvingId(null);
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + moderateHeightScale(8) },
        ]}
      >
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {t("mcFieldAddress")}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.close}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
          >
            <Ionicons name="close" size={iconScale(22)} color={theme.darkGreen} />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback
          accessible={false}
          focusable={false}
          onPress={() => inputRef.current?.focus()}
        >
          <View style={styles.searchBox}>
            <Ionicons name="search" size={iconScale(18)} color={theme.darkGreen} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t("mcFieldAddressPlaceholder")}
              placeholderTextColor={theme.lightGreen5}
              selectionColor={theme.darkGreen}
              cursorColor={theme.darkGreen}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t("mcFieldAddressPlaceholder")}
            />
            {loading ? (
              <ActivityIndicator size="small" color={theme.darkGreen} />
            ) : hasQuery ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={10}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("mcClearSearch")}
              >
                <Ionicons
                  name="close-circle"
                  size={iconScale(18)}
                  color={theme.lightGreen5}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableWithoutFeedback>

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={iconScale(16)} color={theme.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + moderateHeightScale(16) },
          ]}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.empty}>
                <Ionicons
                  name={hasQuery ? "location-outline" : "map-outline"}
                  size={iconScale(30)}
                  color={theme.lightGreen4}
                />
                <Text style={styles.emptyText}>
                  {hasQuery ? t("mcAddressNoResults") : t("mcAddressSearchHint")}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const main = item.structured_formatting?.main_text || item.description;
            const sub = item.structured_formatting?.secondary_text;
            const resolving = resolvingId === item.place_id;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => void pick(item)}
                disabled={!!resolvingId}
                style={[styles.row, index > 0 && styles.rowBorder]}
                accessibilityRole="button"
                accessibilityLabel={item.description}
              >
                <View style={styles.rowIcon}>
                  <Ionicons
                    name="location-outline"
                    size={iconScale(18)}
                    color={theme.darkGreen}
                  />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowMain} numberOfLines={1}>
                    {main}
                  </Text>
                  {sub ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {sub}
                    </Text>
                  ) : null}
                </View>
                {resolving ? (
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={iconScale(16)}
                    color={theme.lightGreen5}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(20),
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    close: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(50),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
    },
    searchInput: {
      flex: 1,
      minHeight: heightScale(48),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightRed,
    },
    errorText: {
      flex: 1,
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.35,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    list: {
      paddingTop: moderateHeightScale(12),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(60),
      paddingVertical: moderateHeightScale(10),
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    rowIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: moderateHeightScale(2),
    },
    rowMain: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    rowSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    empty: {
      alignItems: "center",
      gap: moderateHeightScale(10),
      paddingVertical: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
