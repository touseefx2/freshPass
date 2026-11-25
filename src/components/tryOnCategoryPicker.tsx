import React, { useMemo, useState } from "react";
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
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

/** GET /api/categories/try-on item */
export type TryOnCategory = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  asksGender: boolean;
};

export type TryOnGender = "male" | "female";

/** Beard & mustache presets (backend slugs, hardcoded per backend guide) */
export const BEARD_STYLES = [
  { slug: "clean-shaven", labelKey: "beardCleanShaven" },
  { slug: "mustache", labelKey: "beardMustache" },
  { slug: "soul-patch", labelKey: "beardSoulPatch" },
  { slug: "goatee", labelKey: "beardGoatee" },
  { slug: "van-dyke", labelKey: "beardVanDyke" },
  { slug: "light-stubble", labelKey: "beardLightStubble" },
  { slug: "heavy-stubble", labelKey: "beardHeavyStubble" },
  { slug: "light-beard", labelKey: "beardLightBeard" },
  { slug: "full-beard", labelKey: "beardFullBeard" },
  { slug: "beardstache", labelKey: "beardBeardstache" },
  { slug: "faded-beard", labelKey: "beardFadedBeard" },
  { slug: "short-boxed-beard", labelKey: "beardShortBoxed" },
  { slug: "long-beard", labelKey: "beardLongBeard" },
] as const;

/** Men on a hair category: what to change (at least one is on) */
export type TryOnParts = {
  hairstyle: boolean;
  beard: boolean;
  beardStyle: string | null;
};

export const DEFAULT_TRY_ON_PARTS: TryOnParts = {
  hairstyle: true,
  beard: false,
  beardStyle: null,
};

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
    partsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    partOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: moderateHeightScale(46),
      paddingLeft: moderateWidthScale(6),
      paddingRight: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    partOptionSelected: {
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.lightGreen07,
    },
    partIcon: {
      width: moderateWidthScale(34),
      height: moderateWidthScale(34),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    partIconSelected: {
      backgroundColor: theme.darkGreen,
    },
    // Square box (not a circle) so it reads as "you can check both"
    partCheck: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(4),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    partCheckSelected: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    partText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    beardField: {
      marginTop: moderateHeightScale(16),
    },
    selectBox: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    selectText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
    selectPlaceholder: {
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    sheetRowText: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
    sheetRowTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
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
  /** Hairstyle / Beard & Mustache (Men on a hair category only) */
  parts: TryOnParts;
  onChangeParts: (parts: TryOnParts) => void;
  /** Hide the beard options while a try-on is starting */
  busy?: boolean;
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
  parts,
  onChangeParts,
  busy = false,
}: Props) {
  const [beardSheetVisible, setBeardSheetVisible] = useState(false);
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

  const showParts = !!selected?.asksGender && gender === "male" && !busy;
  const selectedBeard = BEARD_STYLES.find((b) => b.slug === parts.beardStyle);
  // Unchecking one turns the other on (at least one must stay checked)
  const togglePart = (part: "hairstyle" | "beard") => {
    const next = { ...parts, [part]: !parts[part] };
    if (!next.hairstyle && !next.beard) {
      next[part === "hairstyle" ? "beard" : "hairstyle"] = true;
    }
    if (!next.beard) next.beardStyle = null;
    onChangeParts(next);
  };
  const partOptions: {
    key: "hairstyle" | "beard";
    label: string;
    icon: "content-cut" | "mustache";
  }[] = [
    { key: "hairstyle", label: t("tryOnPartHairstyle"), icon: "content-cut" },
    { key: "beard", label: t("tryOnPartBeard"), icon: "mustache" },
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

      {showParts && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            {t("tryOnPartsLabel")} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.partsRow}>
            {partOptions.map((opt) => {
              const isChecked = parts[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.partOption,
                    isChecked && styles.partOptionSelected,
                  ]}
                  onPress={() => togglePart(opt.key)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={opt.label}
                >
                  <View
                    style={[
                      styles.partIcon,
                      isChecked && styles.partIconSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={moderateWidthScale(20)}
                      color={isChecked ? theme.white : theme.darkGreen}
                    />
                  </View>
                  <Text style={styles.partText} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.partCheck,
                      isChecked && styles.partCheckSelected,
                    ]}
                  >
                    {isChecked && (
                      <MaterialIcons
                        name="check"
                        size={moderateWidthScale(14)}
                        color={theme.white}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {parts.beard && (
            <View style={styles.beardField}>
              <Text style={styles.label}>
                {t("tryOnBeardStyleLabel")}{" "}
                <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setBeardSheetVisible(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t("tryOnBeardStyleLabel")}
              >
                <Text
                  style={[
                    styles.selectText,
                    !selectedBeard && styles.selectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedBeard
                    ? t(selectedBeard.labelKey)
                    : t("tryOnBeardStylePlaceholder")}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={moderateWidthScale(24)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <ModalizeBottomSheet
        visible={beardSheetVisible}
        onClose={() => setBeardSheetVisible(false)}
        title={t("tryOnBeardStyleLabel")}
      >
        {BEARD_STYLES.map((b) => {
          const isSelected = b.slug === parts.beardStyle;
          return (
            <TouchableOpacity
              key={b.slug}
              style={styles.sheetRow}
              onPress={() => {
                onChangeParts({ ...parts, beard: true, beardStyle: b.slug });
                setBeardSheetVisible(false);
              }}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text
                style={[
                  styles.sheetRowText,
                  isSelected && styles.sheetRowTextSelected,
                ]}
              >
                {t(b.labelKey)}
              </Text>
              {isSelected && (
                <MaterialIcons
                  name="check"
                  size={moderateWidthScale(22)}
                  color={theme.darkGreen}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ModalizeBottomSheet>
    </>
  );
}
