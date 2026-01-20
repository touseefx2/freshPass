import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TimePickerModalProps {
  visible: boolean;
  currentHours: number;
  currentMinutes: number;
  onSelect: (hours: number, minutes: number) => void;
  onClose: () => void;
}

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return {
    value: i,
    label: `${displayHours}:${displayMinutes} ${period}`,
    hours,
    minutes,
  };
});

const getTimeValue = (hours: number, minutes: number): number => {
  return hours * 2 + (minutes === 30 ? 1 : 0);
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    dropdownModal: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      padding: moderateWidthScale(16),
      maxHeight: moderateHeightScale(300),
    },
    dropdownItem: {
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    dropdownItemText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    dropdownItemTextSelected: {
      fontFamily: fonts.fontBold,
      color: theme.orangeBrown,
    },
  });

export default function TimePickerModal({
  visible,
  currentHours,
  currentMinutes,
  onSelect,
  onClose,
}: TimePickerModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const currentValue = getTimeValue(currentHours, currentMinutes);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[styles.dropdownModal, { paddingBottom: insets.bottom + 15 }]}
        >
          <ScrollView>
            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option.hours, option.minutes);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    currentValue === option.value &&
                      styles.dropdownItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
