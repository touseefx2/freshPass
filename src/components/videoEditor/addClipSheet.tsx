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

export type AddClipSource = "gallery" | "recordVideo" | "takePhoto";

type Props = {
  visible: boolean;
  /** e.g. "0:54 left in your reel" or how far over the limit it is. */
  timeLabel: string;
  onClose: () => void;
  onPick: (source: AddClipSource) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(22),
      borderTopRightRadius: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(16),
    },
    handle: {
      alignSelf: "center",
      width: widthScale(40),
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.white15,
      marginTop: moderateHeightScale(8),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(4),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    closeBtn: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginBottom: moderateHeightScale(12),
    },
    list: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white15,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(60),
      paddingHorizontal: moderateWidthScale(14),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.white15,
      marginLeft: moderateWidthScale(14) + widthScale(40) + moderateWidthScale(12),
    },
    iconTile: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    rowSub: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      marginTop: moderateHeightScale(2),
    },
  });

export default function AddClipSheet({ visible, timeLabel, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const options: {
    key: AddClipSource;
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    sub: string;
  }[] = [
    {
      key: "gallery",
      icon: "photo-library",
      title: t("addClipGallery"),
      sub: t("addClipGallerySub"),
    },
    {
      key: "recordVideo",
      icon: "videocam",
      title: t("addClipRecord"),
      sub: t("addClipRecordSub"),
    },
    {
      key: "takePhoto",
      icon: "photo-camera",
      title: t("addClipPhoto"),
      sub: t("addClipPhotoSub"),
    },
  ];

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
          <View style={styles.header}>
            <Text style={styles.title}>{t("addClip")}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel={t("close")}
            >
              <MaterialIcons name="close" size={moderateWidthScale(18)} color={theme.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {timeLabel}
          </Text>

          <View style={styles.list}>
            {options.map((o, i) => (
              <React.Fragment key={o.key}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onPick(o.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={o.title}
                  accessibilityHint={o.sub}
                >
                  <View style={styles.iconTile}>
                    <MaterialIcons name={o.icon} size={moderateWidthScale(20)} color={theme.white} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{o.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {o.sub}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateWidthScale(22)}
                    color={theme.white50}
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
