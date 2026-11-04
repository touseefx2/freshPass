import React, { useMemo, useRef } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { FlowCard, SectionLabel } from "@/src/components/reelFlow/flowParts";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import TapField from "./tapField";
import PhotoSlots from "./photoSlots";
import {
  cleanInt,
  cleanMoney,
  MAX_PRODUCT_PHOTOS,
  type VariantErrors,
  type VariantForm,
} from "./editorUtils";

type Props = {
  index: number;
  form: VariantForm;
  errors?: VariantErrors;
  onChange: (patch: Partial<VariantForm>) => void;
  onRemove: () => void;
  onAddPhotos: () => void;
  onRemovePhoto: (photoIndex: number) => void;
  disabled?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: { padding: moderateWidthScale(16), gap: moderateHeightScale(14) },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    badge: {
      width: moderateWidthScale(30),
      height: moderateWidthScale(30),
      borderRadius: moderateWidthScale(15),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    remove: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      minHeight: moderateWidthScale(40),
      paddingHorizontal: moderateWidthScale(12),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightRed,
    },
    removeText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
    row2: { flexDirection: "row", gap: moderateWidthScale(12) },
    half: { flex: 1, minWidth: 0 },
    photos: { gap: moderateHeightScale(8) },
  });

/** One colour / model: name, stock, optional own price and sale, up to 4 photos. */
export default function VariantCard({
  index,
  form,
  errors,
  onChange,
  onRemove,
  onAddPhotos,
  onRemovePhoto,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const stockRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const saleRef = useRef<TextInput>(null);
  const number = index + 1;

  return (
    <FlowCard style={styles.card}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {form.name.trim() || t("mpPfOptionNumber", { number })}
        </Text>
        <TouchableOpacity
          style={styles.remove}
          activeOpacity={0.75}
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("mpPfRemoveOptionA11y", {
            name: form.name.trim() || t("mpPfOptionNumber", { number }),
          })}
        >
          <MaterialIcons
            name="delete-outline"
            size={moderateWidthScale(18)}
            color={theme.red}
          />
          <Text style={styles.removeText}>{t("remove")}</Text>
        </TouchableOpacity>
      </View>

      <TapField
        label={t("mpPfOptionName")}
        required
        value={form.name}
        onChangeText={(v) => onChange({ name: v })}
        placeholder={t("mpPfOptionNamePlaceholder")}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => stockRef.current?.focus()}
        maxLength={60}
        error={errors?.name}
      />
      <TapField
        ref={stockRef}
        label={t("mpPfOptionStock")}
        required
        value={form.stockText}
        onChangeText={(v) => onChange({ stockText: cleanInt(v) })}
        keyboardType="number-pad"
        placeholder="10"
        returnKeyType="next"
        onSubmitEditing={() => priceRef.current?.focus()}
        error={errors?.stock}
      />
      <View style={styles.row2}>
        <TapField
          ref={priceRef}
          containerStyle={styles.half}
          label={t("mpPfOptionOwnPrice")}
          prefix="$"
          value={form.priceText}
          onChangeText={(v) => onChange({ priceText: cleanMoney(v) })}
          keyboardType="decimal-pad"
          placeholder={t("optional")}
          returnKeyType="next"
          onSubmitEditing={() => saleRef.current?.focus()}
          error={errors?.price}
        />
        <TapField
          ref={saleRef}
          containerStyle={styles.half}
          label={t("mpPfSalePrice")}
          prefix="$"
          value={form.saleText}
          onChangeText={(v) => onChange({ saleText: cleanMoney(v) })}
          keyboardType="decimal-pad"
          placeholder={t("optional")}
          error={errors?.sale}
        />
      </View>
      <View style={styles.photos}>
        <SectionLabel
          label={t("photos")}
          meta={`${t("optional")} · ${form.images.length}/${MAX_PRODUCT_PHOTOS}`}
        />
        <PhotoSlots
          compact
          showMain={false}
          images={form.images}
          onAdd={onAddPhotos}
          onRemove={onRemovePhoto}
          error={errors?.photos}
          disabled={disabled}
        />
      </View>
    </FlowCard>
  );
}
