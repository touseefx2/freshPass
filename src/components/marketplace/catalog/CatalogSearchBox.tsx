import React, { useMemo, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { heightScale, moderateWidthScale } from "@/src/theme/dimensions";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    box: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(48),
      paddingLeft: moderateWidthScale(16),
      paddingRight: moderateWidthScale(6),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
      gap: moderateWidthScale(10),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    clear: {
      width: heightScale(40),
      height: heightScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
  });

/** Marketplace-only product search (product name, brand or salon). */
export default function CatalogSearchBox({
  value,
  onChangeText,
  onClear,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableWithoutFeedback
      accessible={false}
      focusable={false}
      onPress={() => inputRef.current?.focus()}
    >
      <View style={styles.box}>
        <MaterialCommunityIcons
          name="magnify"
          size={moderateWidthScale(22)}
          color={theme.darkGreen}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={t("mpCatSearchPlaceholder")}
          placeholderTextColor={theme.lightGreen5}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          accessibilityLabel={t("mpCatSearchPlaceholder")}
        />
        {value.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onClear();
              inputRef.current?.focus();
            }}
            style={styles.clear}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={t("mpCatClearSearch")}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={moderateWidthScale(20)}
              color={theme.lightGreen5}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableWithoutFeedback>
  );
}
