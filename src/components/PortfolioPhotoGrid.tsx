import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Sortable, { type SortableGridRenderItem } from "react-native-sortables";
import type { AnimatedRef } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { GalleryIcon, CameraIcon } from "@/assets/icons";

const GAP = moderateWidthScale(10);
const NUM_COLUMNS = 3;

export type PortfolioGridPhoto = { id: string; uri: string };

type GridItem =
  | { type: "gallery"; id: string }
  | { type: "camera"; id: string }
  | ({ type: "photo" } & PortfolioGridPhoto);

type Props<P extends PortfolioGridPhoto> = {
  /** Photos in display order; the first one is the main portfolio photo */
  photos: P[];
  onChangeOrder: (photos: P[]) => void;
  onDelete: (photo: P) => void;
  onPickGallery: () => void;
  onTakePhoto: () => void;
  /** Parent Animated.ScrollView, enables auto-scroll while dragging */
  scrollableRef?: AnimatedRef<any>;
  /** Hide the gallery/camera tiles (e.g. owner without an active plan) */
  showUploadTiles?: boolean;
  /** Called when a photo tile is tapped (not dragged) */
  onPhotoPress?: (photo: P, index: number) => void;
  /** When true, disables all interactions (drag, delete, star, tap) */
  disabled?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(10),
    },
    hintText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    grid: {
      marginTop: moderateHeightScale(10),
    },
    tile: {
      width: "100%",
      aspectRatio: 1,
    },
    actionButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
      backgroundColor: theme.galleryPhotoBack,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
    },
    actionButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    photoContainer: {
      flex: 1,
      backgroundColor: theme.grey15,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(8),
      overflow: "hidden",
    },
    mainPhotoContainer: {
      borderWidth: 2,
      borderColor: theme.orangeBrown,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    // Touch boxes are 4pt bigger on every side than the visible 24pt icon box
    // (RNGH tap ignores hitSlop); the padding keeps the icon box where it was.
    deleteButton: {
      position: "absolute",
      top: 0,
      right: 0,
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(4),
      paddingLeft: moderateWidthScale(4),
      paddingRight: moderateWidthScale(4),
    },
    deleteIconBox: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    setMainButton: {
      position: "absolute",
      top: 0,
      left: 0,
      paddingTop: moderateHeightScale(4),
      paddingBottom: moderateHeightScale(4),
      paddingLeft: moderateWidthScale(4),
      paddingRight: moderateWidthScale(4),
    },
    setMainCircle: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white85,
    },
    mainBadge: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(3),
      paddingVertical: moderateHeightScale(3),
      backgroundColor: theme.orangeBrown,
    },
    mainBadgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });

