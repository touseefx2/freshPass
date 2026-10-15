import React from "react";
import { useTranslation } from "react-i18next";
import SourcePickerSheet from "./sourcePickerSheet";

export type AddClipSource = "gallery" | "recordVideo" | "takePhoto";

type Props = {
  visible: boolean;
  /** e.g. "0:54 left in your reel" or how far over the limit it is. */
  timeLabel: string;
  onClose: () => void;
  onPick: (source: AddClipSource) => void;
  tone?: "dark" | "light";
  /** No "Take a photo" (e.g. an AI auto reel source: videos only) */
  videoOnly?: boolean;
};

export default function AddClipSheet({
  visible,
  timeLabel,
  onClose,
  onPick,
  tone,
  videoOnly = false,
}: Props) {
  const { t } = useTranslation();
  return (
    <SourcePickerSheet<AddClipSource>
      visible={visible}
      title={t("addClip")}
      subtitle={timeLabel}
      options={[
        {
          key: "gallery",
          icon: "photo-library",
          title: t("addClipGallery"),
          sub: t("addClipGallerySub"),
        },
        {
          key: "recordVideo",
          icon: "videocam",
          title: t("addClipRecord"),
          sub: t("addClipRecordSub"),
        },
        ...(videoOnly
          ? []
          : [
              {
                key: "takePhoto" as const,
                icon: "photo-camera" as const,
                title: t("addClipPhoto"),
                sub: t("addClipPhotoSub"),
              },
            ]),
      ]}
      onClose={onClose}
      onPick={onPick}
      tone={tone}
    />
  );
}
