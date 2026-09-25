import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { Modalize } from "react-native-modalize";
import { Portal } from "@gorhom/portal";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  deleteReelComment,
  listReelComments,
  postReelComment,
} from "@/src/services/reelsService";
import type { ReelComment } from "@/src/types/reels";
import { resolveApiImageUrl } from "@/src/utils/media";

const COMMENT_MAX_LENGTH = 1000;
const SCREEN_HEIGHT = Dimensions.get("window").height;

interface ReelCommentsSheetProps {
  visible: boolean;
  onClose: () => void;
  reelId: number | null;
  initialCount?: number;
  /** Keeps the feed's comment badge in sync with the server total. */
  onCountChange?: (reelId: number, total: number) => void;
  /** Parent owns the report sheet so both sheets never stack. */
  onReportComment?: (commentId: number) => void;
}

function formatCommentTime(iso: string, t: (k: string) => string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (seconds < 60) return t("justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.lightGreen5,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.white,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: moderateHeightScale(22),
      paddingBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
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
      width: widthScale(18),
      height: widthScale(18),
      borderRadius: moderateWidthScale(9),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    avatar: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      backgroundColor: theme.grey15,
    },
    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
    },
    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    author: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
    },
    time: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    body: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    rowAction: {
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(6),
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      gap: moderateHeightScale(6),
    },
    emptyTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptySubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(12),
      backgroundColor: theme.white,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: moderateWidthScale(10),
    },
    input: {
      flex: 1,
      minHeight: moderateHeightScale(44),
      maxHeight: moderateHeightScale(110),
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(22),
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(12),
      paddingBottom: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.background,
    },
    sendButton: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    guestPrompt: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingVertical: moderateHeightScale(8),
    },
    guestText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    guestButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.buttonBack,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function ReelCommentsSheet({
  visible,
  onClose,
  reelId,
  initialCount = 0,
  onCountChange,
  onReportComment,
}: ReelCommentsSheetProps) {
  const modalizeRef = useRef<Modalize>(null);
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { showBanner } = useNotificationContext();

  const isGuest = user.isGuest || !user.accessToken;

  const [comments, setComments] = useState<ReelComment[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);

  const emitCount = useCallback(
    (next: number) => {
      setTotal(next);
      if (reelId != null) onCountChange?.(reelId, next);
    },
    [onCountChange, reelId],
  );

  const loadFirstPage = useCallback(async () => {
    if (reelId == null) return;
    setLoading(true);
    try {
      const { comments: items, meta } = await listReelComments(reelId);
      setComments(items);
      cursorRef.current = meta.next_cursor ?? null;
      hasMoreRef.current = !!meta.has_more;
      if (typeof meta.total === "number") emitCount(meta.total);
    } catch (error: any) {
      Logger.error(`Failed to load comments for reel ${reelId}:`, error);
      showBanner(
        t("error"),
        error?.message || t("failedToLoadComments"),
        "error",
        3000,
      );
    } finally {
      setLoading(false);
    }
  }, [emitCount, reelId, showBanner, t]);

  const loadMore = useCallback(async () => {
    if (reelId == null || !hasMoreRef.current || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const { comments: items, meta } = await listReelComments(reelId, {
        cursor: cursorRef.current ?? undefined,
      });
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...items.filter((c) => !seen.has(c.id))];
      });
      cursorRef.current = meta.next_cursor ?? null;
      hasMoreRef.current = !!meta.has_more;
    } catch (error) {
      Logger.error(`Failed to load more comments for reel ${reelId}:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, reelId]);

  useEffect(() => {
    if (visible) {
      setTotal(initialCount);
      setDraft("");
      setComments([]);
      cursorRef.current = null;
      hasMoreRef.current = false;
      void loadFirstPage();
      setTimeout(() => modalizeRef.current?.open(), 100);
    } else {
      modalizeRef.current?.close();
    }
    // `initialCount` intentionally excluded: it would reset the list on every count bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reelId]);

  const handlePost = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting || reelId == null) return;
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    if (body.length > COMMENT_MAX_LENGTH) {
      showBanner(t("error"), t("commentTooLong"), "error", 3000);
      return;
    }
    setPosting(true);
    try {
      const created = await postReelComment(reelId, body);
      setComments((prev) => [created, ...prev]);
      emitCount(total + 1);
      setDraft("");
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 429) {
        // Keep the draft so the user can retry in a moment.
        showBanner(t("error"), t("commentRateLimited"), "error", 3000);
      } else {
        const message =
          error?.response?.data?.errors?.body?.[0] ||
          error?.response?.data?.message ||
          error?.message ||
          t("failedToPostComment");
        showBanner(t("error"), message, "error", 3000);
      }
    } finally {
      setPosting(false);
    }
  }, [
    dispatch,
    draft,
    emitCount,
    isGuest,
    posting,
    reelId,
    showBanner,
    t,
    total,
  ]);

  const handleDelete = useCallback(
    (comment: ReelComment) => {
      if (reelId == null) return;
      Alert.alert(t("deleteComment"), t("deleteCommentConfirm"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            const previous = comments;
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
            emitCount(Math.max(0, total - 1));
            try {
              await deleteReelComment(reelId, comment.id);
            } catch (error: any) {
              const status = error?.response?.status ?? error?.status;
              // 404 = already gone; leave it removed locally.
              if (status === 404) return;
              setComments(previous);
              emitCount(total);
              showBanner(
                t("error"),
                error?.message || t("failedToDeleteComment"),
                "error",
                3000,
              );
            }
          },
        },
      ]);
    },
    [comments, emitCount, reelId, showBanner, t, total],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReelComment }) => {
      const avatar = resolveApiImageUrl(item.user?.avatar_url);
      return (
        <View style={styles.row}>
          {avatar ? (
            <AppImage uri={avatar} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MaterialIcons
                name="person"
                size={iconScale(18)}
                color={theme.lightGreen}
              />
            </View>
          )}
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.author} numberOfLines={1}>
                {item.user?.name || ""}
              </Text>
              <Text style={styles.time}>
                {formatCommentTime(item.created_at, t)}
              </Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </View>
          {item.is_mine ? (
            <TouchableOpacity
              style={styles.rowAction}
              onPress={() => handleDelete(item)}
              hitSlop={8}
            >
              <MaterialIcons
                name="delete-outline"
                size={iconScale(18)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
          ) : onReportComment ? (
            <TouchableOpacity
              style={styles.rowAction}
              onPress={() =>
                isGuest
                  ? dispatch(setGuestModeModalVisible(true))
                  : onReportComment(item.id)
              }
              hitSlop={8}
            >
              <MaterialIcons
                name="flag"
                size={iconScale(16)}
                color={theme.lightGreen}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [
      dispatch,
      handleDelete,
      isGuest,
      onReportComment,
      styles,
      t,
      theme.lightGreen,
    ],
  );

  const canSend = draft.trim().length > 0 && !posting;

  const sheet = (
    <Modalize
      ref={modalizeRef}
      onClosed={onClose}
      modalHeight={SCREEN_HEIGHT * 0.75}
      handlePosition="inside"
      withOverlay
      closeOnOverlayTap
      panGestureEnabled
      avoidKeyboardLikeIOS
      overlayStyle={styles.overlay}
      modalStyle={styles.sheet}
      HeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {total > 0 ? `${t("comments")} (${total})` : t("comments")}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={iconScale(12)} color={theme.darkGreen} />
          </Pressable>
        </View>
      }
      FooterComponent={
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
        >
          {isGuest ? (
            <TouchableOpacity
              style={styles.guestPrompt}
              onPress={() => dispatch(setGuestModeModalVisible(true))}
            >
              <Text style={styles.guestText}>{t("signInToComment")}</Text>
              <Text style={styles.guestButtonText}>
                {t("signInOrRegister")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={t("addComment")}
                placeholderTextColor={theme.lightGreen}
                multiline
                maxLength={COMMENT_MAX_LENGTH}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={handlePost}
                disabled={!canSend}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <MaterialIcons
                    name="send"
                    size={iconScale(18)}
                    color={theme.white}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      }
      flatListProps={{
        data: comments,
        extraData: comments,
        keyExtractor: (item: ReelComment) => String(item.id),
        renderItem,
        contentContainerStyle: styles.listContent,
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: "handled",
        onEndReachedThreshold: 0.4,
        onEndReached: loadMore,
        ListEmptyComponent: loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.darkGreen} />
          </View>
        ) : (
          <View style={styles.center}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={iconScale(32)}
              color={theme.lightGreen2}
            />
            <Text style={styles.emptyTitle}>{t("noCommentsYet")}</Text>
            <Text style={styles.emptySubtitle}>{t("noCommentsSubtitle")}</Text>
          </View>
        ),
        ListFooterComponent: loadingMore ? (
          <ActivityIndicator
            style={styles.footerLoader}
            size="small"
            color={theme.darkGreen}
          />
        ) : null,
      }}
    />
  );

  return <Portal>{sheet}</Portal>;
}
