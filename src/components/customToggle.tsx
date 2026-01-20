import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

interface CustomToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: moderateWidthScale(45),
      height: moderateHeightScale(25),
      borderRadius: moderateHeightScale(15),
      overflow: "hidden",
    },
    track: {
      width: "100%",
      height: "100%",
      borderRadius: moderateHeightScale(15),
      padding: moderateWidthScale(2),
      justifyContent: "center",
    },
    thumb: {
      width: moderateWidthScale(19),
      height: moderateWidthScale(19),
      borderRadius:  moderateHeightScale(19/2),
      backgroundColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });

export default function CustomToggle({
  value,
  onValueChange,
  disabled = false,
}: CustomToggleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors as Theme);
  const theme = colors as Theme;

  // Calculate the maximum translate distance
  // Track width (50) - thumb width (24) - padding (2*2 = 4) = 22
  const maxTranslate = moderateWidthScale(50) - moderateWidthScale(24) - moderateWidthScale(4);

  const translateX = useRef(new Animated.Value(value ? 1 : 0)).current;
  const trackColor = useRef(
    new Animated.Value(value ? 1 : 0)
  ).current;

  // Update animated values when value prop changes
  useEffect(() => {
    const targetValue = value ? 1 : 0;
    
    // Create and start animation
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetValue,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }),
      Animated.timing(trackColor, {
        toValue: targetValue,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  const thumbTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxTranslate],
  });

  const backgroundColor = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.lightGreen2, theme.orangeBrown],
  });

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}


 