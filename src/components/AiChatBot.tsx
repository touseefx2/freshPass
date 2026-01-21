import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
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
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  widthScale,
  heightScale,
  moderateWidthScale,
  moderateHeightScale,
} from "@/src/theme/dimensions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SendIcon, CloseIcon, AiRobotIcon } from "@/assets/icons";
import {
  toggleChat,
  closeChat,
  sendMessageAndGetResponse,
  receiveAiResponse,
  ChatMessage,
} from "@/src/state/slices/chatSlice";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_BOX_WIDTH = SCREEN_WIDTH * 0.85;
const CHAT_BOX_HEIGHT = SCREEN_HEIGHT * 0.6;

const createStyles = (theme: Theme, bottomInset: number) =>
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
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    floatingButton: {
      position: "absolute",
      bottom: moderateHeightScale(70) + bottomInset,
      right: moderateWidthScale(16),
      width: widthScale(45),
      height: widthScale(45),
      borderRadius: widthScale(45 / 2),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
    aiIconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    chatBoxContainer: {
      position: "absolute",
      bottom: moderateHeightScale(70) + bottomInset,
      right: moderateWidthScale(16),
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
      paddingVertical: moderateHeightScale(10),
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
    closeButton: {
      width: widthScale(32),
      alignItems: "flex-end"
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(14),
    },
    messagesContent: {
      paddingVertical: moderateHeightScale(16),
    },
    messageBubble: {
      maxWidth: "85%",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      marginBottom: moderateHeightScale(8),
    },
    userMessage: {
      alignSelf: "flex-end",
      backgroundColor: theme.buttonBack,
      borderBottomRightRadius: moderateWidthScale(4),
    },
    aiMessage: {
      alignSelf: "flex-start",
      backgroundColor: theme.lightGreen1,
      borderBottomLeftRadius: moderateWidthScale(4),
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
      paddingVertical: moderateHeightScale(12),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
      backgroundColor: theme.background,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      maxHeight: heightScale(100),
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sendButton: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: widthScale(21),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.buttonBack,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.3,
      shadowRadius: moderateWidthScale(4),
      elevation: 3,
    },
    sendButtonDisabled: {
      opacity: 0.4,
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
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(16),
      borderBottomLeftRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
    },
    typingDot: {
      width: widthScale(6),
      height: widthScale(6),
      borderRadius: widthScale(3),
      backgroundColor: theme.lightGreen,
      marginHorizontal: moderateWidthScale(2),
    },
  });

// Static AI responses for now
const AI_RESPONSES = [
  "Hello! How can I help you today?",
  "I'm here to assist you with any questions about our services.",
  "That's a great question! Let me help you with that.",
  "I understand. Is there anything else you'd like to know?",
  "Thank you for your message. I'm processing your request.",
  "I'd be happy to help you find the perfect service for your needs.",
];

const TypingIndicator: React.FC<{ theme: Theme; bottomInset: number }> = ({ theme, bottomInset }) => {
  const styles = useMemo(() => createStyles(theme, bottomInset), [theme, bottomInset]);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateDots();
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View
        style={[
          styles.typingDot,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot1Anim, 0.5)) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot2Anim, 0.5)) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot3Anim, 0.5)) }] },
        ]}
      />
    </View>
  );
};

const AiChatBot: React.FC = () => {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const styles = useMemo(() => createStyles(theme, bottomInset), [theme, bottomInset]);

  const { isOpen, messages, isLoading } = useAppSelector((state) => state.chat);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chatBoxAnim = useRef(new Animated.Value(0)).current;

  // Animate chat box open/close
  useEffect(() => {
    Animated.spring(chatBoxAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOpen, chatBoxAnim]);

  // Animate button press
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleToggleChat = useCallback(() => {
    dispatch(toggleChat());
  }, [dispatch]);

  const handleCloseChat = useCallback(() => {
    Keyboard.dismiss();
    dispatch(closeChat());
  }, [dispatch]);

  const handleSendMessage = useCallback(() => {
    if (inputText.trim().length === 0) return;

    const messageText = inputText.trim();
    setInputText("");
    dispatch(sendMessageAndGetResponse(messageText));

    // Simulate AI response after delay (static for now)
    setTimeout(() => {
      const randomResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
      dispatch(receiveAiResponse(randomResponse));
    }, 1500);
  }, [inputText, dispatch]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";
      return (
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessage : styles.aiMessage,
          ]}
        >
          <Text
            style={isUser ? styles.userMessageText : styles.aiMessageText}
          >
            {item.text}
          </Text>
        </View>
      );
    },
    [styles]
  );

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>

        <AiRobotIcon width={50} height={50} color={theme.darkGreen} />

        <Text style={styles.emptyTitle}>AI Assistant</Text>
        <Text style={styles.emptySubtitle}>
          Ask me anything! I'm here to help you with questions, information, and assistance.
        </Text>
      </View>
    );
  }

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
        <Animated.View style={[styles.chatBoxContainer, chatBoxAnimStyle, styles.shadow]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? moderateHeightScale(100) : 0}
          >
            {/* Header with AI Assistant title and close button */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatarHeader}>
                  <AiRobotIcon width={24} height={24} color={theme.white} />
                </View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseChat}
                activeOpacity={0.7}
              >
                <CloseIcon width={20} height={20} color={theme.white} />
              </TouchableOpacity>
            </View>

            {/* Messages List */}
            {messages.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  isLoading ? <TypingIndicator theme={theme} bottomInset={bottomInset} /> : null
                }
              />
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask me anything..."
                placeholderTextColor={theme.lightGreen}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={5000}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim().length === 0 && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={inputText.trim().length === 0}
                activeOpacity={0.8}
              >
                <SendIcon width={20} height={20} color={theme.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Floating AI Button - always shows robot icon, stays in place */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.shadow]}
          onPress={handleToggleChat}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.aiIconContainer}>
            <AiRobotIcon width={25} height={25} color={theme.white} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

export default AiChatBot;
