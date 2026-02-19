import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTranslation } from "react-i18next";
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
import { CloseIcon, SendIcon } from "@/assets/icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { ApiService } from "@/src/services/api";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import ImagePickerModal from "@/src/components/imagePickerModal";

const PER_PAGE = 20;
const MAX_ATTACHMENTS = 5;
const MESSAGES_URL = (userId: string) => `/api/chat/messages/${userId}`;
const SEND_MESSAGE_URL = "/api/chat/messages";

type MessageItem = {
  id: string;
  text: string;
  isMe: boolean;
  timeLabel: string;
  attachments?: string[];
};

type ApiMessage = {
  id: number;
  message: string | null;
  sender: { id: number; name: string; email?: string };
  attachments?: string[];
  created_at: string;
};

type MessagesResponse = {
  success: boolean;
  data: {
    data: ApiMessage[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
};

type SendMessageResponse = {
  success: boolean;
  message: string;
  data: ApiMessage;
};

function getMimeAndName(uri: string): { mimeType: string; name: string } {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  const name = uri.split("/").pop() || `image.${ext}`;
  return { mimeType, name };
}

function getMessageImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path ? `${base}/${path}` : "";
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = `${mins}`.padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

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
      backgroundColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(12),
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
      color: theme.white,
    },
    headerName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
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
    bubbleImage: {
      width: widthScale(160),
      height: heightScale(160),
      borderRadius: moderateWidthScale(8),
      marginTop: moderateHeightScale(6),
      backgroundColor: theme.galleryPhotoBack,
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
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen20,
    },
    textInput: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: heightScale(20),
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    attachmentButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: theme.lightGreen20,
      alignItems: "center",
      justifyContent: "center",
    },
    attachmentIconWrap: {
      transform: [{ rotate: "45deg" }],
    },
    sendButton: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: widthScale(40 / 2),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    inputClearButton: {
      paddingHorizontal: moderateWidthScale(4),
      justifyContent: "center",
      alignItems: "center",
    },
    attachmentThumbnailsRow: {
      backgroundColor: theme.white,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    attachmentThumbnailWrap: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.lightGreen20,
      marginVertical: moderateHeightScale(8),
    },
    attachmentThumbnail: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(6),
    },
    attachmentThumbnailDelete: {
      position: "absolute",
      top: -7,
      right: -7,
      width: widthScale(16),
      height: widthScale(16),
      borderRadius: widthScale(16 / 2),
      backgroundColor: theme.lightGreen,
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
  currentUserName: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onImagePress?: (uri: string, allUris?: string[]) => void;
  onAttachmentPress?: () => void;
  selectedAttachments?: string[];
  onRemoveAttachment?: (index: number) => void;
  inputValue?: string;
  onInputChange?: (text: string) => void;
  sending?: boolean;
  onSend?: () => void;
};

