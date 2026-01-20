import React, { useEffect, useState, useMemo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onDismiss: () => void;
  onPress?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      top: moderateHeightScale(60),
      left: moderateWidthScale(16),
      right: moderateWidthScale(16),
      zIndex: 1000,
    },
    banner: {
      borderRadius: moderateWidthScale(12),
      borderLeftWidth: moderateWidthScale(4),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.15,
      shadowRadius: moderateWidthScale(8),
      elevation: 8,
    },
    content: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: moderateWidthScale(16),
    },
    leftContent: {
      flexDirection: "row",
      flex: 1,
    },
    icon: {
      marginRight: moderateWidthScale(12),
      marginTop: moderateHeightScale(2),
    },
    textContent: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      marginBottom: moderateHeightScale(2),
    },
    message: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      lineHeight: moderateHeightScale(16),
    },
    dismissButton: {
      padding: moderateWidthScale(4),
      marginLeft: moderateWidthScale(8),
    },
  });

export default function NotificationBanner({
  visible,
  title,
  message,
  type,
  duration = 4000,
  onDismiss,
  onPress,
}: NotificationBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const [animation] = useState(new Animated.Value(0));
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      const id = setTimeout(() => {
        handleDismiss();
      }, duration);
      setTimeoutId(id);
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    onDismiss();
  };

  const renderIcon = () => {
    const color = getIconColor();
    switch (type) {
      case "success":
        return (
          <Feather name="check-circle" size={moderateWidthScale(24)} color={color} />
        );
      case "error":
        return (
          <Feather
            name="alert-circle"
            size={moderateWidthScale(24)}
            color={color}
          />
        );
      case "warning":
        return (
          <Feather
            name="alert-triangle"
            size={moderateWidthScale(24)}
            color={color}
          />
        );
      case "info":
      default:
        return (
          <Feather name="info" size={moderateWidthScale(24)} color={color} />
        );
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      case "warning":
        return "#F59E0B";
      case "info":
        return "#3B82F6";
      default:
        return "#3B82F6";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#D1FAE5";
      case "error":
        return "#FEE2E2";
      case "warning":
        return "#FEF3C7";
      case "info":
        return "#DBEAFE";
      default:
        return "#DBEAFE";
    }
  };

  if (!visible) return null;

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: getBackgroundColor(),
            borderLeftColor: getIconColor(),
          },
        ]}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <View style={styles.icon}>{renderIcon()}</View>
            <View style={styles.textContent}>
              <Text style={[styles.title, { color: (colors as Theme).text }]}>
                {title}
              </Text>
              <Text
                style={[styles.message, { color: (colors as Theme).lightGreen }]}
              >
                {message}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{
              top: moderateHeightScale(10),
              bottom: moderateHeightScale(10),
              left: moderateWidthScale(10),
              right: moderateWidthScale(10),
            }}
          >
            <Feather
              name="x"
              size={moderateWidthScale(20)}
              color={(colors as Theme).lightGreen}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

