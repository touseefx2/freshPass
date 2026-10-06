import React, { useCallback, useState } from "react";
import { Share } from "react-native";
import { useTranslation } from "react-i18next";
import ShareOptionsBottomSheet from "@/src/components/ShareOptionsBottomSheet";
import PotentialContactsModal, {
  type PotentialContact,
} from "@/src/components/PotentialContactsModal";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { chatEndpoints } from "@/src/services/endpoints";

const SEND_MESSAGE_URL = "/api/chat/messages";

type PotentialContactsResponse = {
  success: boolean;
  data: {
    data: PotentialContact[];
    meta: { current_page: number; last_page: number };
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  videoUrl: string | null;
};

/**
 * Share a reel video the same way AI Results does: native share sheet, or send
 * it to an in-app contact as a chat message ("AI Results – Video").
 */
export default function ReelVideoShareSheet({ visible, onClose, videoUrl }: Props) {
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  const [contactsVisible, setContactsVisible] = useState(false);
  const [contacts, setContacts] = useState<PotentialContact[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);

  const messageText = videoUrl
    ? `${t("aiResults")} – ${t("video")}\n\n${t("video")}: ${videoUrl}`
    : "";

  const fetchContacts = useCallback(async (pageNum: number, append: boolean) => {
    try {
      setError(false);
      if (append) setLoadingMore(true);
      else setLoading(true);
      const res = await ApiService.get<PotentialContactsResponse>(
        chatEndpoints.potentialContacts({ page: pageNum, per_page: 20 }),
      );
      const list = res.data?.data ?? [];
      const meta = res.data?.meta;
      setContacts((prev) => (append ? [...prev, ...list] : list));
      setPage(meta?.current_page ?? pageNum);
      setLastPage(meta?.last_page ?? 1);
    } catch {
      if (!append) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const openContacts = useCallback(() => {
    setContactsVisible(true);
    setContacts([]);
    setPage(1);
    setLastPage(1);
    setError(false);
    void fetchContacts(1, false);
  }, [fetchContacts]);

  const nativeShare = useCallback(async () => {
    if (!messageText) return;
    try {
      await Share.share({ message: messageText, url: videoUrl ?? undefined });
    } catch {
      // Ignore share-sheet cancel / errors
    }
  }, [messageText, videoUrl]);

  const sendToContact = useCallback(
    async (contact: PotentialContact) => {
      if (!messageText) return;
      setSending(true);
      try {
        const formData = new FormData();
        formData.append("receiver_id", String(Number(contact.id)));
        formData.append("message", messageText);
        const res = await ApiService.post<{ success: boolean }>(
          SEND_MESSAGE_URL,
          formData,
          { headers: { "Content-Type": false as any } },
        );
        if (res?.success) {
          setContactsVisible(false);
          showBanner(t("success"), t("messageSentSuccessfully"), "success", 3000);
        } else {
          showBanner(t("error"), t("somethingWentWrong"), "error", 3000);
        }
      } catch {
        showBanner(t("error"), t("somethingWentWrong"), "error", 3000);
      } finally {
        setSending(false);
      }
    },
    [messageText, showBanner, t],
  );

  const onEndReached = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    void fetchContacts(page + 1, true);
  }, [fetchContacts, lastPage, loading, loadingMore, page]);

  return (
    <>
      <ShareOptionsBottomSheet
        visible={visible}
        onClose={onClose}
        onSelectInAppUser={openContacts}
        onSelectNativeShare={nativeShare}
      />
      <PotentialContactsModal
        visible={contactsVisible}
        onClose={() => setContactsVisible(false)}
        contacts={contacts}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        onRetry={() => void fetchContacts(1, false)}
        onContactPress={sendToContact}
        onEndReached={onEndReached}
        sending={sending}
      />
    </>
  );
}
