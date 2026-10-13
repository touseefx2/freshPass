import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as VideoThumbnails from "expo-video-thumbnails";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  buildAutoReel,
  listAutoReelTemplates,
} from "@/src/services/reelsService";
import { VideoTooLargeError } from "@/src/services/mediaLibraryService";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import {
  keyedFieldErrors,
  mediaSlots,
  musicFieldError,
  textSlots,
  type AutoReel,
  type AutoReelMusic,
  type AutoReelSlot,
  type BuildAutoReelPayload,
} from "@/src/types/reels";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import {
  pickSlotFile,
  uploadSlotFile,
  type SlotFile,
} from "@/src/utils/designSlots";
import { slotIcon, slotMeta, slotWhat } from "@/src/utils/templateGallery";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import {
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";
import DesignSlotCard from "@/src/components/reelFlow/designSlotCard";
import DesignMusicField from "@/src/components/reelFlow/designMusicField";
import MomentPickerModal, {
  formatMoment,
} from "@/src/components/autoReel/momentPickerModal";

/**
 * Video design in `review`: the AI picked a moment of the uploaded video for
 * each photo / video slot. Per slot the user keeps it, moves it, or attaches
 * their own file; texts start from `design.texts`; silent designs need music
 * or "No music". "Generate reel" → POST …/build (202 → pending), then the
 * parent polls to `ready` as usual. Changing picks never calls the AI again.
 */

type SlotChoice =
  | { mode: "pick"; at: number | null; moved: boolean }
  | { mode: "file"; file: SlotFile };

type Props = {
  autoReel: AutoReel;
  /** Staff may only build what they started */
  canChange: boolean;
  /** Build accepted (202) — the auto reel is `pending` again */
  onBuilt: (autoReel: AutoReel) => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(16),
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
  });

function initialChoices(autoReel: AutoReel): Record<string, SlotChoice> {
  const design = autoReel.design;
  const out: Record<string, SlotChoice> = {};
  for (const slot of mediaSlots(design?.slots)) {
    const pick = design?.picks?.[slot.key];
    out[slot.key] = {
      mode: "pick",
      at: pick?.found !== false && pick?.at != null ? pick.at : null,
      moved: false,
    };
  }
  return out;
}

