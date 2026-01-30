import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

export type SortByOption = "recommended" | "distance" | "reviews";

export const SORT_OPTIONS: { value: SortByOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "distance", label: "Distance (nearest first)" },
  { value: "reviews", label: "Reviews (top-rated first)" },
];

interface SortByBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortByOption;
  setSortBy: (value: SortByOption) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sortOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    sortOptionRowLast: {
      borderBottomWidth: 0,
    },
    sortOptionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    sortOptionTextSelected: {
      fontFamily: fonts.fontBold,
    },
  });

export default function SortByBottomSheet({
  visible,
  onClose,
  sortBy,
  setSortBy,
}: SortByBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("sortBy")}
    >
      {SORT_OPTIONS.map((opt, index) => {
        const isSelected = sortBy === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              setSortBy(opt.value);
              onClose();
            }}
            activeOpacity={0.7}
            style={[
              styles.sortOptionRow,
              index === SORT_OPTIONS.length - 1 && styles.sortOptionRowLast,
            ]}
          >
            <Text
              style={[
                styles.sortOptionText,
                isSelected && styles.sortOptionTextSelected,
              ]}
            >
              {opt.label}
            </Text>
            {isSelected && (
              <Feather
                name="check"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ModalizeBottomSheet>
  );
}
