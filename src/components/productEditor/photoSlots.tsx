import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import type { ProductDraftImage } from "@/src/components/productFormScreen";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { MAX_PRODUCT_PHOTOS } from "./editorUtils";

type Props = {
  images: ProductDraftImage[];
  max?: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Smaller tiles for an option card. */
  compact?: boolean;
  /** Shows the "Main" label on the first photo. */
  showMain?: boolean;
  error?: string | null;
  disabled?: boolean;
};

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(8) },
    grid: { flexDirection: "row", gap: moderateWidthScale(compact ? 8 : 10) },
    slot: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: moderateWidthScale(compact ? 12 : 16),
      overflow: "hidden",
    },
    filled: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    image: { ...StyleSheet.absoluteFillObject },
    add: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
    },
    addError: { borderColor: theme.red },
    placeholder: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.borderNormal,
      backgroundColor: theme.lightGreen05,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    mainBadge: {
      position: "absolute",
      left: moderateWidthScale(6),
      bottom: moderateWidthScale(6),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.darkGreen,
    },
    mainText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    remove: {
      position: "absolute",
      top: moderateWidthScale(5),
      right: moderateWidthScale(5),
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      backgroundColor: "rgba(24, 33, 14, 0.72)",
      alignItems: "center",
      justifyContent: "center",
    },
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

/** Up to 4 photo tiles in one row: filled photos, one "Add" tile, faint empty slots. */
export default function PhotoSlots({
  images,
  max = MAX_PRODUCT_PHOTOS,
  onAdd,
  onRemove,
  compact = false,
  showMain = true,
  error,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const slots = Array.from({ length: max }, (_, i) => i);
  const canAdd = images.length < max && !disabled;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {slots.map((i) => {
          const image = images[i];
          if (image) {
            return (
              <View key={`${image.id ?? "n"}-${image.uri}`} style={[styles.slot, styles.filled]}>
                <AppImage uri={image.uri} style={styles.image} resizeMode="cover" />
                {showMain && i === 0 ? (
                  <View style={styles.mainBadge}>
                    <MaterialIcons
                      name="star"
                      size={moderateWidthScale(12)}
                      color={theme.orangeBrown}
                    />
                    <Text style={styles.mainText}>{t("mainPhoto")}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.remove}
                  activeOpacity={0.75}
                  onPress={() => onRemove(i)}
                  disabled={disabled}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("mpPfRemovePhotoA11y", { number: i + 1 })}
                >
                  <MaterialIcons
                    name="close"
                    size={moderateWidthScale(16)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              </View>
            );
          }
          // First empty slot is the visible "Add" tile; the rest stay faint but still add.
          const isAddTile = i === images.length;
          return (
            <TouchableOpacity
              key={`empty-${i}`}
              style={[
                styles.slot,
                isAddTile ? styles.add : styles.placeholder,
                isAddTile && !!error && styles.addError,
              ]}
              activeOpacity={0.8}
              onPress={onAdd}
              disabled={!canAdd}
              accessibilityRole="button"
              accessibilityLabel={t("mpPfAddPhotos")}
              accessibilityState={{ disabled: !canAdd }}
            >
              {isAddTile ? (
                <>
                  <MaterialIcons
                    name="add-a-photo"
                    size={moderateWidthScale(compact ? 20 : 24)}
                    color={theme.darkGreen}
                  />
                  {!compact ? (
                    <Text style={styles.addText}>{t("rvAddPhoto")}</Text>
                  ) : null}
                </>
              ) : (
                <MaterialIcons
                  name="add"
                  size={moderateWidthScale(18)}
                  color={theme.lightGreen4}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