const ChatContent = ({
  messages,
  chatItem,
  styles,
  theme,
  insets,
  currentUserName,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  loadingMore,
  onImagePress,
  onAttachmentPress,
  selectedAttachments = [],
  onRemoveAttachment,
  inputValue = "",
  onInputChange,
  sending = false,
  onSend,
}: ChatContentProps) => {
  const hasInputValue = Boolean(inputValue && inputValue.trim().length > 0);
  const canSend = hasInputValue || selectedAttachments.length > 0;
  const sendDisabled = !canSend || sending;
  return (
    <>
      <FlatList
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContentContainer}
        data={messages}
        inverted={true}
        keyExtractor={(item) => item.id}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              colors={[theme.darkGreen]}
              tintColor={theme.darkGreen}
            />
          ) : undefined
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View
              style={{
                paddingVertical: moderateHeightScale(40),
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.darkGreen} />
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View
              style={{
                paddingVertical: moderateHeightScale(12),
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageRow,
              item.isMe ? styles.messageRowMe : styles.messageRowOther,
            ]}
          >
            <Text style={styles.senderLabel}>
              {item.isMe ? currentUserName : chatItem?.name}
            </Text>
            <View
              style={[
                styles.bubble,
                item.isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              {item.text ? (
                <Text
                  style={[styles.bubbleText, item.isMe && styles.bubbleTextMe]}
                >
                  {item.text}
                </Text>
              ) : null}
              {item.attachments?.map((uri, idx) => (
                <TouchableOpacity
                  key={`${item.id}-${idx}`}
                  onPress={() => onImagePress?.(uri, item.attachments)}
                  activeOpacity={0.9}
                >
                  <Image
                    style={[
                      styles.bubbleImage,
                      !item.text && idx === 0 && { marginTop: 0 },
                    ]}
                    source={{ uri }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
      {selectedAttachments.length > 0 ? (
        <View style={styles.attachmentThumbnailsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: moderateWidthScale(10),
              paddingHorizontal: moderateWidthScale(16),
            }}
          >
            {selectedAttachments.map((uri, idx) => (
              <View
                key={`${uri}-${idx}`}
                style={styles.attachmentThumbnailWrap}
              >
                <Image
                  style={styles.attachmentThumbnail}
                  source={{ uri }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.attachmentThumbnailDelete}
                  onPress={() => onRemoveAttachment?.(idx)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="close"
                    size={moderateWidthScale(10)}
                    color={theme.white}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View
        style={[
          styles.inputBarContainer,
          {
            paddingBottom: Math.max(insets.bottom, moderateHeightScale(8)),
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter message"
            placeholderTextColor={theme.lightGreen4}
            value={inputValue}
            onChangeText={onInputChange}
          />
          {hasInputValue ? (
            <TouchableOpacity
              style={styles.inputClearButton}
              onPress={() => onInputChange?.("")}
              activeOpacity={0.7}
              hitSlop={{
                top: moderateHeightScale(8),
                bottom: moderateHeightScale(8),
                left: moderateWidthScale(8),
                right: moderateWidthScale(8),
              }}
            >
              <CloseIcon color={theme.darkGreen} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.attachmentButton,
            sending && { opacity: 0.5 },
          ]}
          activeOpacity={0.8}
          onPress={() => onAttachmentPress?.()}
          disabled={sending}
        >
          <View style={styles.attachmentIconWrap}>
            <MaterialIcons
              name="attach-file"
              size={22}
              color={theme.darkGreen}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sendButton,
            sendDisabled && { opacity: 0.5 },
          ]}
          activeOpacity={0.8}
          onPress={onSend}
          disabled={sendDisabled}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <SendIcon width={18} height={18} color={theme.buttonText} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
};

export default function ChatBoxScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ chatItem?: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state: any) => state.user);
  const currentUserId = user?.id ?? null;
  const currentUserName = user?.name ?? "Me";
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const dispatch = useDispatch();
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

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

  const userId = params.id ?? chatItem?.id ?? "";

  const name = chatItem?.name || "Unknown";
  const image = chatItem?.image || "";

  const apiMessageToItem = useCallback(
    (m: ApiMessage): MessageItem => {
      const isMe = currentUserId != null && m.sender.id === currentUserId;
      const text = m.message ?? "";
      const attachments = (m.attachments ?? [])
        .map((u) => getMessageImageUrl(u))
        .filter(Boolean);
      return {
        id: String(m.id),
        text,
        isMe,
        timeLabel: formatMessageTime(m.created_at),
        attachments: attachments.length ? attachments : undefined,
      };
    },
    [currentUserId],
  );

  const fetchMessages = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!userId) return;
      try {
        if (append) setLoadingMore(true);
        else if (pageNum === 1) setLoading(true);
        const res = await ApiService.get<MessagesResponse>(
          MESSAGES_URL(userId),
          { params: { per_page: PER_PAGE, page: pageNum } },
        );
        const list = (res.data?.data ?? []).map(apiMessageToItem);
        setMessages((prev) => (append ? [...prev, ...list] : list));
        setPage(res.data?.meta?.current_page ?? pageNum);
        setLastPage(res.data?.meta?.last_page ?? 1);
      } catch {
        if (!append) setMessages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userId, apiMessageToItem],
  );

  useEffect(() => {
    if (userId) fetchMessages(1, false);
    else setLoading(false);
  }, [userId, fetchMessages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages(1, false);
  }, [fetchMessages]);

  const onLoadMore = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchMessages(page + 1, true);
  }, [loadingMore, loading, page, lastPage, fetchMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    const hasAttachments = selectedAttachments.length > 0;
    if (!userId || sending || (!trimmed && !hasAttachments)) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("receiver_id", String(Number(userId)));
      formData.append("message", trimmed || "");

      for (let i = 0; i < selectedAttachments.length; i++) {
        const uri = selectedAttachments[i];
        const { mimeType, name } = getMimeAndName(uri);
        formData.append("attachments[]", {
          uri,
          type: mimeType,
          name,
        } as any);
      }

      const res = await ApiService.post<SendMessageResponse>(
        SEND_MESSAGE_URL,
        formData,
        {
          headers: {
            "Content-Type": false as any,
          },
        },
      );

      if (res?.success && res?.data) {
        const newItem = apiMessageToItem(res.data);
        setMessages((prev) => [newItem, ...prev]);
        setInputText("");
        setSelectedAttachments([]);
      }
    } catch {
      showBanner(
        t("error") || "Error",
        t("somethingWentWrong") || "Something went wrong. Please try again.",
        "error",
        3000,
      );
    } finally {
      setSending(false);
    }
  }, [
    userId,
    inputText,
    selectedAttachments,
    sending,
    apiMessageToItem,
    showBanner,
    t,
  ]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const keyboardWillShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        },
      );
      const keyboardWillHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        },
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }
  }, []);

  const renderInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  };

  return (
    <View style={styles.main}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + moderateHeightScale(12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="keyboard-backspace"
            size={moderateWidthScale(24)}
            color={theme.white}
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
            currentUserName={currentUserName}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            onImagePress={(uri, allUris) =>
              dispatch(
                openFullImageModal({
                  images: allUris ?? [uri],
                  initialIndex: allUris ? allUris.indexOf(uri) : 0,
                }),
              )
            }
            onAttachmentPress={() => setImagePickerVisible(true)}
            selectedAttachments={selectedAttachments}
            onRemoveAttachment={(idx) =>
              setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            inputValue={inputText}
            onInputChange={setInputText}
            sending={sending}
            onSend={handleSend}
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
            currentUserName={currentUserName}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            onImagePress={(uri, allUris) =>
              dispatch(
                openFullImageModal({
                  images: allUris ?? [uri],
                  initialIndex: allUris ? allUris.indexOf(uri) : 0,
                }),
              )
            }
            onAttachmentPress={() => setImagePickerVisible(true)}
            selectedAttachments={selectedAttachments}
            onRemoveAttachment={(idx) =>
              setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            inputValue={inputText}
            onInputChange={setInputText}
            sending={sending}
            onSend={handleSend}
          />
        </View>
      )}
      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        allowsMultipleSelection
        onImageSelected={(uri) => {
          setSelectedAttachments((prev) => {
            if (prev.length >= MAX_ATTACHMENTS) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
              return prev;
            }
            return [...prev, uri];
          });
        }}
        onImagesSelected={(uris) => {
          setSelectedAttachments((prev) => {
            const remaining = MAX_ATTACHMENTS - prev.length;
            if (remaining <= 0) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
              return prev;
            }
            const toAdd = uris.slice(0, remaining);
            if (uris.length > remaining) {
              showBanner(
                t("limitExceeded"),
                t("collageMax6Images"),
                "error",
                3000,
              );
            }
            return [...prev, ...toAdd];
          });
        }}
      />
    </View>
  );
}
