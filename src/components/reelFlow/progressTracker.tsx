import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

export type TrackerStepState = "done" | "active" | "pending";

export type TrackerStep = {
  key: string;
  title: string;
  subtitle?: string | null;
  state: TrackerStepState;
};

const DOT = widthScale(44);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(16),
    },
    rail: {
      width: DOT,
      alignItems: "center",
    },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
    },
    dotDone: {
      borderColor: theme.darkGreen,
      backgroundColor: theme.darkGreen,
    },
    dotActive: {
      borderColor: theme.orangeBrown,
      backgroundColor: theme.upcomingCard,
    },
    line: {
      flex: 1,
      width: 2,
      minHeight: heightScale(18),
      backgroundColor: theme.lightGreen2,
      marginVertical: moderateHeightScale(4),
    },
    lineDone: {
      backgroundColor: theme.darkGreen,
    },
    body: {
      flex: 1,
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(18),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    titlePending: {
      color: theme.lightGreen,
      fontFamily: fonts.fontMedium,
    },
    subtitle: {
      marginTop: moderateHeightScale(3),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size21,
    },
  });

/** Vertical "Upload complete → Selecting highlights → Building your reel" tracker. */
export default function ProgressTracker({ steps }: { steps: TrackerStep[] }) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const done = step.state === "done";
        const active = step.state === "active";
        return (
          <View
            key={step.key}
            style={styles.row}
            accessible
            accessibilityLabel={[
              step.title,
              step.subtitle,
              done ? t("completed") : active ? t("inProgress") : null,
            ]
              .filter(Boolean)
              .join(", ")}
            accessibilityState={{ busy: active }}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? (
                  <MaterialIcons
                    name="check"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                ) : active ? (
                  <ActivityIndicator size="small" color={theme.selectCard} />
                ) : null}
              </View>
              {!last ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <View style={[styles.body, last && { paddingBottom: 0 }]}>
              <Text
                style={[
                  styles.title,
                  step.state === "pending" && styles.titlePending,
                ]}
              >
                {step.title}
              </Text>
              {step.subtitle ? (
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
