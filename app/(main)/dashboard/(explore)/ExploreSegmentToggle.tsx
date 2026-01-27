import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fonts, fontSize } from "@/src/theme/fonts";

export type ExploreSegmentValue = "subscriptions" | "individual";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(999),
      padding: moderateWidthScale(3),
      marginHorizontal: moderateWidthScale(20),
      marginVertical: moderateHeightScale(12),
    },
    segmentOption: {
      flex: 1,
      paddingVertical: moderateHeightScale(10),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateWidthScale(999),
    },
    segmentOptionActive: {
      backgroundColor: theme.orangeBrown,
    },
    segmentOptionInactive: {
      backgroundColor: "transparent",
    },
    segmentOptionText: {
      fontSize: fontSize.size13,
    },
    segmentOptionTextActive: {
      color: theme.darkGreen,
      fontFamily: fonts.fontMedium,
    },
    segmentOptionTextInactive: {
      color: theme.segmentInactiveTabText,
      fontFamily: fonts.fontRegular,
    },
  });

interface ExploreSegmentToggleProps {
  value: ExploreSegmentValue;
  onSelect: (value: ExploreSegmentValue) => void;
}

export default function ExploreSegmentToggle({
  value,
  onSelect,
}: ExploreSegmentToggleProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={styles.segmentedControl}>
      <Pressable
        onPress={() => onSelect("individual")}
        style={[
          styles.segmentOption,
          value === "individual"
            ? styles.segmentOptionActive
            : styles.segmentOptionInactive,
        ]}
      >
        <Text
          style={[
            styles.segmentOptionText,
            value === "individual"
              ? styles.segmentOptionTextActive
              : styles.segmentOptionTextInactive,
          ]}
        >
          Individual services
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSelect("subscriptions")}
        style={[
          styles.segmentOption,
          value === "subscriptions"
            ? styles.segmentOptionActive
            : styles.segmentOptionInactive,
        ]}
      >
        <Text
          style={[
            styles.segmentOptionText,
            value === "subscriptions"
              ? styles.segmentOptionTextActive
              : styles.segmentOptionTextInactive,
          ]}
        >
          Subscriptions list
        </Text>
      </Pressable>
    </View>
  );
}
