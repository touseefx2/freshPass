import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  EMOJI_STICKERS,
  STICKER_SIZE_RANGE,
  type EditorSticker,
} from "./editorModel";

type Props = {
  selected: EditorSticker | null;
  canAdd: boolean;
  canAddPhoto: boolean;
  addingPhoto: boolean;
  disabled: boolean;
  onAddEmoji: (emoji: string) => void;
  onAddPhoto: () => void;
  onSizeStart: () => void;
  onSizeChange: (size: number) => void;
  onRotateBy: (degrees: number) => void;
  onRemove: () => void;
};

const ROTATE_STEP = 15;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(2),
    },
    hint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginBottom: moderateHeightScale(6),
    },
    strip: {
      alignItems: "center",
      gap: moderateWidthScale(6),
      paddingRight: moderateWidthScale(4),
    },
    photoBtn: {
      height: heightScale(44),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginRight: moderateWidthScale(4),
    },
    photoText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    emojiBtn: {
      width: widthScale(44),
      height: heightScale(44),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
    },
    emoji: {
      fontSize: fontSize.size24,
      includeFontPadding: false,
    },
    disabled: {
      opacity: 0.4,
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(8),
    },
    iconBtn: {
      width: widthScale(40),
      height: heightScale(40),
      borderRadius: moderateWidthScale(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.black,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.white15,
    },
    sizeWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    sizeLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
    },
    slider: {
      flex: 1,
    },
  });

export default function StickerPanel({
  selected,
  canAdd,
  canAddPhoto,
  addingPhoto,
  disabled,
  onAddEmoji,
  onAddPhoto,
  onSizeStart,
  onSizeChange,
  onRotateBy,
  onRemove,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const range = selected ? STICKER_SIZE_RANGE[selected.kind] : null;
  const photoDisabled = disabled || addingPhoto || !canAdd || !canAddPhoto;
  const emojiDisabled = disabled || !canAdd;

  return (
    <View>
      <Text style={styles.title}>{t("stickers")}</Text>
      {!selected ? <Text style={styles.hint}>{t("stickersHint")}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[styles.photoBtn, photoDisabled && styles.disabled]}
          onPress={onAddPhoto}
          disabled={photoDisabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("addPhotoSticker")}
        >
          {addingPhoto ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <MaterialIcons
              name="add-photo-alternate"
              size={moderateWidthScale(18)}
              color={theme.buttonText}
            />
          )}
          <Text style={styles.photoText}>{t("stickerPhoto")}</Text>
        </TouchableOpacity>
        {EMOJI_STICKERS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[styles.emojiBtn, emojiDisabled && styles.disabled]}
            onPress={() => onAddEmoji(emoji)}
            disabled={emojiDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("addStickerA11y", { emoji })}
          >
            <Text style={styles.emoji} allowFontScaling={false}>
              {emoji}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && range ? (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onRotateBy(-ROTATE_STEP)}
            disabled={disabled}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("rotateLeft")}
          >
            <MaterialIcons
              name="rotate-left"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onRotateBy(ROTATE_STEP)}
            disabled={disabled}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("rotateRight")}
          >
            <MaterialIcons
              name="rotate-right"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          </TouchableOpacity>
          <View style={styles.sizeWrap}>
            <Text style={styles.sizeLabel}>{t("stickerSize")}</Text>
            <Slider
              style={styles.slider}
              minimumValue={range.min}
              maximumValue={range.max}
              value={selected.size}
              onSlidingStart={onSizeStart}
              onValueChange={onSizeChange}
              minimumTrackTintColor={theme.selectCard}
              maximumTrackTintColor={theme.white15}
              thumbTintColor={theme.selectCard}
              disabled={disabled}
              accessibilityLabel={t("stickerSize")}
            />
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRemove}
            disabled={disabled}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("removeSticker")}
          >
            <MaterialIcons
              name="delete-outline"
              size={moderateWidthScale(20)}
              color={theme.white}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
