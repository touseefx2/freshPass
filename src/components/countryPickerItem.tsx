import React from "react";
import { Text, TouchableOpacity, StyleSheet, View } from "react-native";
import type { ItemTemplateProps } from "react-native-country-codes-picker";
import CountryFlag from "@/src/components/countryFlag";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

/**
 * Country list row for react-native-country-codes-picker.
 * Uses image flags instead of emoji (emoji shows as "[?]" on iOS Simulator).
 */
export default function CountryPickerItem({
  item,
  name,
  style,
  ...rest
}: ItemTemplateProps) {
  return (
    <TouchableOpacity
      style={[styles.countryButton, style?.countryButtonStyles]}
      testID="countryCodesPickerCountryButton"
      activeOpacity={0.7}
      {...rest}
    >
      <View style={[styles.flagWrap, style?.flag as object]}>
        <CountryFlag code={item?.code} />
      </View>
      <Text style={[styles.dialCode, style?.dialCode]}>{item?.dial_code}</Text>
      <Text style={[styles.countryName, style?.countryName]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  countryButton: {
    paddingVertical: moderateHeightScale(10),
    width: "100%",
    paddingHorizontal: moderateWidthScale(16),
    alignItems: "center",
    marginVertical: moderateHeightScale(2),
    flexDirection: "row",
    borderRadius: moderateWidthScale(10),
    gap: moderateWidthScale(10),
  },
  flagWrap: {
    width: moderateWidthScale(28),
    alignItems: "center",
    justifyContent: "center",
  },
  dialCode: {
    minWidth: moderateWidthScale(56),
    fontSize: fontSize.size14,
    fontFamily: fonts.fontMedium,
  },
  countryName: {
    flex: 1,
    fontSize: fontSize.size14,
    fontFamily: fonts.fontRegular,
  },
});
