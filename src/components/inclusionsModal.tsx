import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { SvgXml } from "react-native-svg";

// Close Icon SVG
const closeIconSvg = `
<svg width="{{WIDTH}}" height="{{HEIGHT}}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="{{COLOR}}"/>
</svg>
`;

const CloseIcon = ({ width = 24, height = 24, color = "#283618" }) => {
  const svgXml = closeIconSvg
    .replace(/{{WIDTH}}/g, width.toString())
    .replace(/{{HEIGHT}}/g, height.toString())
    .replace(/{{COLOR}}/g, color);
  return <SvgXml xml={svgXml} />;
};

interface InclusionsModalProps {
  visible: boolean;
  onClose: () => void;
  inclusions: string[];
  title?: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      padding: moderateWidthScale(20),
      width: "85%",
      alignSelf: "center",
      maxHeight: heightScale(600),
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    closeButton: {
      width: widthScale(32),
      height: heightScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.lightGreen015,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      gap: moderateHeightScale(8),
    },
    item: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.text,
    },
  });

export default function InclusionsModal({
  visible,
  onClose,
  inclusions,
  title = "All Inclusions",
}: InclusionsModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <CloseIcon
                width={widthScale(20)}
                height={heightScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {inclusions.map((inclusion, index) => (
              <Text key={index} style={styles.item}>
                {inclusion}
              </Text>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

