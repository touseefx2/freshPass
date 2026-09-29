import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { resolveApiImageUrl } from "@/src/utils/media";
import {
  extractVideoThumbnail,
  getCachedVideoThumbnail,
} from "@/src/utils/videoThumbnailCache";

type ReelTemplateCardThumbProps = {
  templateId: number;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  style?: StyleProp<ViewStyle>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      width: "100%",
      aspectRatio: 9 / 16,
      backgroundColor: theme.lightGreen07,
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen07,
    },
    playBadge: {
      position: "absolute",
      bottom: moderateWidthScale(8),
      right: moderateWidthScale(8),
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen4,
      alignItems: "center",
      justifyContent: "center",
    },
  });

/**
 * Template grid thumb — server thumbnail, else first frame from preview_video_url.
 */
export default function ReelTemplateCardThumb({
  templateId,
  thumbnailUrl,
  previewVideoUrl,
  style,
}: ReelTemplateCardThumbProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const serverThumb = resolveApiImageUrl(thumbnailUrl);
  const previewUrl = resolveApiImageUrl(previewVideoUrl);

  const [thumbUri, setThumbUri] = useState<string | null>(
    () => serverThumb || getCachedVideoThumbnail(templateId) || null,
  );
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (serverThumb) {
      setThumbUri(serverThumb);
      return;
    }

    const cached = getCachedVideoThumbnail(templateId);
    if (cached) {
      setThumbUri(cached);
      return;
    }

    if (!previewUrl) {
      setThumbUri(null);
      return;
    }

    setExtracting(true);
    extractVideoThumbnail(templateId, previewUrl)
      .then((uri) => {
        if (!cancelled && uri) setThumbUri(uri);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl, serverThumb, templateId]);

  return (
    <View style={[styles.wrap, style]}>
      {thumbUri ? (
        <AppImage uri={thumbUri} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          {extracting ? (
            <ActivityIndicator color={theme.buttonBack} />
          ) : (
            <MaterialIcons
              name="movie"
              size={moderateWidthScale(32)}
              color={theme.lightGreen}
            />
          )}
        </View>
      )}
      {previewUrl ? (
        <View style={styles.playBadge}>
          <MaterialIcons
            name="play-arrow"
            size={moderateWidthScale(18)}
            color={theme.white}
          />
        </View>
      ) : null}
    </View>
  );
}
