import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOX_WIDTH_PERCENT = 0.92;
const BOX_HEIGHT_PERCENT = 0.85;

export interface MemoryItem {
  image_url: string;
  date: string;
}

export interface MemorySection {
  weekKey: string;
  dateLabel: string;
  items: MemoryItem[];
}

interface MemorySectionModalProps {
  visible: boolean;
  onClose: () => void;
  section: MemorySection | null;
  onShareImage: (url: string) => void;
  onDownloadImage: (url: string) => void;
  downloadingUrl: string | null;
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
      width: SCREEN_WIDTH * BOX_WIDTH_PERCENT,
      height: SCREEN_HEIGHT * BOX_HEIGHT_PERCENT,
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(20),
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(20),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.text,
    },
    closeButton: {
      padding: moderateWidthScale(8),
    },
    scrollContent: {
      padding: moderateWidthScale(16),
      paddingBottom: moderateHeightScale(32),
      flexGrow: 1,
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
    },
    imageCard: {
      width: "47%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.lightGreen2,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    imageCardInner: {
      width: "100%",
      aspectRatio: 1,
      position: "relative",
    },
    resultImage: {
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    shareButton: {
      position: "absolute",
      top: moderateHeightScale(8),
      left: moderateWidthScale(8),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
    },
    downloadButton: {
      position: "absolute",
      bottom: moderateHeightScale(8),
      right: moderateWidthScale(8),
      backgroundColor: theme.primary,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
    },
  });

export default function MemorySectionModal({
  visible,
  onClose,
  section,
  onShareImage,
  onDownloadImage,
  downloadingUrl,
}: MemorySectionModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!section) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {section.dateLabel}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(24)}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.imageGrid}>
              {section.items.map((item, index) => (
                <View
                  key={`${item.image_url}-${index}`}
                  style={styles.imageCard}
                >
                  <View style={styles.imageCardInner}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => onShareImage(item.image_url)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name="share"
                        size={moderateWidthScale(14)}
                        color={theme.white}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => onDownloadImage(item.image_url)}
                      disabled={downloadingUrl === item.image_url}
                      activeOpacity={0.7}
                    >
                      {downloadingUrl === item.image_url ? (
                        <ActivityIndicator size="small" color={theme.white} />
                      ) : (
                        <Feather
                          name="download"
                          size={moderateWidthScale(14)}
                          color={theme.white}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
