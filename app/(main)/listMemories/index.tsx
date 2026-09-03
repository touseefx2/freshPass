import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Share,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { chatEndpoints } from "@/src/services/endpoints";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";

const SEND_MESSAGE_URL = "/api/chat/messages";

export interface MemoryItem {
  url: string;
  date: string;
  /** "video" | "image" from API */
  type?: "video" | "image";
  /** @deprecated Use url. */
  image_url?: string;
}

function getItemUrl(item: MemoryItem): string {
  return item.url ?? item.image_url ?? "";
}

function MemoryVideoCard({
  videoUrl,
  styles,
  theme,
}: {
  videoUrl: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  if (!showVideo) {
    return (
      <View style={styles.modalImageCardInner}>
        <TouchableOpacity
          style={styles.modalVideoPlaceholder}
          onPress={() => setShowVideo(true)}
          activeOpacity={0.9}
        >
          <Feather
            name="play-circle"
            size={moderateWidthScale(48)}
            color={theme.white}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.modalImageCardInner}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.modalResultImage}
          contentFit="cover"
          nativeControls={true}
          onFirstFrameRender={async () => {
            if (!isVideoReady) {
              await player.play();
              setTimeout(() => setIsVideoReady(true), 200);
            }
          }}
        />
      </View>
      {!isVideoReady && (
        <View style={styles.modalVideoLoading}>
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.modalVideoLoadingText}>{t("loading")}</Text>
        </View>
      )}
    </View>
  );
}

export interface MemorySection {
  weekKey: string;
  dateLabel: string;
  weekRange?: string; // e.g. "1 Sep – 7 Sep 2026"
  items: MemoryItem[];
}

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

function parseSectionParam(param: string | undefined): MemorySection | null {
  if (!param) return null;
  try {
    const parsed = JSON.parse(param) as MemorySection;
    if (parsed?.weekKey && parsed?.dateLabel && Array.isArray(parsed?.items))
      return parsed;
  } catch {}
  return null;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

type DateGroup = {
  date: string;
  dateLabel: string;
  items: MemoryItem[];
};

function groupItemsByDate(items: MemoryItem[]): DateGroup[] {
  const byDate = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const key = item.date || "unknown";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  }
  const groups: DateGroup[] = [];
  byDate.forEach((dateItems, date) => {
    groups.push({
      date,
      dateLabel: formatDateLabel(date),
      items: dateItems,
    });
  });
  groups.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return groups;
}

export default function ListMemories() {
  const params = useLocalSearchParams<{ openSection?: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { downloadMedia, downloadingUrl } = useDownloadMedia();
  const { showBanner } = useNotificationContext();

  const [selectedSection, setSelectedSection] = useState<MemorySection | null>(
    null,
  );

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

  // Show section content when navigated with openSection param (from aiMemories)
  useEffect(() => {
    const section = parseSectionParam(params.openSection);
    if (section) {
      setSelectedSection(section);
    }
  }, [params.openSection]);

  const dateGroups = useMemo(
    () => groupItemsByDate(selectedSection?.items ?? []),
    [selectedSection?.items],
  );

  const flatItems = useMemo(
    () => dateGroups.flatMap((g) => g.items),
    [dateGroups],
  );

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

  const openFullImage = useCallback(
    (imageUrl: string, index: number) => {
      if (!flatItems.length) return;
      const allUrls = flatItems.map((i) => getItemUrl(i));
      dispatch(openFullImageModal({ images: allUrls, initialIndex: index }));
    },
    [flatItems, dispatch],
  );

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

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={selectedSection ? (selectedSection.weekRange ?? selectedSection.dateLabel) : t("memories")}
        rightIcon={
          <MaterialIcons
            name="smart-toy"
            size={moderateWidthScale(22)}
            color={theme.white}
          />
        }
        onRightPress={() => {
          router.back();
          router.back();
        }}
      />

      <ShareOptionsBottomSheet
        visible={shareSheetVisible}
        onClose={() => {
          setShareSheetVisible(false);
          // Do not clear shareImageUrl here - "Share with in-app user" calls onClose then onSelectInAppUser, so URL would be lost before send
        }}
        onSelectInAppUser={openShareToUserModal}
        onSelectNativeShare={handleNativeShareImage}
      />

      {selectedSection ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {dateGroups.map((group, groupIndex) => {
            const groupStartIndex = flatItems.findIndex(
              (i) => i === group.items[0],
            );
            const isLastGroup = groupIndex === dateGroups.length - 1;
            return (
              <View key={group.date} style={styles.dateSection}>
                <View style={styles.dateSectionHeader}>
                  <View style={styles.dateSectionTitlePill}>
                    <Text style={styles.dateSectionTitle}>{group.dateLabel}</Text>
                  </View>
                  <View style={styles.dateSectionHeaderLine} />
                </View>
                <View style={styles.modalImageGrid}>
                  {group.items.map((item, indexInGroup) => {
                    const itemUrl = getItemUrl(item);
                    const isVideo = item.type === "video";
                    const globalIndex =
                      groupStartIndex >= 0
                        ? groupStartIndex + indexInGroup
                        : indexInGroup;
                    const isLastOddFullWidth =
                      group.items.length % 2 === 1 &&
                      indexInGroup === group.items.length - 1;
                    return (
                      <View
                        key={
                          itemUrl
                            ? `${itemUrl}-${group.date}-${indexInGroup}`
                            : `item-${group.date}-${indexInGroup}`
                        }
                        style={[
                          styles.modalImageCard,
                          isLastOddFullWidth && styles.modalImageCardFull,
                        ]}
                      >
                        <View style={styles.modalImageCardInner}>
                          {isVideo ? (
                            <MemoryVideoCard
                              videoUrl={itemUrl}
                              styles={styles}
                              theme={theme}
                            />
                          ) : (
                            <TouchableOpacity
                              style={styles.modalResultImageTouchable}
                              onPress={() => openFullImage(itemUrl, globalIndex)}
                              activeOpacity={0.9}
                            >
                              <Image
                                source={{ uri: itemUrl }}
                                style={styles.modalResultImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.modalShareButton,
                              isVideo && styles.modalShareButtonVideo,
                            ]}
                            onPress={() => openShareSheetForImage(itemUrl)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons
                              name="share"
                              size={moderateWidthScale(14)}
                              color={theme.white}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.modalDownloadButton,
                              isVideo && styles.modalDownloadButtonVideo,
                            ]}
                            onPress={() => downloadMedia(itemUrl)}
                            disabled={downloadingUrl === itemUrl}
                            activeOpacity={0.7}
                          >
                            {downloadingUrl === itemUrl ? (
                              <ActivityIndicator
                                size="small"
                                color={theme.white}
                              />
                            ) : (
                              <Feather
                                name="download"
                                size={moderateWidthScale(14)}
                                color={theme.white}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {!isLastGroup ? (
                  <View style={styles.dateSectionSeparator} />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <PotentialContactsModal
        visible={shareToUserModalVisible}
        onClose={() => {
          setShareToUserModalVisible(false);
          setShareImageUrl(null);
        }}
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
