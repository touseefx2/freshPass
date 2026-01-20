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

interface ReviewSuggestion {
  id: number;
  title: string;
}

interface ReviewSuggestionsDropdownProps {
  visible: boolean;
  suggestions: ReviewSuggestion[];
  onSelect: (title: string, id: number) => void;
  onClose: () => void;
  buttonRef?: React.RefObject<View | null>;
}

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
      maxHeight: moderateHeightScale(200),
      minWidth: moderateWidthScale(200),
      shadowColor: theme.shadow,
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
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
  });

export default function ReviewSuggestionsDropdown({
  visible,
  suggestions,
  onSelect,
  onClose,
  buttonRef,
}: ReviewSuggestionsDropdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [menuPosition, setMenuPosition] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (visible && buttonRef?.current) {
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
      setMenuPosition({
        x: moderateWidthScale(100),
        y: moderateHeightScale(200),
      });
    } else if (!visible) {
      setMenuPosition(null);
    }
  }, [visible, buttonRef]);

  if (!visible) return null;

  const handleMenuItemPress = (suggestion: ReviewSuggestion) => {
    onSelect(suggestion.title, suggestion.id);
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
                top: menuPosition.y + 20,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((suggestion, index) => (
                <View key={suggestion.id}>
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
                    onPress={() => handleMenuItemPress(suggestion)}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>
                      {suggestion.title}
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

