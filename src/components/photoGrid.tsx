import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale, moderateHeightScale } from "@/src/theme/dimensions";

interface Photo {
  id: string;
  uri: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onDeletePhoto: (id: string) => void;
  numColumns?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = moderateWidthScale(20);
const GAP = moderateWidthScale(12);
const NUM_COLUMNS = 3;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
      marginTop: moderateHeightScale(16),
    },
    photoContainer: {
      position: "relative",
      width: (SCREEN_WIDTH - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
      aspectRatio: 1,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
      backgroundColor: theme.grey15,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    deleteButton: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
  });

export default function PhotoGrid({
  photos,
  onDeletePhoto,
  numColumns = NUM_COLUMNS,
}: PhotoGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

  const photoWidth = useMemo(
    () => (SCREEN_WIDTH - PADDING * 2 - GAP * (numColumns - 1)) / numColumns,
    [numColumns]
  );

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[styles.photoContainer, { width: photoWidth }]}
        >
          <Image source={{ uri: photo.uri }} style={styles.photo} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDeletePhoto(photo.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="delete"
              size={moderateWidthScale(16)}
              color={theme.white}
            />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

