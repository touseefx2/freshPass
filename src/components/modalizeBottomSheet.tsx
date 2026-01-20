import React, { useMemo, useEffect, useRef } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Modalize } from "react-native-modalize";
import { Portal } from "@gorhom/portal";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalizeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  footerButtonTitle?: string;
  onFooterButtonPress?: () => void;
  footerButtonDisabled?: boolean;
  children: React.ReactNode;
  sheetContainerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollViewStyle?: ViewStyle;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    bottomSheet: {
      backgroundColor: theme.white,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(20),
    },
    headerTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    closeButton: {
      width: widthScale(18),
      height: widthScale(18),
      borderRadius: moderateWidthScale(18 / 2),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollView: {
      width: "100%",
    },
    scrollContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(7),
      paddingBottom: moderateHeightScale(20),
    },
    buttonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(5),
    },
  });

export default function ModalizeBottomSheet({
  visible,
  onClose,
  title,
  footerButtonTitle,
  onFooterButtonPress,
  footerButtonDisabled = false,
  children,
  sheetContainerStyle={},
  contentStyle,
  scrollViewStyle,
}: ModalizeBottomSheetProps) {
  const modalizeRef = useRef<Modalize>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const maxContentHeight = screenHeight * 0.75;

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        modalizeRef.current?.open();
      }, 100);
    } else {
      modalizeRef.current?.close();
    }
  }, [visible]);

  return (
    <Portal>
      <Modalize
        ref={modalizeRef}
        onClosed={onClose}
        adjustToContentHeight
        handlePosition="inside"
        withOverlay
        closeOnOverlayTap
        panGestureEnabled
        avoidKeyboardLikeIOS
        overlayStyle={styles.modalOverlay}
        modalStyle={[styles.bottomSheet,sheetContainerStyle, { maxHeight: screenHeight * 0.9 }]}
        HeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerRight}>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather
                  name="x"
                  size={moderateWidthScale(12)}
                  color={theme.darkGreen}
                />
              </Pressable>
            </View>
          </View>
        }
        FooterComponent={
          footerButtonTitle ? (
            <View
              style={[
                styles.buttonContainer,
                { paddingBottom: insets.bottom + 15 },
              ]}
            >
              <Button
                title={footerButtonTitle}
                onPress={onFooterButtonPress || (() => {})}
                disabled={footerButtonDisabled}
              />
            </View>
          ) : (
            <View style={{ paddingBottom: insets.bottom + 15 }} />
          )
        }
      >
        <ScrollView
          nestedScrollEnabled
          style={[
            styles.scrollView,
            { maxHeight: maxContentHeight },
            scrollViewStyle,
          ]}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </Modalize>
    </Portal>
  );
}
