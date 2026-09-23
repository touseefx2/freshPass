import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LeafLogo } from "@/assets/icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const SEEK_BAR_CLEARANCE = heightScale(22);

type ReelsFeedSkeletonProps = {
  onBack: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.black,
    },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(12),
      zIndex: 5,
    },
    iconBtn: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.black}66`,
    },
    brandLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginLeft: moderateWidthScale(8),
      marginRight: moderateWidthScale(8),
    },
    brandTextCol: {
      flexShrink: 1,
      justifyContent: "center",
    },
    brandTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontExtraBold,
      color: theme.white,
      letterSpacing: 0.4,
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    brandTagline: {
      marginTop: moderateHeightScale(1),
      fontSize: fontSize.size9,
      fontFamily: fonts.fontMedium,
      color: theme.white70,
      textShadowColor: `${theme.black}AA`,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    sideActions: {
      position: "absolute",
      right: moderateWidthScale(10),
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      gap: moderateHeightScale(14),
      transform: [{ translateY: moderateHeightScale(40) }],
      zIndex: 5,
    },
    sideBtn: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(3),
    },
    bone: {
      backgroundColor: theme.white50,
    },
    sideIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
    },
    sideCount: {
      width: moderateWidthScale(28),
      height: moderateHeightScale(10),
      borderRadius: moderateWidthScale(4),
    },
    menuDots: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(3),
    },
    menuDot: {
      width: moderateWidthScale(4),
      height: moderateWidthScale(4),
      borderRadius: moderateWidthScale(2),
    },
    bottomMeta: {
      position: "absolute",
      left: moderateWidthScale(12),
      right: moderateWidthScale(64),
      zIndex: 5,
    },
    businessRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(8),
    },
    avatar: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
    },
    businessName: {
      width: widthScale(120),
      height: moderateHeightScale(16),
      borderRadius: moderateWidthScale(4),
    },
    followBtn: {
      width: moderateWidthScale(64),
      height: moderateHeightScale(26),
      borderRadius: moderateWidthScale(8),
    },
    captionLine: {
      height: moderateHeightScale(12),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(6),
    },
    captionLineLong: {
      width: "92%",
    },
    captionLineMid: {
      width: "78%",
    },
    captionLineShort: {
      width: "55%",
      marginBottom: moderateHeightScale(12),
    },
    ctaRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(10),
    },
    ctaPrimary: {
      flex: 1.7,
      height: moderateHeightScale(46),
      borderRadius: moderateWidthScale(14),
    },
    ctaSecondary: {
      flex: 1,
      height: moderateHeightScale(46),
      borderRadius: moderateWidthScale(14),
    },
    pillsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    pill: {
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(16),
    },
    pillWide: {
      width: widthScale(130),
    },
    pillMid: {
      width: widthScale(100),
    },
  });

export default function ReelsFeedSkeleton({ onBack }: ReelsFeedSkeletonProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.topBar,
          { top: insets.top + moderateHeightScale(8) },
        ]}
      >
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t("back")}
        >
          <MaterialIcons
            name="arrow-back"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        </TouchableOpacity>

        <View style={styles.brandLeft}>
          <LeafLogo
            width={moderateWidthScale(22)}
            height={moderateWidthScale(22)}
            color1={theme.orangeBrown}
            color2={theme.white}
          />
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>FRESHPASS</Text>
            <Text style={styles.brandTagline} numberOfLines={1}>
              {t("alwaysReadyAlwaysYou")}
            </Text>
          </View>
        </View>

        <View style={styles.iconBtn}>
          <Animated.View style={[styles.menuDots, { opacity: pulse }]}>
            <View style={[styles.bone, styles.menuDot]} />
            <View style={[styles.bone, styles.menuDot]} />
            <View style={[styles.bone, styles.menuDot]} />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.sideActions, { opacity: pulse }]}>
        <View style={styles.sideBtn}>
          <View style={[styles.bone, styles.sideIcon]} />
          <View style={[styles.bone, styles.sideCount]} />
        </View>
        <View style={styles.sideBtn}>
          <View style={[styles.bone, styles.sideIcon]} />
          <View style={[styles.bone, styles.sideCount]} />
        </View>
        <View style={styles.sideBtn}>
          <View style={[styles.bone, styles.sideIcon]} />
          <View style={[styles.bone, styles.sideCount]} />
        </View>
        <View style={styles.sideBtn}>
          <View style={[styles.bone, styles.sideIcon]} />
          <View style={[styles.bone, styles.sideCount]} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.bottomMeta,
          {
            bottom: insets.bottom + SEEK_BAR_CLEARANCE + moderateHeightScale(8),
            opacity: pulse,
          },
        ]}
      >
        <View style={styles.businessRow}>
          <View style={[styles.bone, styles.avatar]} />
          <View style={[styles.bone, styles.businessName]} />
          <View style={[styles.bone, styles.followBtn]} />
        </View>
        <View style={[styles.bone, styles.captionLine, styles.captionLineLong]} />
        <View style={[styles.bone, styles.captionLine, styles.captionLineMid]} />
        <View
          style={[styles.bone, styles.captionLine, styles.captionLineShort]}
        />
        <View style={styles.ctaRow}>
          <View style={[styles.bone, styles.ctaPrimary]} />
          <View style={[styles.bone, styles.ctaSecondary]} />
        </View>
        <View style={styles.pillsRow}>
          <View style={[styles.bone, styles.pill, styles.pillWide]} />
          <View style={[styles.bone, styles.pill, styles.pillMid]} />
        </View>
      </Animated.View>
    </View>
  );
}
