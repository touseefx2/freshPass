import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Platform,
  Animated,
  Keyboard,
  Dimensions,
  Easing,
  Alert,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  widthScale,
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments } from "expo-router";
import { CloseIcon } from "@/assets/icons";
import { IMAGES } from "@/src/constant/images";
import { Ionicons } from "@expo/vector-icons";
import { AiChatContent } from "@/src/components/AiChatContent";
import { VoiceReceptionistContent } from "@/src/components/VoiceReceptionistContent";
import {
  toggleChat,
  openChat,
  closeChat,
  clearMessages,
  setSessionId,
  sendUserMessage,
  startAiStreamResponse,
  appendTokenToLastMessage,
  completeAiStreamResponse,
  streamError,
  ChatMessage,
} from "@/src/state/slices/chatSlice";
import { checkInternetConnection } from "../services/api";
import { AiToolsService } from "../services/aiToolsService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_BOX_WIDTH = SCREEN_WIDTH * 0.85;
const CHAT_BOX_HEIGHT = SCREEN_HEIGHT * 0.6;

const CHAT_BOTTOM_OFFSET = 75;
const CHAT_BOTTOM_OFFSET_TRYON = 125; // when isFirstShowTryOn is true

const createStyles = (
  theme: Theme,
  bottomInset: number,
  chatBottomOffset: number = CHAT_BOTTOM_OFFSET,
) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      zIndex: 998,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    floatingButton: {
      position: "absolute",
      bottom: moderateHeightScale(chatBottomOffset) + bottomInset,
      right: moderateWidthScale(16),
      width: widthScale(45),
      height: widthScale(45),
      borderRadius: widthScale(45 / 2),
      backgroundColor: theme.darkGreenLight,
      padding: moderateWidthScale(2),
      borderWidth: 3,
      borderTopColor: theme.white,
      borderLeftColor: theme.white,
      borderRightColor: theme.orangeBrown,
      borderBottomColor: theme.orangeBrown,
      // overflow: "hidden",
    },
    buttonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: widthScale(45 / 2),
      backgroundColor: theme.buttonBack,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    shadowLight: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    aiIconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    aiAgentImage: {
      width: widthScale(35),
      height: widthScale(44),
      top: -15,
    },
    menuOptionsContainer: {
      position: "absolute",
      bottom:
        moderateHeightScale(chatBottomOffset) +
        bottomInset +
        widthScale(45) +
        moderateHeightScale(12),
      right: moderateWidthScale(16),
      alignItems: "flex-end",
      gap: moderateHeightScale(10),
      zIndex: 1000,
    },
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(14),
      backgroundColor: theme.darkGreenLight,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.white70,
      minWidth: widthScale(140),
      // 3D raised effect – stronger shadow
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(4),
      },
      shadowOpacity: 0.38,
      shadowRadius: moderateWidthScale(6),
      elevation: 8,
    },
    menuOptionIcon: {
      width: widthScale(24),
      height: widthScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    chatBoxContainer: {
      position: "absolute",
      bottom: moderateHeightScale(chatBottomOffset) + bottomInset,
      right: moderateWidthScale(5),
      width: CHAT_BOX_WIDTH,
      height: SCREEN_HEIGHT * 0.75,
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(20),
      overflow: "hidden",
      zIndex: 999,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.darkGreen,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    aiAvatarHeader: {
      width: widthScale(25),
      height: widthScale(25),
      borderRadius: widthScale(25 / 2),
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    headerRightButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    headerButton: {
      width: widthScale(32),
      height: widthScale(32),
      alignItems: "center",
      justifyContent: "center",
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(14),
    },
    messagesContent: {
      paddingVertical: moderateHeightScale(16),
    },
    messageBubble: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      marginBottom: moderateHeightScale(8),
    },
    userMessage: {
      alignSelf: "flex-end",
      maxWidth: "85%",
      backgroundColor: theme.buttonBack,
      borderBottomRightRadius: moderateWidthScale(4),
    },
    userMessageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(20),
    },
    aiMessageText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: moderateHeightScale(20),
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
      backgroundColor: theme.background,
    },
    textInputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      maxHeight: heightScale(100),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    textInput: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      maxHeight: heightScale(80),
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    clearButton: {
      marginLeft: moderateWidthScale(8),
      padding: moderateWidthScale(4),
    },
    sendButton: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(32 / 2),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    inputContainerDisabled: {
      opacity: 0.7,
    },
    inputWrapperDisabled: {
      backgroundColor: theme.borderLight,
    },
    textInputDisabled: {
      color: theme.lightGreen,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      gap: moderateHeightScale(12),
    },
    emptyTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(22),
    },
    typingIndicator: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
      gap: moderateWidthScale(10),
    },
    typingIconContainer: {
      width: widthScale(20),
      height: widthScale(20),
      alignItems: "center",
      justifyContent: "center",
    },
    typingDotsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    typingDot: {
      width: widthScale(8),
      height: widthScale(8),
      borderRadius: widthScale(4),
      backgroundColor: theme.darkGreen,
    },
    aiMessageContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      maxWidth: "85%",
    },
    aiMessageIconContainer: {
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: moderateHeightScale(2),
    },
    aiMessageBubble: {
      flex: 1,
      borderRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(4),
      backgroundColor: theme.lightGreen1,
    },
    inlineTypingContainer: {
      paddingVertical: moderateHeightScale(4),
    },
    inlineTypingDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(5),
    },
    inlineTypingDot: {
      width: widthScale(8),
      height: widthScale(8),
      borderRadius: widthScale(4),
      backgroundColor: theme.darkGreen,
    },
    receptionistContainer: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(24),
      paddingVertical: moderateHeightScale(20),
      alignItems: "center",
      justifyContent: "space-between",
    },
    receptionistBody: {
      flex: 1,
      width: "100%",
      alignItems: "center",
    },
    receptionistCenter: {
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
    },
    receptionistMicOuter: {
      width: widthScale(120),
      height: widthScale(120),
      borderRadius: widthScale(60),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen1,
    },
    receptionistMicInner: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    receptionistStatusText: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    receptionistTimerText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    receptionistStatusTextMedium: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
    },
    receptionistErrorText: {
      marginTop: moderateHeightScale(8),
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.red,
      textAlign: "center",
    },
    receptionistErrorContainer: {
      alignItems: "center",
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(8),
    },
    receptionistRetryTouchable: {
      paddingVertical: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(8),
    },
    receptionistRetryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    receptionistControls: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateWidthScale(12),
    },
    receptionistControlButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(999),
    },
    receptionistControlButtonStart: {
      backgroundColor: theme.darkGreen,
    },
    receptionistControlButtonEnd: {
      backgroundColor: theme.red,
    },
    receptionistControlLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    receptionistTranscriptContainer: {
      width: "100%",
      marginTop: moderateHeightScale(20),
      marginBottom: moderateHeightScale(12),
      maxHeight: heightScale(180),
    },
    receptionistTranscriptTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    receptionistTranscriptMessage: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    receptionistTranscriptScroll: {
      marginTop: moderateHeightScale(4),
    },
    receptionistTranscriptScrollContent: {
      paddingBottom: moderateHeightScale(4),
    },
    receptionistCurrentStatementContainer: {
      width: "100%",
      height: heightScale(180),
      marginTop: moderateHeightScale(24),
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
    },
    receptionistCurrentStatementScroll: {
      flex: 1,
      width: "100%",
    },
    receptionistCurrentStatementScrollContent: {
      paddingVertical: moderateHeightScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    receptionistCurrentStatementText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
    },
    receptionistCurrentStatementTextMargin: {
      marginBottom: moderateHeightScale(12),
    },
    receptionistIconButton: {
      flex: 1,
      height: heightScale(44),
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.borderLine,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    receptionistIconButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    receptionistIconLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.text,
    },
  });

