import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { AppDispatch, RootState } from "@/src/state/store";
import { setDownloadingUrl } from "@/src/state/slices/downloadSlice";
import { saveMediaToGallery } from "@/src/services/downloadMediaService";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

export type DownloadMediaOptions = {
  isVideo?: boolean;
  successMessageKey?: string;
};

/**
 * Global download hook: saves image/video to gallery and manages loader via Redux.
 * Use downloadingUrl === url to show loader and disable the download button.
 */
export function useDownloadMedia() {
  const dispatch = useDispatch<AppDispatch>();
  const downloadingUrl = useSelector(
    (s: RootState) => s.download?.downloadingUrl ?? null,
  );
  const { showBanner } = useNotificationContext();
  const { t } = useTranslation();

  const downloadMedia = useCallback(
    async (
      uri: string,
      options: DownloadMediaOptions = {},
    ): Promise<void> => {
      const { isVideo = false, successMessageKey } = options;
      if (downloadingUrl) return;
      dispatch(setDownloadingUrl(uri));
      try {
        const saved = await saveMediaToGallery(uri);
        if (saved) {
          const msg = successMessageKey
            ? t(successMessageKey)
            : isVideo
              ? t("videoSavedToGallery")
              : t("imageSavedToGallery");
          showBanner(t("success"), msg, "success", 3000);
        } else {
          showBanner(
            t("error"),
            t("noImageAvailableToDownload") || t("somethingWentWrong"),
            "error",
            3000,
          );
        }
      } catch {
        showBanner(
          t("error"),
          t("somethingWentWrong") || "Download failed.",
          "error",
          3000,
        );
      } finally {
        dispatch(setDownloadingUrl(null));
      }
    },
    [dispatch, showBanner, t, downloadingUrl],
  );

  return { downloadMedia, downloadingUrl };
}
