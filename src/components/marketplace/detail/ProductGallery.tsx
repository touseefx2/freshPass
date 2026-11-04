import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AppImage from "@/src/components/AppImage";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import type { ShopProductImage } from "@/src/types/shopProduct";
import FavoriteHeartButton from "../FavoriteHeartButton";

type Props = {
  images: ShopProductImage[];
  productId: string;
  productName: string;
  isFavorite: boolean;
  onShare: () => void;
};

const DISC = widthScale(36);
const THUMB = widthScale(64);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      backgroundColor: theme.surfaceRaised,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      position: "absolute",
      top: moderateHeightScale(14),
      right: moderateWidthScale(16),
      gap: moderateHeightScale(12),
    },
    disc: {
      width: DISC,
      height: DISC,
      borderRadius: DISC / 2,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    thumbs: {
      flexDirection: "row",
      justifyContent: "center",
      gap: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: moderateWidthScale(12),
      borderWidth: 2,
      borderColor: "transparent",
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    thumbOn: {
      borderColor: theme.darkGreen,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
  });

/**
 * Product page photos: swipeable big image (tap = full screen) with share and
 * heart buttons, plus tappable thumbnails. Jumps back to the first photo when
 * the gallery changes (another option chosen).
 */
export default function ProductGallery({
  images,
  productId,
  productName,
  isFavorite,
  onShare,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const heroHeight = Math.round(width * 0.78);
  const listRef = useRef<FlatList<ShopProductImage>>(null);
  const [index, setIndex] = useState(0);

  const galleryKey = images.map((img) => img.url).join("|");
  useEffect(() => {
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [galleryKey]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(next, images.length - 1)));
    },
    [images.length, width],
  );

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    },
    [width],
  );

  const openFull = useCallback(
    (start: number) => {
      const urls = images.map((img) => img.url);
      if (urls.length === 0) return;
      dispatch(openFullImageModal({ images: urls, initialIndex: start }));
    },
    [dispatch, images],
  );

  return (
    <View>
      <View style={[styles.hero, { height: heroHeight }]}>
        {images.length > 0 ? (
          <FlatList
            ref={listRef}
            data={images}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(img, i) => `${img.id}-${i}`}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item, index: i }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => openFull(i)}
                style={{ width, height: heroHeight }}
                accessibilityRole="imagebutton"
                accessibilityLabel={t("mpPdPhotoA11y", {
                  name: productName,
                  current: i + 1,
                  total: images.length,
                })}
              >
                <AppImage
                  uri={item.url}
                  style={styles.heroImage}
                  contentFit="cover"
                  recyclingKey={`mp-pd-${productId}-${item.url}`}
                />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.heroEmpty}>
            <MaterialIcons
              name="shopping-bag"
              size={moderateWidthScale(56)}
              color={theme.selectCard}
            />
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onShare}
            style={styles.disc}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t("share")}
          >
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={moderateWidthScale(19)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
          <FavoriteHeartButton
            productId={productId}
            isFavorite={isFavorite}
            variant="overlay"
          />
        </View>
      </View>

      {images.length > 1 ? (
        <View style={styles.thumbs}>
          {images.map((img, i) => {
            const on = i === index;
            return (
              <TouchableOpacity
                key={`${img.id}-${i}`}
                activeOpacity={0.8}
                onPress={() => goTo(i)}
                style={[styles.thumb, on && styles.thumbOn]}
                accessibilityRole="button"
                accessibilityLabel={t("mpPdShowPhoto", {
                  current: i + 1,
                  total: images.length,
                })}
                accessibilityState={{ selected: on }}
              >
                <AppImage
                  uri={img.url}
                  style={styles.thumbImage}
                  contentFit="cover"
                  recyclingKey={`mp-pd-thumb-${img.url}`}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
