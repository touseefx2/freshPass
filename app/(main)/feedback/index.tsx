import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  getJobErrorMessage,
  getJobErrorStatus,
  getJobFieldErrors,
} from "@/src/utils/jobHelpers";
import {
  FEEDBACK_NAME_MAX,
  FEEDBACK_REMARKS_MAX,
  fetchFeedbackHistory,
  submitFeedback,
  type FeedbackItem,
} from "@/src/services/feedbackService";

/**
 * Feedback (client sample 11-23): name + remarks → admin email, with the
 * user's past feedback below. Opened from Account settings for business,
 * solo, staff and customers. Stack screen, so no bottom tab bar.
 */

type Errors = { name?: string; remarks?: string };

// Sizes and colours measured from the client sample (11-23). Body text
// (intro, inputs, dates) uses the phone's system font like the sample;
// labels, title and button keep the app's bold font.
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.feedbackPage },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
    },
    intro: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size21,
      color: theme.feedbackBody,
      paddingHorizontal: moderateWidthScale(4),
      marginBottom: moderateHeightScale(14),
    },
    // Same colour as the page: only the thin edge + bottom shadow lift it
    card: {
      backgroundColor: theme.feedbackPage,
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.feedbackCardBorder,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: moderateHeightScale(2) },
      shadowOpacity: 0.12,
      shadowRadius: moderateWidthScale(4),
      elevation: 3,
    },
    formCard: {
      paddingHorizontal: moderateWidthScale(14),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(16),
    },
    label: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(8),
    },
    labelGap: { marginTop: moderateHeightScale(16) },
    input: {
      minHeight: heightScale(44),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.feedbackInputBorder,
      backgroundColor: theme.feedbackInput,
      paddingHorizontal: moderateWidthScale(12),
      fontSize: fontSize.size15,
      color: theme.feedbackBody,
    },
    inputMultiline: {
      minHeight: heightScale(100),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(10),
      textAlignVertical: "top",
    },
    inputError: { borderColor: theme.red },
    errorText: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    sendButton: {
      marginTop: moderateHeightScale(14),
      minHeight: heightScale(46),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.sendTan,
      alignItems: "center",
      justifyContent: "center",
    },
    sendDisabled: { opacity: 0.6 },
    sendLabel: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    historyTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(4),
      marginTop: moderateHeightScale(24),
      marginBottom: moderateHeightScale(12),
    },
    historyCard: {
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(3),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(13),
      minHeight: heightScale(50),
      paddingVertical: moderateHeightScale(9),
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: theme.feedbackDivider,
    },
    dateTile: {
      width: widthScale(30),
      height: widthScale(30),
      borderRadius: moderateWidthScale(7),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    dateText: {
      flex: 1,
      fontSize: fontSize.size15,
      color: theme.feedbackBody,
      textDecorationLine: "underline",
    },
    detail: {
      marginLeft: widthScale(30) + moderateWidthScale(13),
      marginBottom: moderateHeightScale(10),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.feedbackDivider,
      backgroundColor: theme.feedbackInput,
      gap: moderateHeightScale(4),
    },
    detailName: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    detailText: {
      fontSize: fontSize.size15,
      color: theme.feedbackBody,
      lineHeight: fontSize.size21,
    },
    empty: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(12),
    },
    moreButton: {
      minHeight: heightScale(44),
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
    },
    moreText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textDecorationLine: "underline",
    },
    emptyText: {
      fontSize: fontSize.size15,
      color: theme.feedbackPlaceholder,
      textAlign: "center",
      lineHeight: fontSize.size21,
    },
  });

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const remarksRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [historyState, setHistoryState] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadHistory = useCallback(() => {
    setHistoryState("loading");
    fetchFeedbackHistory(1)
      .then((res) => {
        setHistory(res.items);
        setHasMore(res.hasMore);
        setPage(1);
        setHistoryState("ready");
      })
      .catch(() => setHistoryState("failed"));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeedbackHistory(page + 1);
      // Skip rows already shown (a new send shifts the pages)
      setHistory((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
      });
      setHasMore(res.hasMore);
      setPage(page + 1);
    } catch (err: any) {
      if (!err?.isNoInternet) {
        showBanner(t("error"), t("feedbackHistoryFailed"), "error");
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    Keyboard.dismiss();
    if (sending) return;
    const next: Errors = {
      name: name.trim() ? undefined : t("feedbackNameRequired"),
      remarks: remarks.trim() ? undefined : t("feedbackRemarksRequired"),
    };
    if (next.name || next.remarks) {
      setErrors(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSending(true);
    try {
      const item = await submitFeedback({ name, remarks });
      // History never loaded (or no row came back): fetch it again instead
      // of showing only the new row with the older ones hidden
      if (item && historyState === "ready") {
        setHistory((prev) => [item, ...prev]);
      } else {
        loadHistory();
      }
      setName("");
      setRemarks("");
      setErrors({});
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showBanner(t("success"), t("feedbackSent"), "success");
    } catch (err: any) {
      if (err?.isNoInternet) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const fieldErrors = getJobFieldErrors(err);
      if (fieldErrors.name || fieldErrors.remarks) {
        setErrors({ name: fieldErrors.name, remarks: fieldErrors.remarks });
        return;
      }
      showBanner(
        t("error"),
        getJobErrorStatus(err) === 422
          ? getJobErrorMessage(err, t("feedbackSendFailed"))
          : t("feedbackSendFailed"),
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("feedback")}
        onBack={() => {
          if (!sending) router.back();
        }}
      />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(32)}
      >
        <Text style={styles.intro}>{t("feedbackIntro")}</Text>

        <View style={[styles.card, styles.formCard]}>
          <Text style={styles.label}>{t("feedbackName")}</Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder={t("feedbackNamePlaceholder")}
            placeholderTextColor={theme.feedbackPlaceholder}
            maxLength={FEEDBACK_NAME_MAX}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => remarksRef.current?.focus()}
            editable={!sending}
            accessibilityLabel={t("feedbackName")}
            style={[styles.input, !!errors.name && styles.inputError]}
          />
          {errors.name ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {errors.name}
            </Text>
          ) : null}

          <Text style={[styles.label, styles.labelGap]}>
            {t("feedbackRemarks")}
          </Text>
          <TextInput
            ref={remarksRef}
            value={remarks}
            onChangeText={(v) => {
              setRemarks(v);
              if (errors.remarks) {
                setErrors((p) => ({ ...p, remarks: undefined }));
              }
            }}
            placeholder={t("feedbackRemarksPlaceholder")}
            placeholderTextColor={theme.feedbackPlaceholder}
            maxLength={FEEDBACK_REMARKS_MAX}
            multiline
            editable={!sending}
            accessibilityLabel={t("feedbackRemarks")}
            style={[
              styles.input,
              styles.inputMultiline,
              !!errors.remarks && styles.inputError,
            ]}
          />
          {errors.remarks ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {errors.remarks}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendDisabled]}
            onPress={() => void send()}
            disabled={sending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("feedbackSend")}
            accessibilityState={{ disabled: sending, busy: sending }}
          >
            {sending ? (
              <ActivityIndicator color={theme.darkGreen} />
            ) : (
              <Text style={styles.sendLabel}>{t("feedbackSend")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.historyTitle} accessibilityRole="header">
          {t("feedbackHistory")}
        </Text>

        <View style={[styles.card, styles.historyCard]}>
          {historyState === "loading" ? (
            <View style={styles.empty} accessibilityLabel={t("loading")}>
              <ActivityIndicator color={theme.darkGreen} />
            </View>
          ) : historyState === "failed" && history.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("feedbackHistoryFailed")}</Text>
              <TouchableOpacity
                onPress={loadHistory}
                style={styles.moreButton}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.moreText}>{t("tryAgain")}</Text>
              </TouchableOpacity>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <Feather
                name="message-square"
                size={moderateWidthScale(26)}
                color={theme.feedbackPlaceholder}
              />
              <Text style={styles.emptyText}>{t("feedbackHistoryEmpty")}</Text>
            </View>
          ) : (
            history.map((item, index) => {
              const open = openId === item.id;
              const date = dayjs(item.created_at).format("MMM D, YYYY");
              return (
                <View
                  key={item.id}
                  style={index > 0 ? styles.rowDivider : undefined}
                >
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setOpenId(open ? null : item.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={date}
                    accessibilityState={{ expanded: open }}
                  >
                    <View style={styles.dateTile}>
                      <Feather
                        name="calendar"
                        size={moderateWidthScale(16)}
                        color={theme.white}
                      />
                    </View>
                    <Text style={styles.dateText}>{date}</Text>
                    <Feather
                      name={open ? "chevron-down" : "chevron-right"}
                      size={moderateWidthScale(20)}
                      color={theme.darkGreen}
                    />
                  </TouchableOpacity>
                  {open ? (
                    <View style={styles.detail}>
                      <Text style={styles.detailName}>{item.name}</Text>
                      <Text style={styles.detailText}>{item.remarks}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          {historyState === "ready" && hasMore ? (
            <TouchableOpacity
              onPress={() => void loadMore()}
              disabled={loadingMore}
              style={[styles.moreButton, styles.rowDivider]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ busy: loadingMore }}
            >
              {loadingMore ? (
                <ActivityIndicator color={theme.darkGreen} />
              ) : (
                <Text style={styles.moreText}>{t("feedbackShowMore")}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
