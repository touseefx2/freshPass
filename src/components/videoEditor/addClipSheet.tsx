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
};

export default function AddClipSheet({
  visible,
  timeLabel,
  onClose,
  onPick,
  tone,
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
        {
          key: "takePhoto",
          icon: "photo-camera",
          title: t("addClipPhoto"),
          sub: t("addClipPhotoSub"),
        },
      ]}
      onClose={onClose}
      onPick={onPick}
      tone={tone}
    />
  );
}
