import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(16),
    },
    summary: {
      height: moderateHeightScale(16),
      width: "70%",
      borderRadius: moderateWidthScale(4),
    },
    card: {
      borderRadius: moderateWidthScale(20),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(16),
      backgroundColor: theme.white,
    },
    sellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    avatar: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: widthScale(21),
    },
    lines: { flex: 1, gap: moderateHeightScale(6) },
    lineL: {
      height: moderateHeightScale(14),
      width: "60%",
      borderRadius: moderateWidthScale(4),
    },
    lineS: {
      height: moderateHeightScale(12),
      width: "40%",
      borderRadius: moderateWidthScale(4),
    },
    itemRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    thumb: {
      width: widthScale(76),
      height: widthScale(76),
      borderRadius: moderateWidthScale(14),
    },
    button: {
      height: heightScale(50),
      borderRadius: moderateWidthScale(16),
    },
  });

/** Cart loading placeholder: two seller cards. */
export default function CartSkeleton() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
        <View style={{ gap: moderateHeightScale(16) }}>
          <View style={styles.summary} />
          {[0, 1].map((key) => (
            <View key={key} style={styles.card}>
              <View style={styles.sellerRow}>
                <View style={styles.avatar} />
                <View style={styles.lines}>
                  <View style={styles.lineL} />
                  <View style={styles.lineS} />
                </View>
              </View>
              <View style={styles.itemRow}>
                <View style={styles.thumb} />
                <View style={styles.lines}>
                  <View style={styles.lineL} />
                  <View style={styles.lineS} />
                  <View style={styles.lineS} />
                </View>
              </View>
              <View style={styles.button} />
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    </View>
  );
}
