import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { Theme } from "@/src/theme/colors";
import { CloseIcon, SendIcon, AiRobotIcon } from "@/assets/icons";
import { ChatMessage } from "@/src/state/slices/chatSlice";

export type ChatBoxStyles = Record<string, any>;

const TypingIndicator: React.FC<{
  theme: Theme;
  styles: ChatBoxStyles;
}> = ({ theme, styles }) => {
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
            { opacity: dot1Anim, transform: [{ scale: dot1Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { opacity: dot2Anim, transform: [{ scale: dot2Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { opacity: dot3Anim, transform: [{ scale: dot3Anim }] },
          ]}
        />
      </View>
    </View>
  );
};

const InlineTypingIndicator: React.FC<{ theme: Theme; styles: ChatBoxStyles }> = ({
  theme,
  styles,
}) => {
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.inlineTypingContainer}>
      <View style={styles.inlineTypingDots}>
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot1Anim, transform: [{ scale: dot1Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot2Anim, transform: [{ scale: dot2Anim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.inlineTypingDot,
            { opacity: dot3Anim, transform: [{ scale: dot3Anim }] },
          ]}
        />
      </View>
    </View>
  );
};

export type AiChatContentProps = {
  theme: Theme;
  styles: ChatBoxStyles;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (v: string) => void;
  isInputDisabled: boolean;
  handleSendMessage: () => void;
  flatListRef: React.RefObject<FlatList<ChatMessage> | null>;
  isLoading: boolean;
  isStreaming: boolean;
};

export const AiChatContent: React.FC<AiChatContentProps> = ({
  theme,
  styles,
  messages,
  inputText,
  setInputText,
  isInputDisabled,
  handleSendMessage,
  flatListRef,
  isLoading,
  isStreaming,
}) => {
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";
      if (isUser) {
        return (
          <View style={[styles.messageBubble, styles.userMessage]}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        );
      }
      const isEmptyAndStreaming = !item.text && item.isStreaming;
      return (
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiMessageIconContainer}>
            <AiRobotIcon width={16} height={16} color={theme.darkGreen} />
          </View>
          <View style={[styles.aiMessageBubble, styles.messageBubble]}>
            {isEmptyAndStreaming ? (
              <InlineTypingIndicator theme={theme} styles={styles} />
            ) : (
              <Text style={styles.aiMessageText}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [styles, theme],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const renderEmptyState = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.emptyContainer}>
        <AiRobotIcon width={50} height={50} color={theme.darkGreen} />
        <Text style={styles.emptyTitle}>AI Assistant</Text>
        <Text style={styles.emptySubtitle}>
          Ask me anything! I'm here to help you with questions, information, and
          assistance.
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );

  const listFooter = (() => {
    const lastMessage = messages[messages.length - 1];
    const hasEmptyStreamingMessage =
      lastMessage &&
      lastMessage.sender === "ai" &&
      !lastMessage.text &&
      lastMessage.isStreaming;
    if (hasEmptyStreamingMessage) return null;
    return isLoading || isStreaming ? (
      <TypingIndicator theme={theme} styles={styles} />
    ) : null;
  })();

  const renderInputRow = () => (
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
            isInputDisabled ? "AI is responding..." : "Ask me anything..."
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
  );

  if (messages.length === 0) {
    return (
      <>
        {renderEmptyState()}
        {renderInputRow()}
      </>
    );
  }

  return (
    <>
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
        ListFooterComponent={listFooter}
      />
      {renderInputRow()}
    </>
  );
};
