import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

type CountryFlagProps = {
  /** ISO 3166-1 alpha-2 country code, e.g. "PK" or "US" */
  code: string;
  style?: ViewStyle;
};

/**
 * Renders a country flag as an image instead of a Unicode emoji.
 * Flag emojis often show as "[?]" boxes on iOS Simulator (and can break when
 * custom fontFamily is applied), so image flags are more reliable.
 */
export default function CountryFlag({ code, style }: CountryFlagProps) {
  const uri = useMemo(() => {
    const normalized = (code || "").trim().toLowerCase();
    if (!normalized) return null;
    return `https://flagcdn.com/w80/${normalized}.png`;
  }, [code]);

  if (!uri) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        style={styles.flag}
        contentFit="cover"
        recyclingKey={uri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: moderateWidthScale(28),
    height: moderateHeightScale(20),
    borderRadius: moderateWidthScale(3),
    overflow: "hidden",
  },
  flag: {
    width: "100%",
    height: "100%",
  },
});
