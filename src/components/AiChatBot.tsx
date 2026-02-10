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
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Dimensions,
  Easing,
  Alert,
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
import {
  SendIcon,
  CloseIcon,
  AiRobotIcon,
  AiReceptionistIcon,
} from "@/assets/icons";
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

const CHAT_BOTTOM_OFFSET = 70;
const CHAT_BOTTOM_OFFSET_TRYON = 115; // when isFirstShowTryOn is true

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
      backgroundColor: theme.darkGreen,
      borderWidth: 0.5,
      borderColor: theme.white85,
    },
    buttonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: widthScale(27),
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
      backgroundColor: theme.darkGreen,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderTopColor: theme.white85,
      borderLeftColor: theme.white85,
      borderRightColor: theme.shadow,
      borderBottomColor: theme.shadow,
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
      height: CHAT_BOX_HEIGHT,
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
  });

const TypingIndicator: React.FC<{ theme: Theme; bottomInset: number }> = ({
  theme,
  bottomInset,
}) => {
  const styles = useMemo(
    () => createStyles(theme, bottomInset),
    [theme, bottomInset],
  );
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate typing dots with smooth wave effect
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot1Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot2Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot3Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
        ]),
      ).start();
    };

    // Animate icon pulse
    const animateIcon = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(iconPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      ).start();
    };

    animateDots();
    animateIcon();
  }, [dot1Anim, dot2Anim, dot3Anim, iconPulseAnim]);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View
        style={[
          styles.typingIconContainer,
          { transform: [{ scale: iconPulseAnim }] },
        ]}
      >
        <AiRobotIcon width={18} height={18} color={theme.darkGreen} />
      </Animated.View>
      <View style={styles.typingDotsContainer}>
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot1Anim,
              transform: [{ scale: dot1Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot2Anim,
              transform: [{ scale: dot2Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            {
              opacity: dot3Anim,
              transform: [{ scale: dot3Anim }],
            },
          ]}
        />
      </View>
    </View>
  );
};

// Inline typing indicator for empty streaming messages
const InlineTypingIndicator: React.FC<{ theme: Theme }> = ({ theme }) => {
  const styles = useMemo(() => createStyles(theme, 0), [theme]);
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Animate typing dots with smooth wave effect
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot1Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot2Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(dot3Anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.in(Easing.cubic),
            }),
          ]),
        ]),
      ).start();
    };

    animateDots();
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.inlineTypingContainer}>
      <View style={styles.inlineTypingDots}>
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot1Anim,
              transform: [{ scale: dot1Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot2Anim,
              transform: [{ scale: dot2Anim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            {
              opacity: dot3Anim,
              transform: [{ scale: dot3Anim }],
            },
          ]}
        />
      </View>
    </View>
  );
};

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
  const { userRole, isGuest } = useAppSelector((state) => state.user);
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

  // Animation refs - only spin in place (no bounce, no scale)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const chatBoxAnim = useRef(new Animated.Value(0)).current;

  // Continuous 360° spin in place when menu is not expanded
  useEffect(() => {
    if (menuExpanded) {
      rotateAnim.setValue(0);
      return;
    }
    const spinAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [rotateAnim, menuExpanded]);

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

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";

      if (isUser) {
        // User message - no icon needed
        return (
          <View style={[styles.messageBubble, styles.userMessage]}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        );
      }

      // AI message - with icon on left
      const isEmptyAndStreaming = !item.text && item.isStreaming;

      return (
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiMessageIconContainer}>
            <AiRobotIcon width={16} height={16} color={theme.darkGreen} />
          </View>
          <View style={[styles.aiMessageBubble, styles.messageBubble]}>
            {isEmptyAndStreaming ? (
              <InlineTypingIndicator theme={theme} />
            ) : (
              <Text style={styles.aiMessageText}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [styles, theme],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const renderEmptyState = () => {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.emptyContainer}>
          <AiRobotIcon width={50} height={50} color={theme.darkGreen} />
          <Text style={styles.emptyTitle}>AI Assistant</Text>
          <Text style={styles.emptySubtitle}>
            Ask me anything! I'm here to help you with questions, information,
            and assistance.
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

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
            {/* Header with AI Assistant title and action buttons */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatarHeader}>
                  <AiRobotIcon width={24} height={24} color={theme.white} />
                </View>
                <Text style={styles.headerTitle}>
                  {chatMode === "ai_chat_bot"
                    ? t("aiChatBot")
                    : t("aiReceptionist")}
                </Text>
              </View>
              <View style={styles.headerRightButtons}>
                {/* Delete button - clears all messages (only show when messages exist) */}
                {messages.length > 0 && (
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
                      {/* Trash can icon */}
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
                        {/* Trash lid */}
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
                        {/* Trash handle */}
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
                        {/* Trash lines */}
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
                {/* Minimize button - closes chat */}
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
                    {/* Minimize icon - horizontal line */}
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

            {/* Messages List */}
            {messages.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={dismissKeyboard}
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={(() => {
                  // Check if last message is empty and streaming (shows inline typing indicator)
                  const lastMessage = messages[messages.length - 1];
                  const hasEmptyStreamingMessage =
                    lastMessage &&
                    lastMessage.sender === "ai" &&
                    !lastMessage.text &&
                    lastMessage.isStreaming;

                  // Only show bottom indicator if not showing inline indicator
                  if (hasEmptyStreamingMessage) {
                    return null;
                  }

                  // Show bottom indicator when loading or streaming (but no empty message)
                  return isLoading || isStreaming ? (
                    <TypingIndicator theme={theme} bottomInset={bottomInset} />
                  ) : null;
                })()}
              />
            )}

            {/* Input Area */}
            <View
              style={[
                styles.inputContainer,
                isInputDisabled && styles.inputContainerDisabled,
              ]}
            >
              <View
                style={[
                  styles.textInputWrapper,
                  styles.shadowLight,
                  isInputDisabled && styles.inputWrapperDisabled,
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    isInputDisabled && styles.textInputDisabled,
                  ]}
                  placeholder={
                    isInputDisabled
                      ? "AI is responding..."
                      : "Ask me anything..."
                  }
                  placeholderTextColor={theme.lightGreen2}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={5000}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  editable={!isInputDisabled}
                />
                {inputText.length > 0 && !isInputDisabled && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setInputText("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseIcon width={16} height={16} color={theme.darkGreen} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (inputText.trim().length === 0 || isInputDisabled) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={inputText.trim().length === 0 || isInputDisabled}
                activeOpacity={0.8}
              >
                <SendIcon width={16} height={16} color={theme.white} />
              </TouchableOpacity>
            </View>
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
                <AiRobotIcon width={22} height={22} color={theme.white} />
              </View>
              <Text style={styles.menuOptionLabel}>{t("aiChatBot")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectOption("ai_receptionist")}
              activeOpacity={0.9}
            >
              <View style={styles.menuOptionIcon}>
                <AiReceptionistIcon width={22} height={22} />
              </View>
              <Text style={styles.menuOptionLabel}>{t("aiReceptionist")}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Floating AI Button - robot icon or cross when menu expanded */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.floatingButton,
            styles.shadow,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
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
                <AiRobotIcon width={22} height={22} color={theme.white} />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
};

export default AiChatBot;
