import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Keyboard,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SendIcon } from "@/assets/icons";
import { MaterialIcons } from "@expo/vector-icons";

type MessageItem = {
  id: string;
  text: string;
  isMe: boolean;
  timeLabel: string;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    main: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      backgroundColor: theme.background,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      marginRight: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
    },
    headerInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerAvatar: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(36 / 2),
      backgroundColor: theme.galleryPhotoBack,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(10),
      overflow: "hidden",
    },
    headerAvatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(36 / 2),
      overflow: "hidden",
    },
    headerInitials: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    headerName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    sepLine: {
      width: "100%",
      height: 1,
      backgroundColor: theme.borderLight,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
    },
    messageRow: {
      marginBottom: moderateHeightScale(10),
      maxWidth: "80%",
    },
    messageRowMe: {
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    messageRowOther: {
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    bubble: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(18),
    },
    bubbleMe: {
      backgroundColor: theme.orangeBrown,
      borderBottomRightRadius: moderateWidthScale(4),
    },
    bubbleOther: {
      backgroundColor: theme.lightGreen05,
      borderBottomLeftRadius: moderateWidthScale(4),
    },
    bubbleText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    bubbleTextMe: {
      color: theme.darkGreen,
    },
    senderLabel: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginBottom: moderateHeightScale(4),
    },
    inputBarContainer: {
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(8),
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    inputRow: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen20,
    },
    textInput: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      height: heightScale(20),
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    sendButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
  });

type ChatContentProps = {
  messages: MessageItem[];
  chatItem: {
    id: string;
    name: string;
    image: string;
    message?: string;
    timeLabel?: string;
  } | null;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  insets: { bottom: number };
};

const ChatContent = ({
  messages,
  chatItem,
  styles,
  theme,
  insets,
}: ChatContentProps) => {
  return (
    <>
      <FlatList
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContentContainer}
        data={messages}
        inverted={true}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageRow,
              item.isMe ? styles.messageRowMe : styles.messageRowOther,
            ]}
          >
            <Text style={styles.senderLabel}>
              {item.isMe ? "Brentley" : chatItem?.name}
            </Text>
            <View
              style={[
                styles.bubble,
                item.isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <Text
                style={[styles.bubbleText, item.isMe && styles.bubbleTextMe]}
              >
                {item.text}
              </Text>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
      <View
        style={[
          styles.inputBarContainer,
          {
            marginBottom: Math.max(insets.bottom, moderateHeightScale(8)),
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter message"
            placeholderTextColor={theme.lightGreen4}
          />
        </View>
        <TouchableOpacity style={styles.sendButton} activeOpacity={0.8}>
          <SendIcon width={18} height={18} color={theme.buttonText} />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default function ChatBoxScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ chatItem?: string }>();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Parse chat item from params
  const chatItem = useMemo(() => {
    if (params.chatItem) {
      try {
        return JSON.parse(params.chatItem) as {
          id: string;
          name: string;
          image: string;
          message?: string;
          timeLabel?: string;
        };
      } catch {
        return null;
      }
    }
    return null;
  }, [params.chatItem]);

  const name = chatItem?.name || "Unknown";
  const image = chatItem?.image || "";

  useEffect(() => {
    if (Platform.OS === "android") {
      const keyboardWillShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const keyboardWillHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }
  }, []);

  const messages: MessageItem[] = [
    {
      id: "1",
      text: "Hello! Morning, how are you doing?",
      isMe: true,
      timeLabel: "9:30 AM",
    },
    {
      id: "2",
      text: "Good mrng",
      isMe: false,
      timeLabel: "9:32 AM",
    },
    // {
    //   id: "3",
    //   text: "Hello! Morning, how are you doing?",
    //   isMe: true,
    //   timeLabel: "9:30 AM",
    // },
    // {
    //   id: "4",
    //   text: "Good mrng",
    //   isMe: false,
    //   timeLabel: "9:32 AM",
    // },
    // {
    //   id: "5",
    //   text: "Hello! Morning, how are you doing?",
    //   isMe: true,
    //   timeLabel: "9:30 AM",
    // },
    // {
    //   id: "6",
    //   text: "Good mrng",
    //   isMe: false,
    //   timeLabel: "9:32 AM",
    // },
    // {
    //   id: "7",
    //   text: "Hello! Morning, how are you doing?",
    //   isMe: true,
    //   timeLabel: "9:30 AM",
    // },
    // {
    //   id: "8",
    //   text: "Good mrng",
    //   isMe: false,
    //   timeLabel: "9:32 AM",
    // },
    // {
    //   id: "9",
    //   text: "Hello! Morning, how are you doing?",
    //   isMe: true,
    //   timeLabel: "9:30 AM",
    // },
    // {
    //   id: "10",
    //   text: "Good mrng",
    //   isMe: false,
    //   timeLabel: "9:32 AM",
    // },
  ];

  const renderInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.main} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="keyboard-backspace"
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            {image ? (
              <Image style={styles.headerAvatarImage} source={{ uri: image }} />
            ) : (
              <Text style={styles.headerInitials}>{renderInitials(name)}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.headerName}>
            {name}
          </Text>
        </View>
      </View>
      <View style={styles.sepLine} />
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <ChatContent
            messages={messages}
            chatItem={chatItem}
            styles={styles}
            theme={theme}
            insets={insets}
          />
        </KeyboardAvoidingView>
      ) : (
        <View
          style={[
            styles.container,
            {
              paddingBottom: keyboardHeight,
            },
          ]}
        >
          <ChatContent
            messages={messages}
            chatItem={chatItem}
            styles={styles}
            theme={theme}
            insets={insets}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
