import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Zoom from "react-native-zoom-reanimated";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { CloseIcon } from "@/assets/icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { closeFullImageModal } from "@/src/state/slices/generalSlice";
import type { RootState } from "@/src/state/store";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    imageModal: {
      flex: 1,
      backgroundColor: theme.black || "#000000",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCloseButton: {
      position: "absolute",
      top: moderateHeightScale(50),
      right: moderateWidthScale(20),
      zIndex: 10,
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
    imagePage: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
    },
    dotsContainer: {
      position: "absolute",
      bottom: moderateHeightScale(40),
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: moderateWidthScale(8),
      zIndex: 10,
    },
    dot: {
      width: widthScale(8),
      height: widthScale(8),
      borderRadius: widthScale(4),
    },
    dotActive: {
      opacity: 1,
    },
    dotInactive: {
      opacity: 0.4,
    },
  });

export default function FullImageModal() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const visible = useSelector(
    (s: RootState) => s.general.fullImageModalVisible,
  );
  const images = useSelector((s: RootState) => s.general.fullImageModalImages);
  const initialIndex = useSelector(
    (s: RootState) => s.general.fullImageModalInitialIndex,
  );

  const flatListRef = useRef<FlatList<string> | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const onClose = useCallback(() => {
    dispatch(closeFullImageModal());
  }, [dispatch]);

  // When modal opens with initialIndex, scroll to it and sync currentIndex
  useEffect(() => {
    if (visible && images.length > 1 && flatListRef.current) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 50);
    }
  }, [visible, images.length, initialIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / SCREEN_WIDTH);
      setCurrentIndex(Math.min(index, images.length - 1));
    },
    [images.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <View style={styles.imagePage}>
        <Zoom
          enableGallerySwipe
          parentScrollRef={flatListRef}
          currentIndex={index}
          itemWidth={SCREEN_WIDTH}
          minScale={1}
          maxScale={4}
        >
          <Image
            source={{ uri: item }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </Zoom>
      </View>
    ),
    [styles],
  );

  const keyExtractor = useCallback(
    (item: string, index: number) => `${index}`,
    [],
  );

  if (!visible) {
    return null;
  }

  const hasMultiple = images.length > 1;
  const displayImages = images.length ? images : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.imageModal}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <CloseIcon
            width={widthScale(24)}
            height={heightScale(24)}
            color={theme.white}
          />
        </Pressable>

        {displayImages.length === 1 && (
          <View style={styles.imagePage}>
            <Zoom minScale={1} maxScale={4}>
              <Image
                source={{ uri: displayImages[0] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </Zoom>
          </View>
        )}

        {hasMultiple && (
          <>
            <FlatList<string>
              ref={flatListRef}
              data={displayImages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({
                    offset: info.index * SCREEN_WIDTH,
                    animated: false,
                  });
                }, 100);
              }}
            />
            <View style={styles.dotsContainer}>
              {displayImages.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.dot,
                    index === currentIndex
                      ? styles.dotActive
                      : styles.dotInactive,
                    { backgroundColor: theme.white },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