/** Portfolio grid: gallery/camera tiles stay first, photos reorder by press + hold + drag. */
export default function PortfolioPhotoGrid<P extends PortfolioGridPhoto>({
  photos,
  onChangeOrder,
  onDelete,
  onPickGallery,
  onTakePhoto,
  scrollableRef,
  showUploadTiles = true,
  onPhotoPress,
  disabled = false,
}: Props<P>) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const uploadTileCount = showUploadTiles ? 2 : 0;
  const gridData = useMemo<GridItem[]>(
    () => [
      ...(showUploadTiles
        ? [
            { type: "gallery" as const, id: "gallery" },
            { type: "camera" as const, id: "camera" },
          ]
        : []),
      ...photos.map((photo) => ({ ...photo, type: "photo" as const })),
    ],
    [photos, showUploadTiles],
  );

  const photoById = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: GridItem[] }) => {
      const ordered = data
        .filter((item) => item.type === "photo")
        .map((item) => photoById.get(item.id))
        .filter((photo): photo is P => !!photo);
      if (ordered.some((photo, index) => photo.id !== photos[index]?.id)) {
        onChangeOrder(ordered);
      }
    },
    [photoById, photos, onChangeOrder],
  );

  const handleSetMain = useCallback(
    (id: string) => {
      const photo = photoById.get(id);
      if (!photo) return;
      onChangeOrder([photo, ...photos.filter((p) => p.id !== id)]);
    },
    [photoById, photos, onChangeOrder],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const photo = photoById.get(id);
      if (photo) onDelete(photo);
    },
    [photoById, onDelete],
  );

  const renderItem = useCallback<SortableGridRenderItem<GridItem>>(
    ({ item, index }) => {
      if (item.type === "gallery" || item.type === "camera") {
        const isGallery = item.type === "gallery";
        return (
          <Sortable.Handle mode="fixed-order" style={styles.tile}>
            <Sortable.Touchable
              style={[styles.actionButton, disabled && { opacity: 0.5 }]}
              onTap={disabled ? undefined : (isGallery ? onPickGallery : onTakePhoto)}
            >
              {isGallery ? (
                <GalleryIcon color={theme.darkGreen} />
              ) : (
                <CameraIcon color={theme.darkGreen} />
              )}
              <Text style={styles.actionButtonText}>
                {isGallery ? "from gallery" : "from camera"}
              </Text>
            </Sortable.Touchable>
          </Sortable.Handle>
        );
      }

      // Gallery + camera tiles (when shown) come before the photos
      const isMain = index === uploadTileCount;
      return (
        <Sortable.Handle style={[styles.tile, disabled && { opacity: 0.6 }]}>
          <View
            style={[styles.photoContainer, isMain && styles.mainPhotoContainer]}
          >
            <Sortable.Touchable
              onTap={disabled ? undefined : () => {
                const photo = photoById.get(item.id);
                if (photo && onPhotoPress) {
                  onPhotoPress(photo, index - uploadTileCount);
                }
              }}
            >
              <AppImage uri={item.uri} style={styles.photo} />
            </Sortable.Touchable>
            {isMain ? (
              <View style={styles.mainBadge}>
                <MaterialIcons
                  name="star"
                  size={moderateWidthScale(12)}
                  color={theme.white}
                />
                <Text style={styles.mainBadgeText}>{t("mainPhoto")}</Text>
              </View>
            ) : (
              <Sortable.Touchable
                style={styles.setMainButton}
                onTap={disabled ? undefined : () => handleSetMain(item.id)}
              >
                <View style={styles.setMainCircle}>
                  <MaterialIcons
                    name="star-outline"
                    size={moderateWidthScale(16)}
                    color={theme.orangeBrown}
                  />
                </View>
              </Sortable.Touchable>
            )}
            <Sortable.Touchable
              style={styles.deleteButton}
              onTap={disabled ? undefined : () => handleDelete(item.id)}
            >
              <View style={styles.deleteIconBox}>
                <MaterialIcons
                  name="delete-outline"
                  size={moderateWidthScale(20)}
                  color={theme.red}
                />
              </View>
            </Sortable.Touchable>
          </View>
        </Sortable.Handle>
      );
    },
    [
      styles,
      theme,
      t,
      uploadTileCount,
      onPickGallery,
      onTakePhoto,
      handleSetMain,
      handleDelete,
      onPhotoPress,
      photoById,
      disabled,
    ],
  );

  return (
    <View>
      {photos.length > 1 && (
        <View style={styles.hintRow}>
          <MaterialIcons
            name="drag-indicator"
            size={moderateWidthScale(16)}
            color={theme.lightGreen}
          />
          <Text style={styles.hintText}>{t("portfolioReorderHint")}</Text>
        </View>
      )}
      <View style={styles.grid}>
        <Sortable.Grid
          data={gridData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          columns={NUM_COLUMNS}
          rowGap={GAP}
          columnGap={GAP}
          customHandle
          hapticsEnabled
          dragActivationDelay={250}
          activeItemScale={1.05}
          inactiveItemOpacity={1}
          onDragEnd={disabled ? undefined : handleDragEnd}
          scrollableRef={scrollableRef}
        />
      </View>
    </View>
  );
}
