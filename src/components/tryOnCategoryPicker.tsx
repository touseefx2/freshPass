import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";

/** GET /api/categories/try-on item */
export type TryOnCategory = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  asksGender: boolean;
};

export type TryOnGender = "male" | "female";

/** "BRAIDS & LOCS" → "Braids & Locs" */
export const formatTryOnCategoryName = (name: string) =>
  name
    .toLocaleLowerCase()
    .replace(/(^|[\s&/-])(\S)/g, (_, sep, ch) => sep + ch.toLocaleUpperCase());

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fieldContainer: {
      marginTop: moderateHeightScale(24),
    },
    label: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(10),
    },
    required: {
      color: theme.red,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(48),
      paddingLeft: moderateWidthScale(4),
      paddingRight: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    chipSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    chipThumb: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen07,
    },
    chipText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextSelected: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
    stateBox: {
      minHeight: moderateHeightScale(96),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateHeightScale(8),
    },
    stateText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    retryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textDecorationLine: "underline",
      paddingVertical: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(12),
    },
    genderRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    genderOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: moderateHeightScale(52),
      paddingLeft: moderateWidthScale(5),
      paddingRight: moderateWidthScale(14),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    genderOptionSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    genderIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    genderIconSelected: {
      backgroundColor: theme.white15,
    },
    genderText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    genderTextSelected: {
      color: theme.white,
      fontFamily: fonts.fontBold,
    },
  });

type Props = {
  categories: TryOnCategory[];
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  selectedSlug: string | null;
  onSelectCategory: (slug: string) => void;
  gender: TryOnGender | null;
  onSelectGender: (gender: TryOnGender) => void;
};

export default function TryOnCategoryPicker({
  categories,
  loading,
  loadFailed,
  onRetry,
  selectedSlug,
  onSelectCategory,
  gender,
  onSelectGender,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const selected = categories.find((c) => c.slug === selectedSlug) ?? null;

  const genderOptions: {
    key: TryOnGender;
    label: string;
    icon: "face-man" | "face-woman";
  }[] = [
    { key: "male", label: t("tryOnMen"), icon: "face-man" },
    { key: "female", label: t("tryOnWomen"), icon: "face-woman" },
  ];

  return (
    <>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          {t("tryOnCategoryLabel")} <Text style={styles.required}>*</Text>
        </Text>

        {categories.length > 0 ? (
          <View style={styles.grid} accessibilityRole="radiogroup">
            {categories.map((cat) => {
              const isSelected = cat.slug === selectedSlug;
              const name = formatTryOnCategoryName(cat.name);
              return (
                <TouchableOpacity
                  key={cat.slug}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => onSelectCategory(cat.slug)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 4, bottom: 4 }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={name}
                >
                  <AppImage
                    uri={cat.imageUrl}
                    style={styles.chipThumb}
                    contentFit="cover"
                  />
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.stateBox}>
            {loading ? (
              <ActivityIndicator color={theme.darkGreen} />
            ) : loadFailed ? (
              <>
                <Text style={styles.stateText}>
                  {t("tryOnCategoriesLoadFailed")}
                </Text>
                <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
                  <Text style={styles.retryText}>{t("retry")}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}
      </View>

      {selected?.asksGender && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            {t("tryOnGenderLabel")} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.genderRow} accessibilityRole="radiogroup">
            {genderOptions.map((opt) => {
              const isSelected = gender === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.genderOption,
                    isSelected && styles.genderOptionSelected,
                  ]}
                  onPress={() => onSelectGender(opt.key)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={opt.label}
                >
                  <View
                    style={[
                      styles.genderIcon,
                      isSelected && styles.genderIconSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={moderateWidthScale(24)}
                      color={isSelected ? theme.white : theme.darkGreen}
                    />
                  </View>
                  <Text
                    style={[
                      styles.genderText,
                      isSelected && styles.genderTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
}
