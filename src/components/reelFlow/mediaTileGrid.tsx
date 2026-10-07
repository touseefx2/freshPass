import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

export type MediaTileItem = {
  id: string;
  thumbUri: string | null | undefined;
  isPhoto: boolean;
  /** Length shown on the tile, e.g. "0:18" or "3s". */
  badge: string;
};

type Props = {
  items: MediaTileItem[];
  onRemove: (id: string) => void;
  disabled?: boolean;
};

const GAP = moderateWidthScale(12);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
    },
    tile: {
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      backgroundColor: theme.darkGreen,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    order: {
      position: "absolute",
      top: moderateHeightScale(6),
      left: moderateWidthScale(6),
      minWidth: widthScale(26),
      height: widthScale(26),
      paddingHorizontal: moderateWidthScale(6),
      borderRadius: widthScale(13),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    orderText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    remove: {
      position: "absolute",
      top: moderateHeightScale(6),
      right: moderateWidthScale(6),
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    badge: {
      position: "absolute",
      left: moderateWidthScale(6),
      bottom: moderateHeightScale(6),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    badgeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.white,
      fontVariant: ["tabular-nums"],
    },
    disabled: { opacity: 0.5 },
  });

/**
 * Picked clips as a wrapping grid of tiles (left → right, then the next
 * row): order number, length, and a remove button on every tile.
 */
export default function MediaTileGrid({
  items,
  onRemove,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  // Screen padding is 20 each side until the real width is measured
  const [width, setWidth] = useState(windowWidth - moderateWidthScale(40));

  const columns = width >= 560 ? 5 : width >= 420 ? 4 : 3;
  const tileW = Math.floor((width - GAP * (columns - 1)) / columns);
  const tileH = Math.round(tileW * (4 / 3));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {items.map((item, index) => {
        const kind = item.isPhoto ? t("flowPhoto") : t("video");
        return (
          <View
            key={item.id}
            style={[styles.tile, { width: tileW, height: tileH }]}
          >
            {item.thumbUri ? (
              <Image
                source={{ uri: item.thumbUri }}
                style={styles.image}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <View style={styles.placeholder}>
                <MaterialIcons
                  name={item.isPhoto ? "image" : "movie"}
                  size={moderateWidthScale(28)}
                  color={theme.white70}
                />
              </View>
            )}
            <View style={styles.order} pointerEvents="none">
              <Text style={styles.orderText}>{index + 1}</Text>
            </View>
            <View style={styles.badge} pointerEvents="none">
              <MaterialIcons
                name={item.isPhoto ? "photo" : "videocam"}
                size={moderateWidthScale(14)}
                color={theme.white}
              />
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
            <TouchableOpacity
              style={[styles.remove, disabled && styles.disabled]}
              onPress={() => onRemove(item.id)}
              disabled={disabled}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${t("flowRemoveClipN", { n: index + 1 })}, ${kind}, ${item.badge}`}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(20)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        );
      })}

    </View>
  );
}
