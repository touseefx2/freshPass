import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
      backgroundColor: `${theme.black}CC`,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
    },
    card: {
      width: "100%",
      maxWidth: widthScale(340),
      borderRadius: moderateWidthScale(20),
      backgroundColor: `${theme.black}EE`,
      borderWidth: 1,
      borderColor: theme.white15,
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(24),
      alignItems: "center",
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
      textAlign: "center",
      marginBottom: moderateHeightScale(20),
    },
    row: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(14),
      marginBottom: moderateHeightScale(18),
    },
    iconCol: {
      width: widthScale(56),
      height: heightScale(56),
      borderRadius: moderateWidthScale(14),
      backgroundColor: `${theme.white}14`,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    textCol: {
      flex: 1,
    },
    rowTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
      marginBottom: moderateHeightScale(4),
    },
    rowBody: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      lineHeight: moderateHeightScale(18),
    },
    gotItBtn: {
      marginTop: moderateHeightScale(8),
      minWidth: widthScale(140),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(28),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.buttonBack,
    },
    gotItText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
  });

function BounceArrow({
  name,
  color,
  axis,
}: {
  name: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
  axis: "y" | "x";
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: axis === "y" ? [-5, 5] : [-6, 6],
  });

  return (
    <Animated.View
      style={{
        transform: [
          axis === "y" ? { translateY: translate } : { translateX: translate },
        ],
      }}
    >
      <MaterialIcons name={name} size={moderateWidthScale(22)} color={color} />
    </Animated.View>
  );
}

export default function ReelsSwipeGuide({ visible, onDismiss }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fade, visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("reelsGuideTitle")}</Text>

        <View style={styles.row}>
          <View style={styles.iconCol}>
            <BounceArrow name="keyboard-arrow-up" color={theme.white} axis="y" />
            <BounceArrow
              name="keyboard-arrow-down"
              color={theme.white}
              axis="y"
            />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.rowTitle}>{t("reelsGuideSwipeVertical")}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconCol}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <BounceArrow
                name="keyboard-arrow-left"
                color={theme.white}
                axis="x"
              />
              <BounceArrow
                name="keyboard-arrow-right"
                color={theme.white}
                axis="x"
              />
            </View>
          </View>
          <View style={styles.textCol}>
            <Text style={styles.rowTitle}>
              {t("reelsGuideSwipeHorizontal")}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.gotItBtn}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.gotItText}>{t("reelsGuideGotIt")}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
