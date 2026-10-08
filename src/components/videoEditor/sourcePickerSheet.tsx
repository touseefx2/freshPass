import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

export type SourceOption<K extends string> = {
  key: K;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  sub: string;
};

type Props<K extends string> = {
  visible: boolean;
  title: string;
  /** Short line under the title (e.g. time left in the reel). */
  subtitle?: string | null;
  options: SourceOption<K>[];
  onClose: () => void;
  onPick: (key: K) => void;
  /** "light" = white sheet with cream option cards (step-by-step Reel Studio). */
  tone?: "dark" | "light";
};

const createStyles = (theme: Theme, light: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: light ? "rgba(20, 28, 12, 0.5)" : "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: light ? theme.white : theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(light ? 28 : 22),
      borderTopRightRadius: moderateWidthScale(light ? 28 : 22),
      paddingHorizontal: moderateWidthScale(light ? 20 : 16),
    },
    handle: {
      alignSelf: "center",
      width: widthScale(light ? 44 : 40),
      height: light ? 5 : 4,
      borderRadius: 3,
      backgroundColor: light ? theme.borderMedium : theme.white15,
      marginTop: moderateHeightScale(8),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: moderateHeightScale(light ? 14 : 12),
      paddingBottom: moderateHeightScale(4),
    },
    headerSpaced: {
      paddingBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: light ? fontSize.size22 : fontSize.size18,
      fontFamily: fonts.fontBold,
      color: light ? theme.darkGreen : theme.white,
    },
    closeBtn: {
      width: widthScale(light ? 40 : 32),
      height: widthScale(light ? 40 : 32),
      borderRadius: widthScale(light ? 20 : 16),
      backgroundColor: light ? theme.lightGreen07 : theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    subtitle: {
      fontSize: light ? fontSize.size15 : fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: light ? theme.lightGreen : theme.white70,
      marginBottom: moderateHeightScale(light ? 16 : 12),
    },
    list: light
      ? { gap: moderateHeightScale(10) }
      : {
          borderRadius: moderateWidthScale(14),
          backgroundColor: theme.white15,
          overflow: "hidden",
        },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(light ? 14 : 12),
      minHeight: heightScale(light ? 74 : 60),
      paddingHorizontal: moderateWidthScale(14),
      ...(light
        ? {
            borderRadius: moderateWidthScale(18),
            borderWidth: 1,
            borderColor: theme.borderLight,
            backgroundColor: theme.background,
          }
        : null),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.white15,
      marginLeft: moderateWidthScale(14) + widthScale(40) + moderateWidthScale(12),
    },
    iconTile: {
      width: widthScale(light ? 48 : 40),
      height: widthScale(light ? 48 : 40),
      borderRadius: moderateWidthScale(light ? 14 : 10),
      backgroundColor: light ? theme.selectCard : theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: {
      fontSize: light ? fontSize.size17 : fontSize.size14,
      fontFamily: fonts.fontBold,
      color: light ? theme.darkGreen : theme.white,
    },
    rowSub: {
      fontSize: light ? fontSize.size14 : fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: light ? theme.lightGreen : theme.white70,
      marginTop: moderateHeightScale(2),
    },
  });

/** Bottom sheet that asks where something comes from (add clip, add music). */
export default function SourcePickerSheet<K extends string>({
  visible,
  title,
  subtitle,
  options,
  onClose,
  onPick,
  tone = "dark",
}: Props<K>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const light = tone === "light";
  const styles = useMemo(() => createStyles(theme, light), [theme, light]);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t("close")}
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + moderateHeightScale(16) }]}
        >
          <View style={styles.handle} />
          <View style={[styles.header, !subtitle && styles.headerSpaced]}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel={t("close")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(light ? 22 : 18)}
                color={light ? theme.darkGreen : theme.white}
              />
            </TouchableOpacity>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.list}>
            {options.map((o, i) => (
              <React.Fragment key={o.key}>
                {i > 0 && !light ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onPick(o.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={o.title}
                  accessibilityHint={o.sub}
                >
                  <View style={styles.iconTile}>
                    <MaterialIcons
                      name={o.icon}
                      size={moderateWidthScale(light ? 24 : 20)}
                      color={theme.white}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{o.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {o.sub}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateWidthScale(light ? 26 : 22)}
                    color={light ? theme.darkGreen : theme.white50}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
