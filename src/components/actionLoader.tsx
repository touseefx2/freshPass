import React, { useMemo } from "react";
import { ActivityIndicator, Modal, StyleSheet, View, Text } from "react-native";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    loaderContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      minWidth: moderateWidthScale(120),
    },
    titleText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginTop: moderateHeightScale(16),
      textAlign: "center",
    },
  });

export default function ActionLoader() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const actionLoader = useAppSelector((state) => state.general.actionLoader);
  const actionLoaderTitle = useAppSelector(
    (state) => state.general.actionLoaderTitle
  );

  return (
    <Modal
      transparent
      visible={actionLoader}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          {actionLoaderTitle && actionLoaderTitle.trim() !== "" && (
            <Text style={styles.titleText}>{actionLoaderTitle}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

