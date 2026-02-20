import React, { useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import DashboardHeader from "@/src/components/DashboardHeader";
import { useRouter, useFocusEffect } from "expo-router";
import Button from "@/src/components/button";
import { Feather } from "@expo/vector-icons";
import { ApiService } from "@/src/services/api";
import DashboardHeaderClient from "@/src/components/DashboardHeaderClient";
import { chatEndpoints } from "@/src/services/endpoints";
import { setTotalUnreadChat } from "@/src/state/slices/userSlice";
import type { ChatContactItem } from "@/src/state/slices/generalSlice";
import {
  setChatContacts,
  setChatContactsMeta,
  setChatContactsLoading,
  setChatContactsRefreshing,
  setChatContactsLoadingMore,
  appendChatContacts,
} from "@/src/state/slices/generalSlice";
import { fetchChatContactsApi } from "@/src/services/chatContacts";

type ChatSection = {
  title: string;
  data: ChatContactItem[];
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    listContent: {
      paddingVertical: moderateHeightScale(20),
    },
    screenTitle: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(12),
    },
    sectionHeader: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginVertical: moderateHeightScale(15),
      marginHorizontal: moderateWidthScale(20),
    },
    rowContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(14),
      borderColor: theme.borderLight,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
    },
    rowHighlighted: {
      backgroundColor: theme.lightGreen13,
    },
    avatarContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.galleryPhotoBack,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
      overflow: "hidden",
    },
    avatarInitials: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(40 / 2),
      overflow: "hidden",
    },
    rowContent: {
      flex: 1,
    },
    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    nameText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
      marginRight: moderateWidthScale(8),
    },
    timeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    messageText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    guestContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    guestContent: {
      alignItems: "center",
      width: "100%",
      maxWidth: widthScale(340),
    },
    iconContainer: {
      width: widthScale(70),
      height: heightScale(70),
      borderRadius: widthScale(70 / 2),
      backgroundColor: theme.orangeBrown30,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: moderateHeightScale(20),
    },
    guestTitle: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    guestMessage: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      lineHeight: moderateHeightScale(24),
      marginBottom: moderateHeightScale(32),
      paddingHorizontal: moderateWidthScale(8),
    },
    buttonContainer: {
      width: "100%",
      marginBottom: moderateHeightScale(20),
    },
  });

function buildSections(contacts: ChatContactItem[]): ChatSection[] {
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateTitle = (date: Date) => {
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
    );
    if (isSameDay(date, today)) return "Recent";
    if (isSameDay(date, yesterday)) return "Yesterday";
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const grouped = new Map<string, ChatContactItem[]>();
  contacts.forEach((item) => {
    const dateObj = new Date(item.createdAt);
    const key = `${dateObj.getFullYear()}-${`${
      dateObj.getMonth() + 1
    }`.padStart(2, "0")}-${`${dateObj.getDate()}`.padStart(2, "0")}`;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  });

  const sortedDates = Array.from(grouped.keys()).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );

  return sortedDates.map((isoDate) => {
    const dateObj = new Date(isoDate);
    const items = [...(grouped.get(isoDate) ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const title =
      isoDate === sortedDates[0] ? "Recent" : formatDateTitle(dateObj);
    return { title, data: items };
  });
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: any) => state.user);
  const isGuest = user.isGuest;
  const contacts = useAppSelector((state) => state.general.chatContacts);
  const page = useAppSelector((state) => state.general.chatContactsPage);
  const lastPage = useAppSelector((state) => state.general.chatContactsLastPage);
  const loading = useAppSelector((state) => state.general.chatContactsLoading);
  const refreshing = useAppSelector(
    (state) => state.general.chatContactsRefreshing,
  );
  const loadingMore = useAppSelector(
    (state) => state.general.chatContactsLoadingMore,
  );

  const fetchContacts = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (append) dispatch(setChatContactsLoadingMore(true));
        else if (pageNum === 1) dispatch(setChatContactsLoading(true));
        const { list, current_page, last_page } =
          await fetchChatContactsApi(pageNum);
        if (append) {
          dispatch(appendChatContacts(list));
        } else {
          dispatch(setChatContacts(list));
        }
        dispatch(setChatContactsMeta({ page: current_page, lastPage: last_page }));
      } catch {
        // keep current data on error
      } finally {
        dispatch(setChatContactsLoading(false));
        dispatch(setChatContactsRefreshing(false));
        dispatch(setChatContactsLoadingMore(false));
      }
    },
    [dispatch],
  );

  const handleFetchChatUnreadCount = useCallback(async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: { unread_count: number };
      }>(chatEndpoints.unreadCount);
      if (response.success && response.data) {
        dispatch(setTotalUnreadChat(response.data.unread_count));
      }
    } catch {
      // Silent fail
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        fetchContacts(1, false);
        handleFetchChatUnreadCount();
      } else dispatch(setChatContactsLoading(false));
    }, [isGuest, fetchContacts, handleFetchChatUnreadCount, dispatch]),
  );

  const onRefresh = useCallback(() => {
    dispatch(setChatContactsRefreshing(true));
    fetchContacts(1, false);
    handleFetchChatUnreadCount();
  }, [fetchContacts, handleFetchChatUnreadCount, dispatch]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchContacts(page + 1, true);
  }, [loadingMore, loading, page, lastPage, fetchContacts]);

  const sections = useMemo(() => buildSections(contacts), [contacts]);

  const renderInitials = (name: string) => {
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  };

  const handleSignIn = async () => {
    await ApiService.logout();
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <DashboardHeader />
        <Text
          style={[styles.screenTitle, { paddingTop: moderateHeightScale(20) }]}
        >
          Chat box
        </Text>
        <View style={styles.guestContainer}>
          <View style={styles.guestContent}>
            <View style={styles.iconContainer}>
              <Feather
                name="user"
                size={moderateWidthScale(36)}
                color={theme.darkGreen}
              />
            </View>

            <Text style={styles.guestTitle}>{t("guestMode")}</Text>

            <Text style={styles.guestMessage}>{t("guestModeMessage")}</Text>

            <View style={styles.buttonContainer}>
              <Button title={t("signIn")} onPress={handleSignIn} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!isGuest && loading && contacts.length === 0) {
    return (
      <View style={styles.container}>
        {user.userRole === "customer" ? (
          <DashboardHeaderClient />
        ) : (
          <DashboardHeader />
        )}
        <Text
          style={[styles.screenTitle, { paddingTop: moderateHeightScale(20) }]}
        >
          {t("chatBox")}
        </Text>
        <View style={styles.guestContainer}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user.userRole === "customer" || isGuest ? (
        <DashboardHeaderClient />
      ) : (
        <DashboardHeader />
      )}
      <SectionList
        style={styles.content}
        contentContainerStyle={styles.listContent}
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.darkGreen]}
            tintColor={theme.darkGreen}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>{t("chatBox")}</Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <View
              style={{
                paddingVertical: moderateHeightScale(16),
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(main)/chatBox",
                params: { id: item.id, chatItem: JSON.stringify(item) },
              })
            }
            activeOpacity={0.8}
            style={[
              styles.rowContainer,
              item.isHighlighted && styles.rowHighlighted,
            ]}
          >
            <View style={styles.avatarContainer}>
              {item?.image ? (
                <Image
                  style={styles.avatarImage}
                  source={{ uri: item?.image }}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {renderInitials(item.name)}
                </Text>
              )}
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.timeText}>{item.timeLabel}</Text>
              </View>
              <Text style={styles.messageText} numberOfLines={1}>
                {item.message}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
