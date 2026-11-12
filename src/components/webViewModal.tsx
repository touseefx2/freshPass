import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface WebViewModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  title?: string;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(12),
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    closeButton: {
      padding: moderateWidthScale(8),
      marginLeft: moderateWidthScale(12),
    },
    webViewContainer: {
      flex: 1,
    },
    loadingContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    errorContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(40),
    },
    errorIcon: {
      width: moderateWidthScale(64),
      height: moderateWidthScale(64),
      borderRadius: moderateWidthScale(32),
      backgroundColor: theme.lightGreen07,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    errorTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(8),
    },
    errorMessage: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(20),
      marginBottom: moderateHeightScale(24),
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(32),
      borderRadius: moderateWidthScale(24),
      gap: moderateWidthScale(8),
    },
    retryText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

export default function WebViewModal({
  visible,
  url,
  onClose,
  title = "Loading...",
}: WebViewModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleClose = useCallback(() => {
    setHasError(false);
    setLoading(true);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Feather
                name="x"
                size={iconScale(24)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.webViewContainer}>
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              onLoadStart={() => {
                setLoading(true);
                setHasError(false);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
              onHttpError={() => {
                setLoading(false);
                setHasError(true);
              }}
              style={styles.webViewContainer}
            />
            {loading && !hasError && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.darkGreen} />
                <Text
                  style={[
                    styles.errorMessage,
                    { marginTop: moderateHeightScale(12), marginBottom: 0 },
                  ]}
                >
                  Loading...
                </Text>
              </View>
            )}
            {hasError && (
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Feather
                    name="wifi-off"
                    size={iconScale(28)}
                    color={theme.darkGreen}
                  />
                </View>
                <Text style={styles.errorTitle}>Unable to load page</Text>
                <Text style={styles.errorMessage}>
                  Please check your internet connection and try again.
                </Text>
                <TouchableOpacity
                  onPress={handleRetry}
                  style={styles.retryButton}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="refresh-cw"
                    size={iconScale(16)}
                    color={theme.white}
                  />
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