export default function DesignReview({ autoReel, canChange, onBuilt }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();

  const design = autoReel.design;
  const videoUrl = design?.video_url ?? null;
  const videoSeconds = design?.video_seconds ?? null;
  const slots = useMemo(() => mediaSlots(design?.slots), [design?.slots]);
  const texts = useMemo(() => textSlots(design?.slots), [design?.slots]);
  // `design.has_sound` first; when it isn't sent, the template's own fields
  const [templateSound, setTemplateSound] = useState<{
    hasSound: boolean | null;
    lengthSeconds: number | null;
  } | null>(null);
  const templateId = autoReel.template?.id ?? null;
  const needsTemplateInfo =
    design?.has_sound == null || design?.length_seconds == null;
  useEffect(() => {
    if (!needsTemplateInfo || templateId == null) return;
    let cancelled = false;
    listAutoReelTemplates()
      .then((list) => {
        const tpl = list.find((item) => item.id === templateId);
        if (!cancelled && tpl) {
          setTemplateSound({
            hasSound: tpl.has_sound ?? null,
            lengthSeconds: tpl.length_seconds ?? null,
          });
        }
      })
      .catch((error) => {
        Logger.error("Failed to load template for design review:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [needsTemplateInfo, templateId]);
  const silent =
    design?.has_sound === false ||
    (design?.has_sound == null && templateSound?.hasSound === false);
  const reelSeconds =
    design?.length_seconds ??
    templateSound?.lengthSeconds ??
    autoReel.total_seconds ??
    null;

  const [choices, setChoices] = useState<Record<string, SlotChoice>>(() =>
    initialChoices(autoReel),
  );
  const choicesRef = useRef(choices);
  choicesRef.current = choices;
  const [textValues, setTextValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const slot of textSlots(autoReel.design?.slots)) {
      out[slot.key] = autoReel.design?.texts?.[slot.key] ?? "";
    }
    return out;
  });
  const [music, setMusic] = useState<AutoReelMusic | null | undefined>(undefined);
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [textErrors, setTextErrors] = useState<Record<string, string>>({});
  const [musicError, setMusicError] = useState<string | null>(null);
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const [movingSlot, setMovingSlot] = useState<AutoReelSlot | null>(null);
  const [building, setBuilding] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  // Frames for the picks — taken from the uploaded video at each moment
  const [frames, setFrames] = useState<Record<string, string>>({});
  const frameKey = (at: number) => at.toFixed(1);
  const pickTimes = slots
    .map((slot) => {
      const choice = choices[slot.key];
      return choice?.mode === "pick" && choice.at != null ? choice.at : null;
    })
    .filter((at): at is number => at != null);
  const missingFrames = pickTimes
    .map(frameKey)
    // "" = failed before — don't try that frame again
    .filter((key) => frames[key] === undefined)
    .join(",");
  useEffect(() => {
    if (!videoUrl || !missingFrames) return;
    let cancelled = false;
    (async () => {
      for (const key of missingFrames.split(",")) {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(videoUrl, {
            time: Math.round(Number(key) * 1000),
            quality: 0.6,
          });
          if (cancelled) return;
          setFrames((prev) => ({ ...prev, [key]: thumb.uri }));
        } catch (error) {
          // Cosmetic only — the card shows the slot icon instead
          Logger.warn("Design pick frame failed:", error);
          if (cancelled) return;
          setFrames((prev) => ({ ...prev, [key]: "" }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingFrames, videoUrl]);

  const clearSlotError = (key: string) =>
    setSlotErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const attachFile = useCallback(
    async (slot: AutoReelSlot) => {
      if (pickingSlot) return;
      setPickingSlot(slot.key);
      try {
        const picked = await pickSlotFile(slot, t);
        if (!picked) return;
        if ("error" in picked) {
          setSlotErrors((prev) => ({ ...prev, [slot.key]: picked.error }));
          return;
        }
        setChoices((prev) => ({
          ...prev,
          [slot.key]: { mode: "file", file: picked.file },
        }));
        clearSlotError(slot.key);
      } catch (error) {
        Logger.error("Error selecting own file for design slot:", error);
        showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
      } finally {
        setPickingSlot(null);
      }
    },
    [pickingSlot, showBanner, t],
  );

  const resetToAi = (slot: AutoReelSlot) => {
    const pick = design?.picks?.[slot.key];
    setChoices((prev) => ({
      ...prev,
      [slot.key]: {
        mode: "pick",
        at: pick?.found !== false && pick?.at != null ? pick.at : null,
        moved: false,
      },
    }));
    clearSlotError(slot.key);
  };

  const complete =
    slots.every((slot) => {
      const choice = choices[slot.key];
      return choice?.mode === "file" || (choice?.mode === "pick" && choice.at != null);
    }) &&
    texts.every((slot) => !!textValues[slot.key]?.trim()) &&
    (!silent || music !== undefined);

  const notFound = slots.filter(
    (slot) => design?.picks?.[slot.key]?.found === false,
  );

  const uploadAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const handleBuild = useCallback(async () => {
    if (building || !complete) return;
    setBuilding(true);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      // Own files first (POST /api/media, no purpose) — kept if the build fails
      const toUpload = slots.filter((slot) => {
        const choice = choicesRef.current[slot.key];
        return choice?.mode === "file" && choice.file.mediaId == null;
      });
      let uploaded = 0;
      if (toUpload.length) setUploadPercent(0);
      const payloadSlots: BuildAutoReelPayload["slots"] = {};
      for (const slot of slots) {
        const choice = choicesRef.current[slot.key];
        if (choice?.mode === "pick" && choice.at != null) {
          payloadSlots[slot.key] = { at: choice.at };
          continue;
        }
        if (choice?.mode !== "file") continue;
        let id = choice.file.mediaId;
        if (id == null) {
          const file = choice.file;
          id = await uploadSlotFile(file, {
            signal: controller.signal,
            onProgress: (percent) =>
              setUploadPercent(
                Math.round((uploaded * 100 + percent) / toUpload.length),
              ),
          });
          if (controller.signal.aborted) return;
          uploaded += 1;
          const mediaId = id;
          setChoices((prev) => {
            const current = prev[slot.key];
            return current?.mode === "file" && current.file.uri === file.uri
              ? {
                  ...prev,
                  [slot.key]: { mode: "file", file: { ...file, mediaId } },
                }
              : prev;
          });
        }
        payloadSlots[slot.key] = { media_asset_id: id };
      }
      setUploadPercent(null);

      const payloadTexts: Record<string, string> = {};
      for (const slot of texts) {
        payloadTexts[slot.key] = (textValues[slot.key] ?? "").trim();
      }
      const data = await buildAutoReel(autoReel.id, {
        slots: payloadSlots,
        texts: payloadTexts,
        ...(silent ? { music: music ?? null } : {}),
      });
      onBuilt(data);
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to build design auto reel:", error);
      const slotErrs = keyedFieldErrors(error, "slots");
      const textErrs = keyedFieldErrors(error, "texts");
      const musicErr = musicFieldError(error);
      // A refused own file goes up again next time
      setChoices((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(slotErrs)) {
          const choice = next[key];
          if (choice?.mode === "file") {
            next[key] = { mode: "file", file: { ...choice.file, mediaId: null } };
          }
        }
        return next;
      });
      setSlotErrors(slotErrs);
      setTextErrors(textErrs);
      setMusicError(musicErr);
      const message =
        Object.values(slotErrs)[0] ||
        Object.values(textErrs)[0] ||
        musicErr ||
        error?.data?.errors?.auto_reel?.[0] ||
        (error instanceof VideoTooLargeError ? t("autoReelVideoTooLarge") : null) ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4500);
    } finally {
      setUploadPercent(null);
      setBuilding(false);
    }
  }, [
    autoReel.id,
    building,
    complete,
    music,
    onBuilt,
    showBanner,
    silent,
    slots,
    t,
    textValues,
    texts,
  ]);

  const badgeFor = (slot: AutoReelSlot, choice: SlotChoice | undefined) => {
    if (choice?.mode === "file") {
      return {
        label:
          choice.file.kind === "video"
            ? t("designYourVideo")
            : t("designYourPhoto"),
        tone: "own" as const,
      };
    }
    if (choice?.mode === "pick" && choice.at != null) {
      const time =
        slot.kind === "video" && slot.min_seconds
          ? `${formatMoment(choice.at)}–${formatMoment(choice.at + slot.min_seconds)}`
          : formatMoment(choice.at);
      return {
        label: choice.moved
          ? t("designYourMoment", { time })
          : t("designAiPick", { time }),
        tone: "ai" as const,
      };
    }
    return { label: t("designNotFound"), tone: "missing" as const };
  };

  const disabled = !canChange || building;

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(120)}
      >
        <FlowTitle
          title={t("designReviewTitle")}
          subtitle={t("designReviewSubtitle")}
        />
        {notFound.length ? (
          <InfoNote
            tone="warm"
            icon="search-off"
            title={t("designNotFoundTitle", {
              parts: notFound.map((slot) => slot.label).join(", "),
            })}
            text={t("designNotFoundBody")}
          />
        ) : null}
        {!canChange ? (
          <InfoNote icon="lock-outline" text={t("autoReelViewOnlyHint")} />
        ) : null}

        {slots.map((slot) => {
          const choice = choices[slot.key];
          const pickAt = choice?.mode === "pick" ? choice.at : null;
          const original = design?.picks?.[slot.key];
          const changed =
            choice?.mode === "file" || (choice?.mode === "pick" && choice.moved);
          const thumbUri =
            choice?.mode === "file"
              ? choice.file.thumbnailUri
              : pickAt != null
                ? frames[frameKey(pickAt)] || null
                : null;
          const actions = canChange
            ? [
                ...(videoUrl
                  ? [
                      {
                        icon: "tune" as const,
                        label:
                          pickAt != null || choice?.mode === "file"
                            ? t("designMoveMoment")
                            : t("designChooseMoment"),
                        onPress: () => setMovingSlot(slot),
                        disabled,
                      },
                    ]
                  : []),
                {
                  icon: "upload-file" as const,
                  label:
                    choice?.mode === "file"
                      ? t("designReplace")
                      : t("designUseOwnFile"),
                  onPress: () => void attachFile(slot),
                  disabled: disabled || !!pickingSlot,
                },
                ...(changed && original?.found !== false && original?.at != null
                  ? [
                      {
                        icon: "undo" as const,
                        label: t("designKeepAiPick"),
                        onPress: () => resetToAi(slot),
                        disabled,
                      },
                    ]
                  : []),
              ]
            : [];
          return (
            <DesignSlotCard
              key={slot.key}
              icon={slotIcon(slot) as "photo-camera"}
              label={slot.label}
              detail={slotWhat(slot)}
              meta={slotMeta(slot, t)}
              thumbUri={thumbUri}
              thumbLoading={
                pickingSlot === slot.key ||
                (pickAt != null && frames[frameKey(pickAt)] === undefined)
              }
              isVideo={
                slot.kind === "video" ||
                (choice?.mode === "file" && choice.file.kind === "video")
              }
              badge={badgeFor(slot, choice)}
              error={slotErrors[slot.key]}
              onThumbPress={
                canChange && videoUrl && choice?.mode !== "file"
                  ? () => setMovingSlot(slot)
                  : null
              }
              actions={actions}
            />
          );
        })}

        {texts.length ? (
          <>
            <View style={styles.divider} />
            <SectionLabel label={t("designTextsTitle")} />
            {texts.map((slot) => (
              <FlowTextField
                key={slot.key}
                label={slot.label}
                required
                value={textValues[slot.key] ?? ""}
                onChangeText={(v) => {
                  setTextValues((prev) => ({
                    ...prev,
                    [slot.key]: slot.max_length ? v.slice(0, slot.max_length) : v,
                  }));
                  setTextErrors((prev) => {
                    if (!prev[slot.key]) return prev;
                    const next = { ...prev };
                    delete next[slot.key];
                    return next;
                  });
                }}
                placeholder={slot.hint || slot.label}
                maxCount={slot.max_length ?? undefined}
                error={textErrors[slot.key]}
                editable={!disabled}
              />
            ))}
          </>
        ) : null}

        {silent ? (
          <>
            <View style={styles.divider} />
            <DesignMusicField
              value={music}
              onChange={(next) => {
                setMusic(next);
                setMusicError(null);
              }}
              lengthSeconds={reelSeconds}
              error={musicError}
              disabled={disabled}
            />
          </>
        ) : null}

        <InfoNote icon="auto-awesome" text={t("designReviewFreeNote")} />
      </KeyboardAwareScrollView>

      {canChange ? (
        <FlowFooter
          progress={
            uploadPercent != null
              ? {
                  label: t("autoReelUploading", { percent: uploadPercent }),
                  percent: uploadPercent,
                }
              : null
          }
          primary={{
            label: t("designBuildCta"),
            icon: "auto-awesome",
            onPress: () => void handleBuild(),
            disabled: !complete || building || !!pickingSlot,
            loading: building,
          }}
          hint={
            complete
              ? null
              : silent && music === undefined && slots.every((s) => {
                    const c = choices[s.key];
                    return c?.mode === "file" || (c?.mode === "pick" && c.at != null);
                  })
                ? t("designMusicRequired")
                : t("designReviewIncomplete")
          }
        />
      ) : null}

      {videoUrl && movingSlot ? (
        <MomentPickerModal
          visible
          videoUrl={videoUrl}
          label={movingSlot.label}
          clipSeconds={
            movingSlot.kind === "video" ? (movingSlot.min_seconds ?? null) : null
          }
          videoSeconds={videoSeconds}
          initialAt={(() => {
            const choice = choices[movingSlot.key];
            return choice?.mode === "pick" ? choice.at : null;
          })()}
          onCancel={() => setMovingSlot(null)}
          onDone={(at) => {
            const key = movingSlot.key;
            const original = design?.picks?.[key];
            setChoices((prev) => ({
              ...prev,
              [key]: {
                mode: "pick",
                at,
                moved: !(original?.found !== false && original?.at === at),
              },
            }));
            clearSlotError(key);
            setMovingSlot(null);
          }}
        />
      ) : null}
    </>
  );
}
