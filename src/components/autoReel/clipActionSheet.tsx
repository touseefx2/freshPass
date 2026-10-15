import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

/**
 * What can be done with one clip (choose moment, use my file, undo) — opened
 * by tapping the clip in the strip, so the screen itself stays clean.
 */

export type ClipAction = {
  key: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  subtitle?: string | null;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Filled icon — the action this clip needs most */
  primary?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    status: {
      marginTop: moderateHeightScale(-6),
      marginBottom: moderateHeightScale(6),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    statusMissing: {
      color: theme.red,
    },
    list: {
      gap: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(8),
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      minHeight: moderateHeightScale(64),
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    optionDisabled: {
      opacity: 0.45,
    },
    iconWrap: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen1,
    },
    iconWrapPrimary: {
      backgroundColor: theme.darkGreen,
    },
    texts: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    label: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
  });

export default function ClipActionSheet({
  visible,
  onClose,
  title,
  status,
  statusMissing,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  /** "1 · Before · 6s" */
  title: string;
  /** "Not found", "AI pick · 0:12" … */
  status?: string | null;
  statusMissing?: boolean;
  actions: ClipAction[];
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ModalizeBottomSheet visible={visible} onClose={onClose} title={title}>
      {status ? (
        <Text style={[styles.status, statusMissing && styles.statusMissing]}>
          {status}
        </Text>
      ) : null}
      <View style={styles.list}>
        {actions.map((action) => {
          const inactive = action.disabled || action.loading;
          return (
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.7}
              onPress={action.onPress}
              disabled={inactive}
              accessibilityRole="button"
              accessibilityLabel={[action.label, action.subtitle]
                .filter(Boolean)
                .join(", ")}
              accessibilityState={{ disabled: !!inactive, busy: !!action.loading }}
              style={[styles.option, action.disabled && styles.optionDisabled]}
            >
              <View
                style={[styles.iconWrap, action.primary && styles.iconWrapPrimary]}
              >
                {action.loading ? (
                  <ActivityIndicator
                    color={action.primary ? theme.white : theme.darkGreen}
                  />
                ) : (
                  <MaterialIcons
                    name={action.icon}
                    size={moderateWidthScale(22)}
                    color={action.primary ? theme.white : theme.darkGreen}
                  />
                )}
              </View>
              <View style={styles.texts}>
                <Text style={styles.label}>{action.label}</Text>
                {action.subtitle ? (
                  <Text style={styles.subtitle}>{action.subtitle}</Text>
                ) : null}
              </View>
              <MaterialIcons
                name="chevron-right"
                size={moderateWidthScale(22)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ModalizeBottomSheet>
  );
}
