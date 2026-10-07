import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

type Props = {
  title: string;
  /** 0–100, or null for an open-ended spinner. */
  percent: number | null;
  hint?: string | null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(40, 54, 24, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      zIndex: 50,
      elevation: 50,
    },
    card: {
      width: "100%",
      maxWidth: moderateWidthScale(360),
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(28),
      alignItems: "center",
      gap: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    track: {
      alignSelf: "stretch",
      height: heightScale(10),
      borderRadius: heightScale(5),
      backgroundColor: theme.lightGreen015,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: heightScale(5),
      backgroundColor: theme.buttonBack,
    },
    hint: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size21,
    },
  });

/** Blocking progress card while the reel is exported / saved on the phone. */
export default function ExportOverlay({ title, percent, hint }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={theme.buttonBack} />
        <Text style={styles.title}>
          {percent != null ? `${title} ${Math.round(percent)}%` : title}
        </Text>
        {percent != null ? (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(2, Math.min(100, percent))}%` },
              ]}
            />
          </View>
        ) : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}
