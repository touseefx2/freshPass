import React, { useMemo, useRef, useEffect } from "react";
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

interface PickerDropdownProps {
  visible: boolean;
  currentHours: number;
  currentMinutes: number;
  onSelect: (hours: number, minutes: number) => void;
  onClose: () => void;
  buttonRef?: React.RefObject<View | null>;
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
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    dropdown: {
      position: "absolute",
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(8),
      maxHeight: moderateHeightScale(170),
      width: moderateWidthScale(130),
      shadowColor: theme.shadow  ,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    dropdownItem: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
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

export default function PickerDropdown({
  visible,
  currentHours,
  currentMinutes,
  onSelect,
  onClose,
  buttonRef,
}: PickerDropdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [menuPosition, setMenuPosition] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (visible && buttonRef?.current) {
      // Small delay to ensure ref is measured after render
      const timer = setTimeout(() => {
        if (buttonRef?.current) {
          buttonRef.current.measureInWindow((x, y, width, height) => {
            setMenuPosition({
              x: x,
              y: y + height + moderateHeightScale(5),
            });
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    } else if (visible && !buttonRef) {
      // Fallback: center on screen if no ref provided
      setMenuPosition({
        x: moderateWidthScale(100),
        y: moderateHeightScale(200),
      });
    } else if (!visible) {
      setMenuPosition(null);
    }
  }, [visible, buttonRef]);

  if (!visible) return null;

  const currentValue = getTimeValue(currentHours, currentMinutes);

  const handleMenuItemPress = (hours: number, minutes: number) => {
    onSelect(hours, minutes);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {menuPosition && (
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.dropdown,
              {
                left: menuPosition.x,
                top: menuPosition.y+20,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {TIME_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: theme.borderLight,
                        marginHorizontal: moderateWidthScale(16),
                      }}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => handleMenuItemPress(option.hours, option.minutes)}
                    style={styles.dropdownItem}
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
                </View>
              ))}
            </ScrollView>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

