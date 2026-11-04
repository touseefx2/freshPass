import React, { useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SectionLabel } from "@/src/components/reelFlow/flowParts";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { MAX_BENEFITS, MAX_BENEFIT_LENGTH } from "./editorUtils";

type Props = {
  benefits: string[];
  onChange: (next: string[]) => void;
  error?: string | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: moderateHeightScale(10) },
    hint: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    row: { flexDirection: "row", alignItems: "center", gap: moderateWidthScale(8) },
    box: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: heightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    input: {
      flex: 1,
      minWidth: 0,
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    counter: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      fontVariant: ["tabular-nums"],
    },
    remove: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightRed,
    },
    add: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(48),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.buttonBack,
      backgroundColor: theme.lightGreen05,
    },
    addDisabled: { opacity: 0.45 },
    addText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    error: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

/** Optional list of short selling points, shown to buyers as green ticks. */
export default function BenefitsEditor({ benefits, onChange, error }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const refs = useRef<(TextInput | null)[]>([]);
  const full = benefits.length >= MAX_BENEFITS;

  const setAt = (index: number, value: string) =>
    onChange(benefits.map((b, i) => (i === index ? value : b)));

  const removeAt = (index: number) =>
    onChange(benefits.filter((_, i) => i !== index));

  const addRow = () => {
    if (full) return;
    const index = benefits.length;
    onChange([...benefits, ""]);
    setTimeout(() => refs.current[index]?.focus(), 60);
  };

  return (
    <View style={styles.wrap}>
      <SectionLabel
        label={t("mpPfBenefits")}
        meta={`${t("optional")} · ${benefits.length}/${MAX_BENEFITS}`}
      />
      <Text style={styles.hint}>{t("mpPfBenefitsHint")}</Text>
      {benefits.map((benefit, index) => (
        <View key={index} style={styles.row}>
          <TouchableWithoutFeedback
            accessible={false}
            focusable={false}
            onPress={() => refs.current[index]?.focus()}
          >
            <View style={styles.box}>
              <MaterialIcons
                name="check-circle"
                size={moderateWidthScale(20)}
                color={theme.successGreen}
              />
              <TextInput
                ref={(r) => {
                  refs.current[index] = r;
                }}
                style={styles.input}
                value={benefit}
                onChangeText={(v) => setAt(index, v)}
                placeholder={t("mpPfBenefitPlaceholder")}
                placeholderTextColor={theme.lightGreen5}
                maxLength={MAX_BENEFIT_LENGTH}
                returnKeyType={index === benefits.length - 1 && !full ? "next" : "done"}
                submitBehavior={index === benefits.length - 1 && !full ? "submit" : "blurAndSubmit"}
                onSubmitEditing={() => {
                  if (index === benefits.length - 1 && !full && benefit.trim()) addRow();
                  else refs.current[index + 1]?.focus();
                }}
                accessibilityLabel={t("mpPfBenefitA11y", { number: index + 1 })}
              />
              {benefit.length > MAX_BENEFIT_LENGTH - 20 ? (
                <Text style={styles.counter}>
                  {benefit.length}/{MAX_BENEFIT_LENGTH}
                </Text>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
          <TouchableOpacity
            style={styles.remove}
            activeOpacity={0.75}
            onPress={() => removeAt(index)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("mpPfRemoveBenefitA11y", { number: index + 1 })}
          >
            <MaterialIcons
              name="delete-outline"
              size={moderateWidthScale(20)}
              color={theme.red}
            />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.add, full && styles.addDisabled]}
        activeOpacity={0.8}
        onPress={addRow}
        disabled={full}
        accessibilityRole="button"
        accessibilityState={{ disabled: full }}
      >
        <MaterialIcons
          name="add"
          size={moderateWidthScale(20)}
          color={theme.darkGreen}
        />
        <Text style={styles.addText}>
          {full ? t("mpPfBenefitsMax", { count: MAX_BENEFITS }) : t("mpPfAddBenefit")}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
