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
import { SendIcon, CloseIcon } from "@/assets/icons";
import {
  toggleChat,
  closeChat,
  sendMessageAndGetResponse,
  receiveAiResponse,
  ChatMessage,
} from "@/src/state/slices/chatSlice";

const CHAT_BOX_HEIGHT = heightScale(450);
const CHAT_BOX_WIDTH = widthScale(320);

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
      backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    floatingButton: {
      position: "absolute",
      bottom: moderateHeightScale(100) + bottomInset,
      right: moderateWidthScale(16),
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(28),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.3,
      shadowRadius: moderateWidthScale(8),
      elevation: 8,
      zIndex: 1000,
    },
    closeButtonFloating: {
      position: "absolute",
      bottom: moderateHeightScale(100) + bottomInset,
      right: moderateWidthScale(16),
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: widthScale(28),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(4) },
      shadowOpacity: 0.3,
      shadowRadius: moderateWidthScale(8),
      elevation: 8,
      zIndex: 1000,
    },
    aiIconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    aiIconText: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    chatBoxContainer: {
      position: "absolute",
      bottom: moderateHeightScale(170) + bottomInset,
      right: moderateWidthScale(16),
      width: CHAT_BOX_WIDTH,
      height: CHAT_BOX_HEIGHT,
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(8) },
      shadowOpacity: 0.25,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
      overflow: "hidden",
      zIndex: 999,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      backgroundColor: theme.buttonBack,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    aiAvatar: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    aiAvatarText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    headerTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    closeButton: {
      padding: moderateWidthScale(4),
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(12),
    },
    messagesContent: {
      paddingVertical: moderateHeightScale(12),
    },
    messageBubble: {
      maxWidth: "85%",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      marginBottom: moderateHeightScale(6),
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
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
    },
    aiMessageText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      gap: moderateWidthScale(10),
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(18),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(8),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      maxHeight: heightScale(80),
    },
    sendButton: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyIcon: {
      width: widthScale(60),
      height: widthScale(60),
      borderRadius: widthScale(30),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(12),
    },
    emptyIconText: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    emptyTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(6),
    },
    emptySubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    typingIndicator: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.lightGreen1,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(12),
      borderBottomLeftRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(6),
    },
    typingDot: {
      width: widthScale(5),
      height: widthScale(5),
      borderRadius: widthScale(2.5),
      backgroundColor: theme.lightGreen,
      marginHorizontal: moderateWidthScale(2),
    },
    characterCount: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingBottom: moderateHeightScale(6),
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

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>AI</Text>
        </View>
        <Text style={styles.emptyTitle}>AI Assistant</Text>
        <Text style={styles.emptySubtitle}>
          Ask me anything! I'm here to help you with questions, information, and assistance.
        </Text>
      </View>
    );
  }, [styles]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const chatBoxAnimStyle = {
    opacity: chatBoxAnim,
    transform: [
      {
        scale: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
      {
        translateY: chatBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <>
      {/* Overlay when chat is open */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={handleCloseChat}>
          <View style={styles.container}>
            <View style={styles.overlay} />
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Chat Box - positioned above the button */}
      {isOpen && (
        <Animated.View style={[styles.chatBoxContainer, chatBoxAnimStyle]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? moderateHeightScale(100) : 0}
          >
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>AI</Text>
                </View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseChat}
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
              >
                <SendIcon width={18} height={18} color={theme.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.characterCount}>
              {inputText.length}/5000 characters
            </Text>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Floating AI Button / Close Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={isOpen ? styles.closeButtonFloating : styles.floatingButton}
          onPress={handleToggleChat}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {isOpen ? (
            <CloseIcon width={24} height={24} color={theme.white} />
          ) : (
            <View style={styles.aiIconContainer}>
              <Text style={styles.aiIconText}>AI</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

export default AiChatBot;
