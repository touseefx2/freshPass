import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";

type Props = {
  /** 0–5; halves are drawn as half stars. */
  value: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Read-only row of five orange stars (screen readers get the label from the parent). */
export default function StarRow({ value, size, style }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const iconSize = size ?? moderateWidthScale(16);
  const rounded = Math.round(Math.max(0, Math.min(5, value)) * 2) / 2;

  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 1 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const name =
          rounded >= star
            ? "star"
            : rounded >= star - 0.5
              ? "star-half"
              : "star-border";
        return (
          <MaterialIcons
            key={star}
            name={name}
            size={iconSize}
            color={name === "star-border" ? theme.lightGreen2 : theme.orangeBrown}
          />
        );
      })}
    </View>
  );
}