const AiChatBot: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const segments = useSegments() as string[];
  const isOnExploreScreen =
    Array.isArray(segments) && segments.includes("(explore)");
  const isFirstTryon = useAppSelector(
    (state) => state.general.isFirstShowTryOn,
  );
  const { userRole, isGuest, accessToken } = useAppSelector(
    (state) => state.user,
  );
  const chatBottomOffset =
    isFirstTryon && isOnExploreScreen
      ? CHAT_BOTTOM_OFFSET_TRYON
      : CHAT_BOTTOM_OFFSET;
  const styles = useMemo(
    () => createStyles(theme, bottomInset, chatBottomOffset),
    [theme, bottomInset, chatBottomOffset],
  );

  const { isOpen, messages, isLoading, isStreaming, sessionId } =
    useAppSelector((state) => state.chat);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const canShowMenu = userRole === "customer" || isGuest;
  const [chatMode, setChatMode] = useState<"ai_chat_bot" | "ai_receptionist">(
    "ai_chat_bot",
  );

  // Check if input should be disabled (loading or streaming)
  const isInputDisabled = isLoading || isStreaming;

  // Animation ref for chat box open/close
  const chatBoxAnim = useRef(new Animated.Value(0)).current;
  // Float animation for FAB when chat is closed (gentle up-down bob)
  const floatAnim = useRef(new Animated.Value(0)).current;

  let VOICE_AGENT_WS_URL = process.env.EXPO_PUBLIC_WEBHOOK_URL || "";
  if (!isGuest && accessToken) {
    // Android WebSocket rejects URLs with | (IllegalArgumentException); iOS accepts raw token.
    const tokenForUrl =
      Platform.OS === "android" ? encodeURIComponent(accessToken) : accessToken;
    VOICE_AGENT_WS_URL = VOICE_AGENT_WS_URL + `&user_token=${tokenForUrl}`;
  }

  console.log("VOICE_AGENT_WS_URL : ", VOICE_AGENT_WS_URL);

  // Gentle float (up then down) when chat is closed
  useEffect(() => {
    if (isOpen) {
      floatAnim.setValue(0);
      return;
    }
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    bob.start();
    return () => bob.stop();
  }, [isOpen, floatAnim]);

  // Animate chat box open/close
  useEffect(() => {
    Animated.spring(chatBoxAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOpen, chatBoxAnim]);

  const handleFloatingButtonPress = useCallback(() => {
    if (menuExpanded) return;

    // Only show menu for customer or guest users
    if (canShowMenu) {
      setMenuExpanded(true);
    } else {
      // For other roles, open AI chat bot directly
      setChatMode("ai_chat_bot");
      dispatch(openChat());
    }
  }, [menuExpanded, canShowMenu, dispatch]);

  const handleCloseMenu = useCallback(() => {
    setMenuExpanded(false);
  }, []);

  const handleSelectOption = useCallback(
    (mode: "ai_chat_bot" | "ai_receptionist") => {
      setChatMode(mode);
      dispatch(openChat());
      setMenuExpanded(false);
    },
    [dispatch],
  );

  const handleCloseChat = useCallback(() => {
    Keyboard.dismiss();
    dispatch(closeChat());
  }, [dispatch]);

  const handleDeleteChat = useCallback(() => {
    Alert.alert(t("clearChat"), t("clearChatConfirm"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("clear"),
        style: "destructive",
        onPress: () => {
          dispatch(clearMessages());
          dispatch(setSessionId("0"));
        },
      },
    ]);
  }, [dispatch]);

  const handleSendMessage = async () => {
    if (inputText.trim().length === 0 || isInputDisabled) return;

    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      Alert.alert(
        t("noInternetConnection"),
        t("pleaseCheckInternetConnection"),
      );
      return;
    }

    const messageText = inputText.trim();
    setInputText("");

    // Add user message
    dispatch(sendUserMessage(messageText));

    // Start streaming response
    dispatch(startAiStreamResponse());

    // Call API with streaming
    await AiToolsService.streamChat(
      sessionId,
      messageText,
      null, // business_id is optional
      // onToken callback - append each token to the message
      (token: string) => {
        dispatch(appendTokenToLastMessage(token));
      },
      // onComplete callback - finalize the message
      (fullResponse: string, newSessionId: string) => {
        dispatch(
          completeAiStreamResponse({ fullResponse, sessionId: newSessionId }),
        );
      },
      // onError callback - handle errors
      (error: Error) => {
        dispatch(streamError());
        Alert.alert(t("error"), error.message || t("failedToGetAiResponse"));
      },
    );
  };

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading, isStreaming]);

  // Also scroll when the last message text changes (for streaming)
  const lastMessageText =
    messages.length > 0 ? messages[messages.length - 1].text : "";
  useEffect(() => {
    if (isStreaming && flatListRef.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [lastMessageText, isStreaming]);

  const chatBoxAnimStyle = {
    opacity: chatBoxAnim,
    transform: [
      {
        scale: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
    ],
  };

  return (
    <>
      {/* Overlay when chat is open - clicking anywhere closes the chat */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={handleCloseChat}>
          <View style={styles.container}>
            <View style={styles.overlay} />
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Chat Box - positioned above the button */}
      {isOpen && (
        <Animated.View
          style={[styles.chatBoxContainer, chatBoxAnimStyle, styles.shadow]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={
              Platform.OS === "ios" ? moderateHeightScale(100) : 0
            }
          >
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatarHeader}>
                  {chatMode === "ai_chat_bot" ? (
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color={theme.white}
                    />
                  ) : (
                    <Ionicons
                      name="mic-outline"
                      size={20}
                      color={theme.white}
                    />
                  )}
                </View>
                <Text style={styles.headerTitle}>
                  {chatMode === "ai_chat_bot"
                    ? t("chatWithFreshy") || "Chat with Freshy"
                    : t("talkWithFreshy") || "Talk with Freshy"}
                </Text>
              </View>
              <View style={styles.headerRightButtons}>
                {chatMode === "ai_chat_bot" && messages.length > 0 && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleDeleteChat}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: widthScale(18),
                        height: widthScale(18),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: widthScale(14),
                          height: widthScale(12),
                          borderWidth: 1.5,
                          borderColor: theme.white,
                          borderRadius: moderateWidthScale(1),
                          borderTopWidth: 0,
                          position: "relative",
                        }}
                      >
                        <View
                          style={{
                            width: widthScale(16),
                            height: widthScale(2),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(-2),
                            left: moderateWidthScale(-1),
                          }}
                        />
                        <View
                          style={{
                            width: widthScale(4),
                            height: widthScale(2),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(-4),
                            left: moderateWidthScale(5),
                          }}
                        />
                        <View
                          style={{
                            width: widthScale(1),
                            height: widthScale(6),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(2),
                            left: moderateWidthScale(3),
                          }}
                        />
                        <View
                          style={{
                            width: widthScale(1),
                            height: widthScale(6),
                            backgroundColor: theme.white,
                            position: "absolute",
                            top: moderateHeightScale(2),
                            left: moderateWidthScale(6.5),
                          }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleCloseChat}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: widthScale(18),
                      height: widthScale(18),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: widthScale(14),
                        height: widthScale(2),
                        backgroundColor: theme.white,
                        borderRadius: moderateWidthScale(1),
                      }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {chatMode === "ai_chat_bot" ? (
              <AiChatContent
                theme={theme}
                styles={styles}
                messages={messages}
                inputText={inputText}
                setInputText={setInputText}
                isInputDisabled={isInputDisabled}
                handleSendMessage={handleSendMessage}
                flatListRef={flatListRef}
                isLoading={isLoading}
                isStreaming={isStreaming}
              />
            ) : (
              <VoiceReceptionistContent
                theme={theme}
                styles={styles}
                websocketUrl={VOICE_AGENT_WS_URL}
              />
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Expanded menu - two options above the button (only for customer/guest) */}
      {canShowMenu && menuExpanded && !isOpen && (
        <>
          <TouchableWithoutFeedback onPress={handleCloseMenu}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 997 }]} />
          </TouchableWithoutFeedback>
          <View style={styles.menuOptionsContainer}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectOption("ai_chat_bot")}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color={theme.white}
                />
              </View>
              <Text style={styles.menuOptionLabel}>
                {t("chatWithFreshy") || "Chat with Freshy"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectOption("ai_receptionist")}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <Ionicons name="mic-outline" size={22} color={theme.white} />
              </View>
              <Text style={styles.menuOptionLabel}>
                {t("talkWithFreshy") || "Talk with Freshy"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Floating AI Button - gentle float animation when chat closed */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.floatingButton,
            styles.shadow,
            {
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -moderateHeightScale(6)],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={menuExpanded ? handleCloseMenu : handleFloatingButtonPress}
            activeOpacity={0.9}
          >
            <View style={styles.aiIconContainer}>
              {menuExpanded ? (
                <CloseIcon width={22} height={22} color={theme.white} />
              ) : (
                <Image
                  source={IMAGES.femaleAgent}
                  style={styles.aiAgentImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
};

export default AiChatBot;
