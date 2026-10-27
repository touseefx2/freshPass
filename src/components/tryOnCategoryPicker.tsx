import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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

const GRID_GAP = moderateWidthScale(10);

/** Hint under the grid: what Freshy edits for this category */
const focusKeyForSlug = (slug: string) => {
  if (["barbershop", "beauty-salon", "braids-locs"].includes(slug) || slug.includes("hair"))
    return "tryOnFocusHair";
  if (slug.includes("nail")) return "tryOnFocusNails";
  if (slug.includes("pet")) return "tryOnFocusPet";
  if (slug.includes("brow") || slug.includes("lash")) return "tryOnFocusBrows";
  if (slug.includes("makeup")) return "tryOnFocusMakeup";
  if (slug.includes("tattoo")) return "tryOnFocusTattoo";
  if (slug.includes("pierc")) return "tryOnFocusPiercings";
  return null;
};

const createStyles = (theme: Theme, tileWidth: number) =>
  StyleSheet.create({
    fieldContainer: {
      marginTop: moderateHeightScale(20),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    subtitle: {
      marginTop: moderateHeightScale(4),
      marginBottom: moderateHeightScale(14),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    label: {
      fontSize: fontSize.size16,
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
      gap: GRID_GAP,
    },
    tile: {
      width: tileWidth,
      padding: moderateWidthScale(6),
      paddingBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      alignItems: "center",
    },
    tileSelected: {
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    tileImage: {
      width: "100%",
      aspectRatio: 1.6,
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen07,
    },
    checkBadge: {
      position: "absolute",
      top: moderateWidthScale(10),
      right: moderateWidthScale(10),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
      borderWidth: 1.5,
      borderColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    tileText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      textAlign: "center",
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
    focusHint: {
      marginTop: moderateHeightScale(16),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen1,
    },
    focusHintText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
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
  const { width: screenWidth } = useWindowDimensions();
  // 3 columns inside the screen's 20px side padding
  const tileWidth = Math.floor(
    (screenWidth - moderateWidthScale(40) - GRID_GAP * 2) / 3,
  );
  const styles = useMemo(
    () => createStyles(theme, tileWidth),
    [theme, tileWidth],
  );
  const { t } = useTranslation();
  const selected = categories.find((c) => c.slug === selectedSlug) ?? null;
  const focusKey = selected ? focusKeyForSlug(selected.slug) : null;
  const focusText = selected
    ? focusKey
      ? t(focusKey)
      : t("tryOnFocusGeneric", {
          category: formatTryOnCategoryName(selected.name),
        })
    : null;

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
        <Text style={styles.title} accessibilityRole="header">
          {t("tryOnPickTitle")}
        </Text>
        <Text style={styles.subtitle}>{t("tryOnPickSubtitle")}</Text>

        {categories.length > 0 ? (
          <View style={styles.grid} accessibilityRole="radiogroup">
            {categories.map((cat) => {
              const isSelected = cat.slug === selectedSlug;
              const name = formatTryOnCategoryName(cat.name);
              return (
                <TouchableOpacity
                  key={cat.slug}
                  style={[styles.tile, isSelected && styles.tileSelected]}
                  onPress={() => onSelectCategory(cat.slug)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={name}
                >
                  <AppImage
                    uri={cat.imageUrl}
                    style={styles.tileImage}
                    contentFit="cover"
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <MaterialIcons
                        name="check"
                        size={moderateWidthScale(15)}
                        color={theme.white}
                      />
                    </View>
                  )}
                  <Text style={styles.tileText} numberOfLines={1}>
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

      {focusText && (
        <View style={styles.focusHint}>
          <MaterialCommunityIcons
            name="star-four-points"
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
          <Text style={styles.focusHintText}>{focusText}</Text>
        </View>
      )}

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
