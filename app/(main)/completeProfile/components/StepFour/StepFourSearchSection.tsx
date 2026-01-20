import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { PlacePrediction } from "@/src/types/location";
import FloatingInput from "@/src/components/floatingInput";

interface StepFourSearchSectionProps {
  addressSearch: string;
  onChangeSearch: (value: string) => void;
  predictions: PlacePrediction[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
  onSelectSuggestion: (prediction: PlacePrediction) => void;
  onUseCurrentLocation: () => void;
  isResolvingLocation: boolean;
  locationMessage: string | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      // gap: moderateHseightScale(12),
      marginTop: moderateHeightScale(12),
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    suggestionsContainer: {
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    suggestionItem: {
      paddingHorizontal: moderateWidthScale(18),
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.lightGreen2,
      flexDirection: "row",
      gap: moderateWidthScale(12),
      alignItems: "center",
    },
    suggestionText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    infoText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      textAlign: "center",
    },
    locationButton: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    locationButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    hintText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function StepFourSearchSection({
  addressSearch,
  onChangeSearch,
  predictions,
  isLoadingSuggestions,
  suggestionError,
  onSelectSuggestion,
  onUseCurrentLocation,
  isResolvingLocation,
  locationMessage,
}: StepFourSearchSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={styles.container}>
      <View className="flex-1">
        <FloatingInput
          label="Search"
          value={addressSearch}
          onChangeText={onChangeSearch}
          placeholder="Search your address"
          placeholderTextColor={(colors as Theme).lightGreen2}
          returnKeyType="search"
          onClear={() => onChangeSearch("")}
          renderLeftAccessory={() => (
            <Feather
              name="search"
              size={moderateWidthScale(18)}
              color={(colors as Theme).darkGreen}
            />
          )}
        />

        {addressSearch.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            {isLoadingSuggestions && (
              <View style={{ paddingVertical: moderateHeightScale(12) }}>
                <ActivityIndicator
                  size="small"
                  color={(colors as Theme).darkGreen}
                />
              </View>
            )}
            {!isLoadingSuggestions &&
              !suggestionError &&
              predictions.map((prediction, index) => {
                const isLast = index === predictions.length - 1;
                return (
                  <Pressable
                    key={prediction.place_id ?? index.toString()}
                    style={[
                      styles.suggestionItem,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => onSelectSuggestion(prediction)}
                  >
                    <Feather
                      name="map-pin"
                      size={moderateWidthScale(16)}
                      color={(colors as Theme).lightGreen}
                    />
                    <Text style={styles.suggestionText}>
                      {prediction.structured_formatting?.main_text ??
                        prediction.description}
                      {prediction.structured_formatting?.secondary_text
                        ? `, ${prediction.structured_formatting.secondary_text}`
                        : ""}
                    </Text>
                  </Pressable>
                );
              })}
            {!isLoadingSuggestions && suggestionError && (
              <View style={{ paddingVertical: moderateHeightScale(12) }}>
                <Text style={styles.errorText}>{suggestionError}</Text>
              </View>
            )}
            {!isLoadingSuggestions &&
              !suggestionError &&
              predictions.length === 0 && (
                <View style={{ paddingVertical: moderateHeightScale(12) }}>
                  <Text style={styles.infoText}>
                    No results yet. Try refining your search.
                  </Text>
                </View>
              )}
          </View>
        )}
      </View>

      <Pressable
        style={styles.locationButton}
        onPress={onUseCurrentLocation}
        disabled={isResolvingLocation}
      >
        <Feather
          name="target"
          size={moderateWidthScale(16)}
          color={(colors as Theme).darkGreen}
        />
        <Text style={styles.locationButtonText}>
          {isResolvingLocation ? "Locating..." : "Use current location"}
        </Text>
      </Pressable>

      {locationMessage && (
        <Text style={styles.errorText}>{locationMessage}</Text>
      )}
    </View>
  );
}
