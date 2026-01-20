import React, {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { CloseIcon } from "@/assets/icons";

type AccessoryRenderer = (params: {
  isFocused: boolean;
  hasValue: boolean;
}) => ReactNode;

interface FloatingInputProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  renderLeftAccessory?: AccessoryRenderer;
  renderRightAccessory?: AccessoryRenderer;
  floatOnFocus?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
    },
    containerFocused: {
      // borderColor: theme.darkGreen,
    },
    label: {
      position: "absolute",
      left: moderateWidthScale(13),
      color: theme.lightGreen,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size11,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    leftAccessoryContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    input: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      height: heightScale(20),
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    clearButton: {},
    accessoryContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
  });

const FloatingInput = forwardRef<TextInput, FloatingInputProps>(
  (
    {
      label,
      value,
      containerStyle,
      inputStyle,
      labelStyle,
      renderLeftAccessory,
      renderRightAccessory,
      floatOnFocus = false,
      placeholderTextColor,
      showClearButton = true,
      onClear,
      onFocus,
      onBlur,
      onChangeText,
      ...rest
    },
    ref
  ) => {
    const { colors } = useTheme();
    const theme = colors as Theme;
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = Boolean(value && value.toString().length > 0);
    const labelAnimation = useRef(new Animated.Value(hasValue ? 1 : 0)).current;

    const shouldShowLabel = hasValue || (floatOnFocus && isFocused);

    useEffect(() => {
      Animated.timing(labelAnimation, {
        toValue: shouldShowLabel ? 1 : 0,
        duration: 140,
        useNativeDriver: false,
      }).start();
    }, [labelAnimation, shouldShowLabel]);

    const handleFocus = useCallback(
      (event: any) => {
        setIsFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (event: any) => {
        setIsFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    );

    const handleClear = useCallback(() => {
      if (onClear) {
        onClear();
      } else if (onChangeText) {
        onChangeText("");
      }
    }, [onClear, onChangeText]);

    const labelAnimatedStyle = {
      top: labelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [moderateHeightScale(15), moderateHeightScale(4)],
      }),
      fontSize: labelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [fontSize.size15, fontSize.size11],
      }),
      opacity: labelAnimation,
    };

    const rightAccessoryContent = useMemo(() => {
      if (!renderRightAccessory) {
        return null;
      }
      return renderRightAccessory({ isFocused, hasValue });
    }, [renderRightAccessory, isFocused, hasValue]);

    const leftAccessoryContent = useMemo(() => {
      if (!renderLeftAccessory) {
        return null;
      }
      return renderLeftAccessory({ isFocused, hasValue });
    }, [renderLeftAccessory, isFocused, hasValue]);

    const showClear = showClearButton && hasValue;

    // Calculate label left position: if there's a left accessory, position label above text input
    // Label should align exactly where the TextInput text starts
    const labelLeftPosition = useMemo(() => {
      if (leftAccessoryContent) {
        // Container padding (12px) + icon width (18px) + gap between icon and input (12px)
        // This positions label exactly above where the text input content starts
        return (
          moderateWidthScale(12) + moderateWidthScale(18) + moderateWidthScale(12)
        );
      }
      // No left accessory: container padding (12px) + small offset (1px) = 13px
      return moderateWidthScale(13);
    }, [leftAccessoryContent]);

    const containerAnimatedStyle = {
      paddingTop: labelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [moderateHeightScale(15), moderateHeightScale(18)],
      }),
      paddingBottom: labelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [moderateHeightScale(15), moderateHeightScale(12)],
      }),
    };

    const dynamicLabelStyle = {
      left: labelLeftPosition,
    };

    return (
      <Animated.View
        style={[
          styles.container,
          containerAnimatedStyle,
          (isFocused || hasValue) && styles.containerFocused,
          containerStyle,
        ]}
      >
        <Animated.Text
          style={[
            styles.label,
            dynamicLabelStyle,
            labelAnimatedStyle,
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <View style={styles.inputRow}>
          {leftAccessoryContent ? (
            <View style={styles.leftAccessoryContainer}>
              {leftAccessoryContent}
            </View>
          ) : null}
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            value={value}
            placeholderTextColor={placeholderTextColor ?? theme.lightGreen2}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            {...rest}
          />
          {showClear && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={moderateWidthScale(8)}
            >
              <CloseIcon color={theme.darkGreen} />
            </Pressable>
          )}
          {rightAccessoryContent ? (
            <View style={styles.accessoryContainer}>
              {rightAccessoryContent}
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  }
);

export default FloatingInput;
