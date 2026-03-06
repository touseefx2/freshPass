import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Image,
  Share,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { chatEndpoints } from "@/src/services/endpoints";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";

const SEND_MESSAGE_URL = "/api/chat/messages";

export interface MemoryItem {
  image_url: string;
  date: string;
}

export interface MemorySection {
  weekKey: string;
  dateLabel: string;
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

export default function ListMemories() {
  const params = useLocalSearchParams<{ openSection?: string }>();
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

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={selectedSection ? selectedSection.dateLabel : t("memories")}
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
          <View style={styles.modalImageGrid}>
            {selectedSection.items.map((item, index) => (
              <View
                key={`${item.image_url}-${index}`}
                style={styles.modalImageCard}
              >
                <View style={styles.modalImageCardInner}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.modalResultImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.modalShareButton}
                    onPress={() => openShareSheetForImage(item.image_url)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="share"
                      size={moderateWidthScale(14)}
                      color={theme.white}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalDownloadButton}
                    onPress={() => downloadMedia(item.image_url)}
                    disabled={downloadingUrl === item.image_url}
                    activeOpacity={0.7}
                  >
                    {downloadingUrl === item.image_url ? (
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
            ))}
          </View>
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
