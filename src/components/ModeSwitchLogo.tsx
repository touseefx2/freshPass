import React, { useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { setModeSwitchModalVisible } from "@/src/state/slices/generalSlice";
import { canUseModeSwitch } from "@/src/state/slices/userSlice";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";

const CHEVRON_SIZE = 20;
const CHEVRON_GAP = 8;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(CHEVRON_GAP),
    },
    chevron: {
      width: moderateWidthScale(CHEVRON_SIZE),
      height: moderateWidthScale(CHEVRON_SIZE),
      borderRadius: moderateWidthScale(CHEVRON_SIZE / 2),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    // Mirrors the chevron so a centered logo stays centered
    spacer: {
      width: moderateWidthScale(CHEVRON_SIZE),
    },
  });

interface ModeSwitchLogoProps {
  /** The header's own logo element */
  children: React.ReactNode;
  /** Logo is centered in its header (client header) */
  centered?: boolean;
}

/**
 * Header logo. For Business/Staff accounts (`canUseModeSwitch`) it opens the
 * business ↔ customer mode switch; for everyone else it's just the logo.
 */
export default function ModeSwitchLogo({
  children,
  centered = false,
}: ModeSwitchLogoProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const canSwitch = useAppSelector((state) => canUseModeSwitch(state.user));
  const isCustomerMode = useAppSelector(
    (state) => state.user.active_mode === "customer",
  );

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setModeSwitchModalVisible(true));
  }, [dispatch]);

  if (!canSwitch) {
    return <>{children}</>;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      // Logo is 36pt tall — slop brings the target past 44pt
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={
        isCustomerMode
          ? t("modeSwitchLogoA11yCustomer")
          : t("modeSwitchLogoA11yBusiness")
      }
      accessibilityHint={t("modeSwitchLogoA11yHint")}
    >
      <View style={styles.row}>
        {centered && <View style={styles.spacer} />}
        {children}
        <View style={styles.chevron}>
          <Feather
            name="chevron-down"
            size={moderateWidthScale(14)}
            color={theme.white85}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
