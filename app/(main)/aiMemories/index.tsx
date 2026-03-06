import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Share,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { memoriesEndpoints, chatEndpoints } from "@/src/services/endpoints";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";
import MemorySectionModal, {
  type MemoryItem,
  type MemorySection,
} from "@/src/components/MemorySectionModal";

const PER_PAGE = 20;
const SEND_MESSAGE_URL = "/api/chat/messages";

type MemoriesResponse = {
  success: boolean;
  data: MemoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type PotentialContactsResponse = {
  data?: {
    data: PotentialContact[];
    meta?: { current_page: number; last_page: number };
  };
};

type SendMessageResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

/** Get ISO week key (e.g. "2026-W10") for grouping */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const w = Math.ceil(
    (monday.getTime() - new Date(y, 0, 1).getTime()) / 604800000,
  );
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Format date for display: 2026/3/6 */
function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}/${m}/${d}`;
}

function groupByWeek(items: MemoryItem[]): MemorySection[] {
  const byWeek = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const key = getWeekKey(item.date);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(item);
  }
  const sections: MemorySection[] = [];
  byWeek.forEach((weekItems, weekKey) => {
    const sorted = [...weekItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const firstDate = sorted[0]?.date ?? "";
    sections.push({
      weekKey,
      dateLabel: formatDateLabel(firstDate),
      items: sorted,
    });
  });
  sections.sort(
    (a, b) =>
      new Date(b.items[0]?.date ?? 0).getTime() -
      new Date(a.items[0]?.date ?? 0).getTime(),
  );
  return sections;
}

export default function AiMemories() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const { showBanner } = useNotificationContext();

  const [list, setList] = useState<MemoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedSection, setSelectedSection] = useState<MemorySection | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareToUserModalVisible, setShareToUserModalVisible] = useState(false);
  const [potentialContacts, setPotentialContacts] = useState<
    PotentialContact[]
  >([]);
  const [potentialPage, setPotentialPage] = useState(1);
  const [potentialLastPage, setPotentialLastPage] = useState(1);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [potentialLoadingMore, setPotentialLoadingMore] = useState(false);
  const [potentialError, setPotentialError] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const sections = useMemo(() => groupByWeek(list), [list]);

  const fetchMemories = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const url = memoriesEndpoints.list({
          page: pageNum,
          per_page: PER_PAGE,
        });
        const res = await ApiService.get<MemoriesResponse>(url);
        const data = res?.data ?? [];
        const currentPage = res?.current_page ?? pageNum;
        const last = res?.last_page ?? 1;
        setLastPage(last);
        if (append) {
          setList((prev) => [...prev, ...data]);
          setPage(currentPage);
        } else {
          setList(data);
          setPage(currentPage);
        }
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchMemories(1, false);
  }, [fetchMemories]);

  const fetchPotentialContacts = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        setPotentialError(false);
        if (append) setPotentialLoadingMore(true);
        else setPotentialLoading(true);
        const url = chatEndpoints.potentialContacts({
          page: pageNum,
          per_page: 20,
        });
        const res = await ApiService.get<PotentialContactsResponse>(url);
        const listData = res?.data?.data ?? [];
        const meta = res?.data?.meta;
        if (append) {
          setPotentialContacts((prev) => [...prev, ...listData]);
        } else {
          setPotentialContacts(listData);
        }
        setPotentialPage(meta?.current_page ?? pageNum);
        setPotentialLastPage(meta?.last_page ?? 1);
      } catch {
        if (!append) setPotentialError(true);
      } finally {
        setPotentialLoading(false);
        setPotentialLoadingMore(false);
      }
    },
    [],
  );

  const openShareSheetForImage = useCallback((url: string) => {
    setShareImageUrl(url);
    setShareSheetVisible(true);
  }, []);

  const handleNativeShareImage = useCallback(async () => {
    if (!shareImageUrl) return;
    try {
      await Share.share({
        message: shareImageUrl,
        url: shareImageUrl,
      });
    } catch (_err) {}
    setShareSheetVisible(false);
    setShareImageUrl(null);
  }, [shareImageUrl]);

  const openShareToUserModal = useCallback(() => {
    setShareSheetVisible(false);
    setShareToUserModalVisible(true);
    setPotentialContacts([]);
    setPotentialPage(1);
    setPotentialLastPage(1);
    setPotentialError(false);
    fetchPotentialContacts(1, false);
  }, [fetchPotentialContacts]);

  const onPotentialContactPress = useCallback(
    async (contact: PotentialContact) => {
      if (!shareImageUrl?.trim()) return;
      setShareSending(true);
      try {
        const formData = new FormData();
        formData.append("receiver_id", String(Number(contact.id)));
        formData.append("message", shareImageUrl);

        const res = await ApiService.post<SendMessageResponse>(
          SEND_MESSAGE_URL,
          formData,
          { headers: { "Content-Type": false as any } },
        );

        if (res?.success) {
          setShareToUserModalVisible(false);
          setShareImageUrl(null);
          showBanner(
            t("success"),
            t("messageSentSuccessfully"),
            "success",
            3000,
          );
        } else {
          showBanner(
            t("error"),
            t("somethingWentWrong") || "Something went wrong.",
            "error",
            3000,
          );
        }
      } catch {
        showBanner(
          t("error"),
          t("somethingWentWrong") || "Something went wrong.",
          "error",
          3000,
        );
      } finally {
        setShareSending(false);
      }
    },
    [shareImageUrl, showBanner, t],
  );

  const onPotentialEndReached = useCallback(() => {
    if (
      potentialLoadingMore ||
      potentialLoading ||
      potentialPage >= potentialLastPage
    )
      return;
    fetchPotentialContacts(potentialPage + 1, true);
  }, [
    potentialLoadingMore,
    potentialLoading,
    potentialPage,
    potentialLastPage,
    fetchPotentialContacts,
  ]);

  const handleEndReached = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchMemories(page + 1, true);
  }, [loadingMore, loading, page, lastPage, fetchMemories]);

  const handleSectionPress = useCallback((section: MemorySection) => {
    setSelectedSection(section);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedSection(null);
  }, []);

  const renderSection = useCallback(
    ({ item }: { item: MemorySection }) => {
      const firstImage = item.items[0]?.image_url;
      if (!firstImage) return null;
      return (
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => handleSectionPress(item)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: firstImage }}
            style={styles.sectionCardImage}
            resizeMode="cover"
          />
          <View style={styles.sectionCardOverlay}>
            <Text style={styles.sectionCardTitle}>{t("happyWeekend")}</Text>
            <Text style={styles.sectionCardDate}>{item.dateLabel}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, handleSectionPress, t],
  );

  const keyExtractor = useCallback((item: MemorySection) => item.weekKey, []);

  const listFooter = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : null,
    [loadingMore, styles, theme.primary],
  );

  const listEmpty = useMemo(
    () =>
      !loading && sections.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>{t("memories")}</Text>
        </View>
      ) : null,
    [loading, sections.length, styles, t],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader title={t("memories")} />
      {loading && list.length === 0 ? (
        <View
          style={[styles.emptyStateContainer, { justifyContent: "center" }]}
        >
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ShareOptionsBottomSheet
        visible={shareSheetVisible}
        onClose={() => {
          setShareSheetVisible(false);
          setShareImageUrl(null);
        }}
        onSelectInAppUser={openShareToUserModal}
        onSelectNativeShare={handleNativeShareImage}
      />

      <MemorySectionModal
        visible={modalVisible}
        onClose={handleCloseModal}
        section={selectedSection}
        onShareImage={openShareSheetForImage}
        onDownloadImage={downloadMedia}
        downloadingUrl={downloadingUrl}
      />

      <PotentialContactsModal
        visible={shareToUserModalVisible}
        onClose={() => setShareToUserModalVisible(false)}
        contacts={potentialContacts}
        loading={potentialLoading}
        loadingMore={potentialLoadingMore}
        error={potentialError}
        onRetry={() => fetchPotentialContacts(1, false)}
        onContactPress={onPotentialContactPress}
        onEndReached={onPotentialEndReached}
        sending={shareSending}
      />
    </View>
  );
}
