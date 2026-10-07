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
  iconScale,
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
  /** Shows a spinner in the footer button and blocks presses. */
  footerButtonLoading?: boolean;
  /** When false, swipe / overlay tap / back button / close icon cannot dismiss the sheet (e.g. while submitting). */
  dismissible?: boolean;
  children: React.ReactNode;
  sheetContainerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollViewStyle?: ViewStyle;
  /** Fixed height as fraction of screen (e.g. 0.85 = 85%). When set, sheet uses this height instead of adjusting to content. */
  modalHeightPercent?: number;
  /** Cap sheet height as fraction of screen (e.g. 0.88). Sheet still shrinks to content below this; content scrolls above it. */
  maxHeightPercent?: number;
  /** When false, renders inline instead of Portal (use inside React Native Modal). */
  usePortal?: boolean;
  showsVerticalScrollIndicator?: boolean;
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
  footerButtonLoading = false,
  dismissible = true,
  children,
  sheetContainerStyle = {},
  contentStyle,
  scrollViewStyle,
  modalHeightPercent,
  maxHeightPercent,
  usePortal = true,
  showsVerticalScrollIndicator = false,
}: ModalizeBottomSheetProps) {
  const modalizeRef = useRef<Modalize>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  // Keep sheet below status bar / Dynamic Island on iOS
  const topSafeGap = insets.top + moderateHeightScale(12);
  const safeMaxModalHeight = screenHeight - topSafeGap;
  const cappedMaxModalHeight =
    maxHeightPercent != null
      ? Math.min(screenHeight * maxHeightPercent, safeMaxModalHeight)
      : safeMaxModalHeight;
  const resolvedModalHeight =
    modalHeightPercent != null
      ? Math.min(screenHeight * modalHeightPercent, cappedMaxModalHeight)
      : undefined;
  // Header + footer + handle roughly occupy ~150–170px; keep scroll area under the cap.
  const chromeHeight = moderateHeightScale(160) + insets.bottom;
  const maxContentHeight = resolvedModalHeight
    ? resolvedModalHeight - chromeHeight
    : cappedMaxModalHeight - chromeHeight;

  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const programmaticCloseRef = useRef(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        modalizeRef.current?.open();
      }, 100);
      return () => clearTimeout(timer);
    }
    programmaticCloseRef.current = true;
    modalizeRef.current?.close();
  }, [visible]);

  // Modalize fires onClosed even when its close animation is interrupted by a
  // re-open (e.g. opening the next item right after confirming the previous one).
  // If the parent already wants the sheet visible again, re-open instead of
  // reporting a close that would hide the sheet and desync `visible`.
  const handleClosed = () => {
    const wasProgrammatic = programmaticCloseRef.current;
    programmaticCloseRef.current = false;
    if (wasProgrammatic && visibleRef.current) {
      setTimeout(() => {
        if (visibleRef.current) modalizeRef.current?.open();
      }, 0);
      return;
    }
    onClose();
  };

  const sheet = (
    <Modalize
      ref={modalizeRef}
      onClosed={handleClosed}
      adjustToContentHeight={!modalHeightPercent}
      modalHeight={resolvedModalHeight}
      handlePosition="inside"
      withOverlay
      closeOnOverlayTap={dismissible}
      panGestureEnabled={dismissible}
      onBackButtonPress={() => {
        if (dismissible) modalizeRef.current?.close();
        return true;
      }}
      avoidKeyboardLikeIOS
      overlayStyle={styles.modalOverlay}
      modalStyle={[
        styles.bottomSheet,
        sheetContainerStyle,
        { maxHeight: cappedMaxModalHeight },
      ]}
      HeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight}>
            <Pressable
              onPress={onClose}
              disabled={!dismissible}
              style={[styles.closeButton, !dismissible && { opacity: 0.4 }]}
            >
              <Feather
                name="x"
                size={iconScale(12)}
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
              loading={footerButtonLoading}
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
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {children}
      </ScrollView>
    </Modalize>
  );

  if (!usePortal) {
    return sheet;
  }

  return <Portal>{sheet}</Portal>;
}
