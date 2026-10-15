import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import Logger from "@/src/services/logger";
import {
  buildAutoReel,
  listAutoReelTemplates,
} from "@/src/services/reelsService";
import { VideoTooLargeError } from "@/src/services/mediaLibraryService";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  autoReelEditsLeft,
  isAutoBuiltReel,
  keyedFieldErrors,
  mediaSlots,
  musicFieldError,
  textSlots,
  type AutoReel,
  type AutoReelMusic,
  type AutoReelPick,
  type AutoReelSlot,
  type BuildAutoReelPayload,
} from "@/src/types/reels";
import { isUploadCancelled } from "@/src/utils/uploadCancel";
import { createMusicFor } from "@/src/utils/autoReelCreateMusic";
import {
  cutSlotVideo,
  localSlotVideoUri,
  pickSlotFile,
  slotNeedsCut,
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
import {
  ClipPreview,
  ClipStrip,
  type ClipItem,
} from "@/src/components/autoReel/clipStrip";
import DesignMusicField from "@/src/components/reelFlow/designMusicField";
import { useLoopingMusic } from "@/src/hooks/useLoopingMusic";
import ClipActionSheet, {
  type ClipAction,
} from "@/src/components/autoReel/clipActionSheet";
import MomentPickerModal, {
  formatMoment,
} from "@/src/components/autoReel/momentPickerModal";

/**
 * Video design in `review`: the AI picked a moment of the uploaded video for
 * each photo / video slot. Per slot the user keeps it, moves it, or attaches
 * their own file; texts start from `design.texts`; silent designs need music
 * or "No music". "Generate reel" → POST …/build (202 → pending), then the
 * parent polls to `ready` as usual. Changing picks never calls the AI again.
 *
 * `mode="edit"` (a `ready` / `failed` reel): one part — clips, text or music —
 * starts from the last build and only what changed is sent: slots, texts and
 * music the user didn't touch are left out and the server keeps them. Saving
 * remakes the reel and costs 1 reel credit.
 */

type SlotChoice =
  | { mode: "pick"; at: number | null; moved: boolean }
  | { mode: "file"; file: SlotFile }
  /** Edit: the user's own file from the last build — no copy on the phone */
  | { mode: "asset"; mediaId: number; kind: "image" | "video" };

/** What the last build used for one photo / video slot */
type BuiltChoice =
  | { mode: "pick"; at: number }
  | { mode: "asset"; mediaId: number; kind: "image" | "video" };

type LastBuild = {
  slots: Record<string, BuiltChoice>;
  texts: Record<string, unknown> | null;
};

type Props = {
  autoReel: AutoReel;
  /** Staff may only build what they started */
  canChange: boolean;
  /** Build accepted (202) — the auto reel is `pending` again */
  onBuilt: (autoReel: AutoReel) => void;
  /** "edit": a ready / failed reel — starts from the last build, sends only what changed, costs 1 reel credit */
  mode?: "review" | "edit";
  /** Edit: which part to show */
  section?: "clips" | "text" | "music";
  /** Edit: leave without saving */
  onCancel?: () => void;
  /** Edit: reel credits left this month (null = unknown) */
  creditsRemaining?: number | null;
};

/** The moment picker rounds to 0.1 s — closer than this is the same moment */
const SAME_MOMENT_SECONDS = 0.05;

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
    /** Clip row pinned above the footer — always in reach while scrolling */
    clipBar: {
      paddingTop: moderateHeightScale(10),
      backgroundColor: theme.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    clipError: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

/** `design.choices` is read loosely — numbers may come as strings */
function toNumber(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Same track (by its url), or both "no music". undefined = unknown → never the same as a choice. */
function sameMusic(
  a: AutoReelMusic | null | undefined,
  b: AutoReelMusic | null | undefined,
) {
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  return a.url === b.url;
}

function sameMoment(a: number, b: number) {
  // Inclusive (+ float slack): the picker rounds to 0.1 s, so 3.55 → 3.6 is
  // an untouched moment, not a change
  return Math.abs(a - b) <= SAME_MOMENT_SECONDS + 1e-6;
}

/** Badge only: a moment away from the AI's pick reads "Your moment" */
function movedFromAi(
  pick: AutoReelPick | undefined,
  at: number,
  loose: boolean,
): boolean {
  if (pick?.found === false || pick?.at == null) return true;
  return loose ? !sameMoment(pick.at, at) : pick.at !== at;
}

/** One slot of the last build: a moment of the uploaded video, or an own file */
function readBuiltChoice(
  value: unknown,
  slot: AutoReelSlot,
  sourceId: number | null,
): BuiltChoice | null {
  const seconds = toNumber(value);
  if (seconds != null) return { mode: "pick", at: seconds };
  if (!isRecord(value)) return null;
  const at = toNumber(value.at);
  const mediaId = toNumber(value.media_asset_id);
  // A moment may name the uploaded video itself as its asset
  if (mediaId != null && (at == null || mediaId !== sourceId)) {
    const kind = value.kind ?? value.type;
    return {
      mode: "asset",
      mediaId,
      kind:
        kind === "image" || kind === "video"
          ? kind
          : slot.kind === "video"
            ? "video"
            : "image",
    };
  }
  return at != null && value.found !== false ? { mode: "pick", at } : null;
}

/**
 * Edit starts from the last build. `design.choices` comes keyed per slot
 * ({ KEY: { at } | { media_asset_id } | seconds }) or shaped like the build
 * payload ({ slots, texts, music }) — both are read. A slot it doesn't cover
 * falls back to the picks: an own file first, then the AI's moment.
 */
function readLastBuild(autoReel: AutoReel): LastBuild {
  const design = autoReel.design;
  const media = mediaSlots(design?.slots);
  const keys = new Set(media.map((slot) => slot.key));
  const raw: unknown = design?.choices;
  const choices = isRecord(raw) ? raw : {};
  // Payload shape — unless a slot really is called "slots" / "texts"
  const slotChoices =
    isRecord(choices.slots) && !keys.has("slots") ? choices.slots : choices;
  const texts =
    isRecord(choices.texts) && !keys.has("texts") ? choices.texts : null;
  const sourceId = autoReel.source_media_asset_id ?? null;
  const slots: Record<string, BuiltChoice> = {};
  for (const slot of media) {
    const built =
      readBuiltChoice(slotChoices[slot.key], slot, sourceId) ??
      readBuiltChoice(design?.picks?.[slot.key], slot, sourceId);
    if (built) slots[slot.key] = built;
  }
  return { slots, texts };
}

/** Edit: a slot as the last build left it (not known → nothing is sent for it) */
function builtToChoice(
  built: BuiltChoice | undefined,
  pick: AutoReelPick | undefined,
): SlotChoice {
  if (built?.mode === "asset") {
    return { mode: "asset", mediaId: built.mediaId, kind: built.kind };
  }
  if (built?.mode === "pick") {
    return {
      mode: "pick",
      at: built.at,
      moved: movedFromAi(pick, built.at, true),
    };
  }
  return { mode: "pick", at: null, moved: false };
}

/** Edit: differs from the last build — only these slots are sent */
function choiceChanged(
  choice: SlotChoice | undefined,
  built: BuiltChoice | undefined,
): boolean {
  if (choice?.mode === "file") return true;
  if (choice?.mode === "asset") {
    return built?.mode !== "asset" || built.mediaId !== choice.mediaId;
  }
  if (choice?.mode !== "pick" || choice.at == null) return false;
  return built?.mode !== "pick" || !sameMoment(built.at, choice.at);
}

function initialChoices(
  autoReel: AutoReel,
  lastBuild: LastBuild | null,
): Record<string, SlotChoice> {
  const design = autoReel.design;
  const out: Record<string, SlotChoice> = {};
  for (const slot of mediaSlots(design?.slots)) {
    const pick = design?.picks?.[slot.key];
    out[slot.key] = lastBuild
      ? builtToChoice(lastBuild.slots[slot.key], pick)
      : {
          mode: "pick",
          at: pick?.found !== false && pick?.at != null ? pick.at : null,
          moved: false,
        };
  }
  return out;
}

/**
 * Review: `design.texts`. Edit: the last build's texts, else `design.texts`,
 * else the business name for a `prefill` slot (only changed texts are sent).
 */
function initialTexts(
  autoReel: AutoReel,
  lastBuild: LastBuild | null,
  businessName: string,
): Record<string, string> {
  const design = autoReel.design;
  const out: Record<string, string> = {};
  for (const slot of textSlots(design?.slots)) {
    const built = lastBuild?.texts?.[slot.key];
    const start = design?.texts?.[slot.key];
    let value =
      typeof built === "string" && built.trim()
        ? built
        : typeof start === "string"
          ? start
          : "";
    if (
      lastBuild &&
      !value.trim() &&
      slot.prefill === "business_name" &&
      businessName
    ) {
      value = slot.max_length
        ? businessName.slice(0, slot.max_length)
        : businessName;
    }
    out[slot.key] = value;
  }
  return out;
}

/** First 422 message that no field shows — credits, the edit limit… */
function otherFieldError(error: any): string | null {
  const errors = error?.data?.errors ?? error?.response?.errors;
  if (!isRecord(errors)) return null;
  for (const [field, value] of Object.entries(errors)) {
    if (/^(slots|texts)\./.test(field) || /^music(\.|$)/.test(field)) continue;
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}

export default function DesignReview({
  autoReel,
  canChange,
  onBuilt,
  mode = "review",
  section,
  onCancel,
  creditsRemaining,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const businessName = useAppSelector(
    (s) => s.user.businessStatus?.business_name ?? s.user.business_name ?? "",
  );

  const edit = mode === "edit";
  const design = autoReel.design;
  // Edit / auto build: the compact CapCut-style clip editor, no AI instructions
  const plainCards = edit || isAutoBuiltReel(autoReel);
  const videoUrl = design?.video_url ?? null;
  const videoSeconds = design?.video_seconds ?? null;
  const slots = useMemo(() => mediaSlots(design?.slots), [design?.slots]);
  const texts = useMemo(() => textSlots(design?.slots), [design?.slots]);
  // Edit shows one part (no section = all of them)
  const showClips = !edit || !section || section === "clips";
  // `design.has_sound` first; when it isn't sent, the template's own fields
  const [templateSound, setTemplateSound] = useState<{
    hasSound: boolean | null;
    lengthSeconds: number | null;
    music: AutoReelMusic | null;
  } | null>(null);
  const templateId = autoReel.template?.id ?? null;
  const needsTemplateInfo =
    (design?.has_sound == null ||
      design?.length_seconds == null ||
      // No track on the reel: the template's own song may be the music
      design?.music == null ||
      // Edit → music: the template's own song gets its own row (with the
      // library and "Change" beside it), even when the reel already has a track
      edit) &&
    // Only the music field uses it
    (!edit || !section || section === "music");
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
            music: tpl.music ?? null,
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
  // Where the music starts (null = none; undefined = not known → chosen).
  // The server answers `music: null` also when the template's own song was
  // used, so: the reel's track, else the create step's choice (this session),
  // else — once the template loads — its own song, else the server's "none".
  const hasMusicKey = !!design && "music" in design;
  const templateMusic = templateSound?.music ?? null;
  const templateLoaded = templateSound != null;
  const [knownStartMusic] = useState<AutoReelMusic | null | undefined>(() =>
    design?.music ? design.music : createMusicFor(autoReel.id),
  );
  const startMusic: AutoReelMusic | null | undefined =
    knownStartMusic !== undefined
      ? knownStartMusic
      : (templateMusic ??
        ((edit || isAutoBuiltReel(autoReel)) &&
        hasMusicKey &&
        (templateLoaded || !needsTemplateInfo)
          ? null
          : undefined));
  // Review: silent designs choose music (or "No music"). Edit: only the
  // music part — the server keeps the reel's music when none is sent
  const showMusic = edit ? section === "music" || (!section && silent) : silent;

  // Edit: the last build, read once — changes are measured against it
  const [lastBuild] = useState(() => (edit ? readLastBuild(autoReel) : null));
  const [choices, setChoices] = useState<Record<string, SlotChoice>>(() =>
    initialChoices(autoReel, lastBuild),
  );
  const choicesRef = useRef(choices);
  // Compact editor: the clip being changed (a missing one first)
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    const missing = slots.find((slot) => {
      const choice = choices[slot.key];
      return choice?.mode === "pick" && choice.at == null && !edit;
    });
    return missing?.key ?? slots[0]?.key ?? null;
  });
  choicesRef.current = choices;
  const [startTexts] = useState(() =>
    initialTexts(autoReel, lastBuild, businessName),
  );
  const [textValues, setTextValues] =
    useState<Record<string, string>>(startTexts);
  const showTexts = !edit || !section || section === "text";
  // Review: undefined = not chosen yet. Edit: starts at the current music
  // (undefined only when the server doesn't say)
  const [music, setMusic] = useState<AutoReelMusic | null | undefined>(
    startMusic,
  );
  const musicChanged = music !== undefined && !sameMusic(music, startMusic);
  // The music field's own previews / library sheet have the sound
  const [musicFieldBusy, setMusicFieldBusy] = useState(false);
  // Known once the template loads — fill it in unless the user already chose
  useEffect(() => {
    if (startMusic === undefined) return;
    setMusic((prev) => (prev === undefined ? startMusic : prev));
  }, [startMusic]);
  const textChanged = useCallback(
    (key: string) =>
      (textValues[key] ?? "").trim() !== (startTexts[key] ?? "").trim(),
    [startTexts, textValues],
  );
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [textErrors, setTextErrors] = useState<Record<string, string>>({});
  const [musicError, setMusicError] = useState<string | null>(null);
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const [movingSlot, setMovingSlot] = useState<AutoReelSlot | null>(null);
  // Clip whose options sheet is open (compact clips)
  const [sheetSlotKey, setSheetSlotKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openClipSheet = (key: string) => {
    setSheetSlotKey(key);
    setSheetOpen(true);
  };
  // Phone video longer than its slot — picking which part to cut
  const [cutting, setCutting] = useState<{
    slot: AutoReelSlot;
    file: SlotFile;
    source: { uri: string; durationSeconds: number };
    at: number;
  } | null>(null);
  const [building, setBuilding] = useState(false);
  const buildingRef = useRef(false);
  // The chosen song plays under the clip preview, like in the reel. Not
  // while a song is previewed / the library is open, a moment is being
  // picked, the reel is being built or another screen is in front
  const focused = useIsFocused();
  useLoopingMusic(
    showMusic && music ? music.url : null,
    focused && !musicFieldBusy && !cutting && !movingSlot && !building,
  );
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
    // Edit's text / music parts show no slot cards
    if (!showClips || !videoUrl || !missingFrames) return;
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
  }, [missingFrames, showClips, videoUrl]);

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
          showBanner(slot.label, picked.error, "error", 4000);
          return;
        }
        if (slotNeedsCut(slot, picked.file)) {
          const uri = await localSlotVideoUri(picked.file);
          // iOS can't present the trimmer while the gallery is still closing
          if (Platform.OS === "ios") {
            await new Promise<void>((resolve) => setTimeout(resolve, 450));
          }
          setCutting({
            slot,
            file: picked.file,
            source: { uri, durationSeconds: picked.file.durationSeconds ?? 0 },
            at: 0,
          });
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

  /** Move on a cut file: the trimmer again, on the same phone video. */
  const moveInFile = (slot: AutoReelSlot) => {
    const choice = choices[slot.key];
    if (choice?.mode !== "file" || !choice.file.source) return;
    const { uri, durationSeconds, at } = choice.file.source;
    setCutting({
      slot,
      file: choice.file,
      source: { uri, durationSeconds },
      at,
    });
  };

  const cutPart = async (at: number) => {
    if (!cutting) return;
    const { slot, file, source } = cutting;
    const seconds = slot.min_seconds ?? 0;
    setCutting(null);
    setPickingSlot(slot.key);
    try {
      // Let the trimmer's player let go of the file before exporting from it
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const cut = await cutSlotVideo(file, source, at, seconds);
      setChoices((prev) => ({
        ...prev,
        [slot.key]: { mode: "file", file: cut },
      }));
      clearSlotError(slot.key);
    } catch (error) {
      Logger.error("Error cutting own video for design slot:", error);
      setSlotErrors((prev) => ({ ...prev, [slot.key]: t("designCutFailed") }));
    } finally {
      setPickingSlot(null);
    }
  };

  // Review: back to the AI's pick. Edit: back to the last build.
  const undoSlot = (slot: AutoReelSlot) => {
    const pick = design?.picks?.[slot.key];
    setChoices((prev) => ({
      ...prev,
      [slot.key]: lastBuild
        ? builtToChoice(lastBuild.slots[slot.key], pick)
        : {
            mode: "pick",
            at: pick?.found !== false && pick?.at != null ? pick.at : null,
            moved: false,
          },
    }));
    clearSlotError(slot.key);
  };

  const slotsFilled = slots.every((slot) => {
    const choice = choices[slot.key];
    return (
      choice?.mode === "file" ||
      choice?.mode === "asset" ||
      (choice?.mode === "pick" && choice.at != null)
    );
  });
  const complete =
    // Edit: a slot the last build didn't tell us about stays as it is
    (edit || slotsFilled) &&
    // Edit: a text left as it was isn't sent (the server keeps it)
    texts.every(
      (slot) =>
        (edit && !textChanged(slot.key)) || !!textValues[slot.key]?.trim(),
    ) &&
    // Review of a silent design: music or "No music" is chosen
    (edit || !silent || music !== undefined);

  // Edit: something to save
  const dirty =
    edit &&
    (slots.some((slot) =>
      choiceChanged(choices[slot.key], lastBuild?.slots[slot.key]),
    ) ||
      texts.some((slot) => textChanged(slot.key)) ||
      (showMusic && musicChanged));

  // Review only — an edit starts from a finished build
  const notFound = edit
    ? []
    : slots.filter((slot) => design?.picks?.[slot.key]?.found === false);

  // The parent's count, else the reel's (null = unknown — the server still checks)
  const credits = creditsRemaining ?? autoReel.credits_remaining ?? null;
  const noCredits = edit && credits != null && credits <= 0;
  const noEditsLeft = edit && autoReelEditsLeft(autoReel) <= 0;

  const uploadAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const handleBuild = useCallback(async () => {
    if (buildingRef.current || !complete || (edit && !dirty)) return;
    buildingRef.current = true;
    setBuilding(true);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    let accepted = false;
    try {
      // Own files first (POST /api/media, no purpose) — kept if the build fails
      const toUpload = slots.filter((slot) => {
        const choice = choicesRef.current[slot.key];
        return choice?.mode === "file" && choice.file.mediaId == null;
      });
      let uploaded = 0;
      if (toUpload.length) setUploadPercent(0);
      const payloadSlots: NonNullable<BuildAutoReelPayload["slots"]> = {};
      for (const slot of slots) {
        const choice = choicesRef.current[slot.key];
        // Edit: only what changed — the server keeps the rest of the last build
        if (edit && !choiceChanged(choice, lastBuild?.slots[slot.key]))
          continue;
        if (choice?.mode === "pick" && choice.at != null) {
          payloadSlots[slot.key] = { at: choice.at };
          continue;
        }
        if (choice?.mode === "asset") {
          payloadSlots[slot.key] = { media_asset_id: choice.mediaId };
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

      // Review: every text. Edit: only the changed ones (the server keeps the rest)
      const payloadTexts: Record<string, string> = {};
      for (const slot of texts) {
        if (edit && !textChanged(slot.key)) continue;
        payloadTexts[slot.key] = (textValues[slot.key] ?? "").trim();
      }
      // Review of a silent design: the choice (null = No music) — the
      // template's own song goes unsaid (the server uses it; it refuses that
      // track in `music`). Edit: only a new choice — left out, the server
      // keeps the reel's music.
      const keepsTemplateSong =
        !!templateMusic && !!music && music.url === templateMusic.url;
      const musicPayload: Pick<BuildAutoReelPayload, "music"> = edit
        ? showMusic && musicChanged
          ? { music: music ?? null }
          : {}
        : silent && !keepsTemplateSong
          ? { music: music ?? null }
          : {};
      const basePayload: BuildAutoReelPayload = {
        // Edit: no `slots` / `texts` at all when none changed
        ...(edit && !Object.keys(payloadSlots).length
          ? {}
          : { slots: payloadSlots }),
        ...(edit && !Object.keys(payloadTexts).length
          ? {}
          : { texts: payloadTexts }),
      };
      let data: AutoReel;
      try {
        data = await buildAutoReel(autoReel.id, {
          ...basePayload,
          ...musicPayload,
        });
      } catch (error: any) {
        // The template's own song was left out (older servers refused it in
        // `music`), but this server wants the choice said out loud: send it.
        // A refused build makes nothing and uses no credit, so one more try
        // is safe.
        const leftOutSong =
          !("music" in musicPayload) &&
          !!music &&
          (silent || (edit && showMusic));
        if (!leftOutSong || !musicFieldError(error)) throw error;
        if (controller.signal.aborted) return;
        data = await buildAutoReel(autoReel.id, { ...basePayload, music });
      }
      accepted = true;
      onBuilt(data);
    } catch (error: any) {
      if (controller.signal.aborted || isUploadCancelled(error)) return;
      Logger.error("Failed to build design auto reel:", error);
      const slotErrs = keyedFieldErrors(error, "slots");
      const textErrs = keyedFieldErrors(error, "texts");
      const musicErr = musicFieldError(error);
      // A refused own file goes up again next time (a kept one keeps its id)
      setChoices((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(slotErrs)) {
          const choice = next[key];
          if (choice?.mode === "file") {
            next[key] = {
              mode: "file",
              file: { ...choice.file, mediaId: null },
            };
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
        // No credits left / edit limit reached
        otherFieldError(error) ||
        (error instanceof VideoTooLargeError
          ? t("autoReelVideoTooLarge")
          : null) ||
        error?.message ||
        t("failedToStartGeneration");
      showBanner(t("error"), message, "error", 4500);
    } finally {
      // After a 202 the reel is being made — no second build from this screen
      if (!accepted) buildingRef.current = false;
      setUploadPercent(null);
      setBuilding(false);
    }
  }, [
    autoReel.id,
    complete,
    dirty,
    edit,
    lastBuild,
    music,
    musicChanged,
    onBuilt,
    showBanner,
    showMusic,
    silent,
    slots,
    t,
    templateMusic,
    textChanged,
    textValues,
    texts,
  ]);

  // Edit costs a reel credit — ask first
  const confirmRemake = () => {
    Alert.alert(
      t("autoBuildRemakeTitle"),
      credits != null
        ? t("autoBuildRemakeBodyCount", { count: Math.max(0, credits) })
        : t("autoBuildRemakeBody"),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("autoBuildSaveRemake"), onPress: () => void handleBuild() },
      ],
    );
  };

  const badgeFor = (slot: AutoReelSlot, choice: SlotChoice | undefined) => {
    if (choice?.mode === "file" || choice?.mode === "asset") {
      const kind = choice.mode === "file" ? choice.file.kind : choice.kind;
      return {
        label: kind === "video" ? t("designYourVideo") : t("designYourPhoto"),
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
    // Edit: the last build is there, we just weren't told — not "Not found"
    if (edit) return null;
    return { label: t("designNotFound"), tone: "missing" as const };
  };

  const disabled = !canChange || building;

  const titles = !edit
    ? {
        title: t("designReviewTitle"),
        subtitle: plainCards
          ? t("autoBuildTapClip")
          : t("designReviewSubtitle"),
      }
    : section === "clips"
      ? { title: t("autoBuildEditClipsTitle"), subtitle: t("autoBuildTapClip") }
      : section === "text"
        ? {
            title: t("autoBuildEditTextTitle"),
            subtitle: t("autoBuildEditTextSubtitle"),
          }
        : section === "music"
          ? {
              title: t("autoBuildEditMusicTitle"),
              subtitle: t("autoBuildEditMusicSubtitle"),
            }
          : { title: t("autoBuildEdit"), subtitle: null };

  const footerHint = (() => {
    if (edit) {
      if (noCredits) return t("autoBuildNoCreditsAction");
      if (noEditsLeft) return t("autoBuildEditLimit");
      if (!dirty) return t("autoBuildEditNoChanges");
      if (complete) return null;
      // Silent design whose current music is unknown: the music is missing
      if (silent && music === undefined) return t("designMusicRequired");
      return t("autoBuildEditFillText");
    }
    if (complete) return null;
    return silent && music === undefined && slotsFilled
      ? t("designMusicRequired")
      : t("designReviewIncomplete");
  })();

  /** What one slot holds now, and whether it differs from where it started. */
  const clipInfo = (slot: AutoReelSlot) => {
    const choice = choices[slot.key];
    const pickAt = choice?.mode === "pick" ? choice.at : null;
    const ownFile = choice?.mode === "file" || choice?.mode === "asset";
    const original = design?.picks?.[slot.key];
    const changed = edit
      ? choiceChanged(choice, lastBuild?.slots[slot.key])
      : choice?.mode === "file" || (choice?.mode === "pick" && choice.moved);
    const canUndo = edit
      ? changed
      : changed && original?.found !== false && original?.at != null;
    const missing = !ownFile && pickAt == null && !edit;
    const thumbUri =
      choice?.mode === "file"
        ? choice.file.thumbnailUri
        : pickAt != null
          ? frames[frameKey(pickAt)] || null
          : null;
    return { choice, pickAt, ownFile, changed, canUndo, missing, thumbUri };
  };

  /** Options for the tapped clip — replaces the buttons under the strip. */
  const renderClipSheet = () => {
    const slot = sheetSlotKey
      ? slots.find((item) => item.key === sheetSlotKey)
      : null;
    if (!slot || !canChange) return null;
    const info = clipInfo(slot);
    const index = slots.indexOf(slot);
    const seconds =
      slot.kind === "video" && slot.min_seconds ? slot.min_seconds : null;
    const badge = badgeFor(slot, info.choice);
    const close = () => setSheetOpen(false);
    const cutFrom =
      info.choice?.mode === "file" ? info.choice.file.source : null;
    const actions: ClipAction[] = [
      ...(cutFrom && seconds
        ? [
            {
              key: "cut",
              icon: "content-cut" as const,
              label: t("designMoveInFile"),
              subtitle: t("designSheetMoveInFileSub", {
                seconds: Math.round(seconds),
              }),
              disabled: disabled || !!pickingSlot,
              onPress: () => {
                close();
                moveInFile(slot);
              },
            },
          ]
        : []),
      ...(videoUrl
        ? [
            {
              key: "moment",
              icon: "tune" as const,
              label: info.ownFile
                ? t("designUseMainVideo")
                : info.pickAt != null
                  ? t("designMoveMoment")
                  : t("designChooseMoment"),
              subtitle: info.ownFile
                ? seconds
                  ? t("designSheetMainVideoClipSub", {
                      seconds: Math.round(seconds),
                    })
                  : t("designSheetMainVideoPhotoSub")
                : seconds
                  ? t("designSheetMomentClipSub", {
                      seconds: Math.round(seconds),
                    })
                  : t("designSheetMomentPhotoSub"),
              primary: info.missing,
              disabled,
              onPress: () => {
                close();
                setMovingSlot(slot);
              },
            },
          ]
        : []),
      {
        key: "file",
        icon: "swap-horiz",
        label: info.ownFile ? t("designReplace") : t("designUseOwnFile"),
        subtitle:
          slot.kind === "video"
            ? seconds
              ? t("designSheetFileVideoMinSub", {
                  seconds: Math.round(seconds),
                })
              : t("designSheetFileVideoSub")
            : t("designSheetFilePhotoSub"),
        primary: info.missing && !videoUrl,
        disabled: disabled || !!pickingSlot,
        loading: pickingSlot === slot.key,
        onPress: () => {
          close();
          void attachFile(slot);
        },
      },
      ...(info.canUndo
        ? [
            {
              key: "undo",
              icon: "undo" as const,
              label: edit ? t("autoBuildUndoChange") : t("designKeepAiPick"),
              subtitle: edit
                ? t("designSheetUndoSub")
                : t("designSheetKeepAiSub"),
              disabled,
              onPress: () => {
                close();
                undoSlot(slot);
              },
            },
          ]
        : []),
    ];
    return (
      <ClipActionSheet
        visible={sheetOpen}
        onClose={close}
        title={[
          `${index + 1} · ${slot.label}`,
          seconds ? `${Math.round(seconds)}s` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        status={badge?.label}
        statusMissing={badge?.tone === "missing"}
        actions={actions}
      />
    );
  };

  const selectedIndex = Math.max(
    0,
    slots.findIndex((slot) => slot.key === selectedKey),
  );

  /** The clip row, pinned above Build reel; tap → select + options. */
  const renderClipBar = () => {
    const items: ClipItem[] = slots.map((slot) => {
      const info = clipInfo(slot);
      return {
        key: slot.key,
        label: slot.label,
        secondsLabel:
          slot.kind === "video" && slot.min_seconds
            ? `${Math.round(slot.min_seconds)}s`
            : null,
        thumbUri: info.thumbUri,
        thumbLoading:
          pickingSlot === slot.key ||
          (info.pickAt != null && frames[frameKey(info.pickAt)] === undefined),
        isVideo: slot.kind === "video",
        state: info.missing
          ? "missing"
          : info.ownFile
            ? "own"
            : info.changed
              ? "changed"
              : "ai",
      };
    });
    const slot = slots[selectedIndex];
    if (!slot) return null;
    return (
      <View style={styles.clipBar}>
        <ClipStrip
          items={items}
          selectedKey={slot.key}
          onSelect={(key) => {
            setSelectedKey(key);
            if (canChange) openClipSheet(key);
          }}
        />
      </View>
    );
  };

  /** CapCut-style: the selected clip plays on top; its name and state are on it. */
  const renderCompactClips = () => {
    const index = selectedIndex;
    const slot = slots[index];
    if (!slot) return null;
    const info = clipInfo(slot);
    const choice = info.choice;
    const seconds =
      slot.kind === "video" && slot.min_seconds ? slot.min_seconds : null;
    const fileVideo = choice?.mode === "file" && choice.file.kind === "video";
    const badge = badgeFor(slot, choice);
    return (
      <>
        <ClipPreview
          videoUri={
            fileVideo
              ? choice.file.uri
              : info.pickAt != null && slot.kind === "video"
                ? videoUrl
                : null
          }
          at={fileVideo ? 0 : (info.pickAt ?? 0)}
          seconds={seconds}
          imageUri={
            choice?.mode === "file" && !fileVideo
              ? choice.file.uri
              : info.thumbUri
          }
          tag={[
            `${index + 1} · ${slot.label}`,
            seconds ? `${Math.round(seconds)}s` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          emptyText={
            info.missing
              ? t("designChooseMoment")
              : (badge?.label ?? slot.label)
          }
          onPress={canChange ? () => openClipSheet(slot.key) : undefined}
        />
        {slotErrors[slot.key] ? (
          <Text style={styles.clipError}>{slotErrors[slot.key]}</Text>
        ) : null}
      </>
    );
  };

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={moderateHeightScale(120)}
      >
        <FlowTitle title={titles.title} subtitle={titles.subtitle} />
        {notFound.length && !plainCards ? (
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

        {showClips && plainCards ? renderCompactClips() : null}
        {showClips && !plainCards
          ? slots.map((slot) => {
              const choice = choices[slot.key];
              const pickAt = choice?.mode === "pick" ? choice.at : null;
              const ownFile =
                choice?.mode === "file" || choice?.mode === "asset";
              const original = design?.picks?.[slot.key];
              const changed = edit
                ? choiceChanged(choice, lastBuild?.slots[slot.key])
                : choice?.mode === "file" ||
                  (choice?.mode === "pick" && choice.moved);
              const canUndo = edit
                ? changed
                : changed && original?.found !== false && original?.at != null;
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
                              pickAt != null || ownFile
                                ? t("designMoveMoment")
                                : t("designChooseMoment"),
                            onPress: () => setMovingSlot(slot),
                            disabled,
                          },
                        ]
                      : []),
                    {
                      icon: "upload-file" as const,
                      label: ownFile
                        ? t("designReplace")
                        : t("designUseOwnFile"),
                      onPress: () => void attachFile(slot),
                      disabled: disabled || !!pickingSlot,
                    },
                    ...(canUndo
                      ? [
                          {
                            icon: "undo" as const,
                            label: edit
                              ? t("autoBuildUndoChange")
                              : t("designKeepAiPick"),
                            onPress: () => undoSlot(slot),
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
                    (choice?.mode === "file" && choice.file.kind === "video") ||
                    (choice?.mode === "asset" && choice.kind === "video")
                  }
                  badge={badgeFor(slot, choice)}
                  error={slotErrors[slot.key]}
                  onThumbPress={
                    canChange && videoUrl && !ownFile
                      ? () => setMovingSlot(slot)
                      : null
                  }
                  actions={actions}
                />
              );
            })
          : null}

        {showTexts && texts.length ? (
          <>
            {!edit || (showClips && slots.length > 0) ? (
              <View style={styles.divider} />
            ) : null}
            {/* Edit's text part sits right under its own title */}
            {!edit || section !== "text" ? (
              <SectionLabel label={t("designTextsTitle")} />
            ) : null}
            {texts.map((slot) => (
              <FlowTextField
                key={slot.key}
                label={slot.label}
                required
                value={textValues[slot.key] ?? ""}
                onChangeText={(v) => {
                  setTextValues((prev) => ({
                    ...prev,
                    [slot.key]: slot.max_length
                      ? v.slice(0, slot.max_length)
                      : v,
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

        {showMusic ? (
          <>
            {!edit ||
            (showClips && slots.length > 0) ||
            (showTexts && texts.length > 0) ? (
              <View style={styles.divider} />
            ) : null}
            <DesignMusicField
              value={music}
              onChange={(next) => {
                setMusic(next);
                setMusicError(null);
              }}
              lengthSeconds={reelSeconds}
              error={musicError}
              disabled={disabled}
              compact
              defaultMusic={templateMusic}
              onAudioBusyChange={setMusicFieldBusy}
            />
          </>
        ) : null}

        {plainCards && showClips ? null : edit ? (
          <InfoNote
            icon="toll"
            tone={noCredits ? "warm" : "info"}
            text={
              credits != null
                ? `${t("autoBuildEditCreditNote")} ${t("autoBuildCreditsLeft", {
                    count: Math.max(0, credits),
                  })}`
                : t("autoBuildEditCreditNote")
            }
          />
        ) : (
          <InfoNote icon="auto-awesome" text={t("designReviewFreeNote")} />
        )}
      </KeyboardAwareScrollView>

      {showClips && plainCards ? renderClipBar() : null}

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
          primary={
            edit
              ? {
                  label: t("autoBuildSaveRemake"),
                  icon: "auto-awesome",
                  onPress: confirmRemake,
                  disabled:
                    !dirty ||
                    !complete ||
                    building ||
                    !!pickingSlot ||
                    noCredits ||
                    noEditsLeft,
                  loading: building,
                }
              : {
                  label: t("designBuildCta"),
                  icon: "auto-awesome",
                  onPress: () => void handleBuild(),
                  disabled: !complete || building || !!pickingSlot,
                  loading: building,
                }
          }
          tertiary={
            edit && onCancel
              ? { label: t("cancel"), onPress: onCancel, disabled: building }
              : null
          }
          hint={footerHint}
        />
      ) : null}

      {renderClipSheet()}

      {cutting ? (
        <MomentPickerModal
          visible
          videoUrl={cutting.source.uri}
          label={cutting.slot.label}
          clipSeconds={cutting.slot.min_seconds ?? null}
          videoSeconds={cutting.source.durationSeconds || null}
          initialAt={cutting.at}
          posterUri={cutting.file.thumbnailUri}
          doneLabel={t("designCutThisPart")}
          onCancel={() => setCutting(null)}
          onDone={(at) => void cutPart(at)}
        />
      ) : null}

      {videoUrl && movingSlot ? (
        <MomentPickerModal
          visible
          videoUrl={videoUrl}
          label={movingSlot.label}
          clipSeconds={
            movingSlot.kind === "video"
              ? (movingSlot.min_seconds ?? null)
              : null
          }
          videoSeconds={videoSeconds}
          initialAt={(() => {
            const choice = choices[movingSlot.key];
            return choice?.mode === "pick" ? choice.at : null;
          })()}
          posterUri={(() => {
            const choice = choices[movingSlot.key];
            return choice?.mode === "pick" && choice.at != null
              ? frames[frameKey(choice.at)] || null
              : null;
          })()}
          onCancel={() => setMovingSlot(null)}
          onDone={(at) => {
            const key = movingSlot.key;
            setChoices((prev) => ({
              ...prev,
              [key]: {
                mode: "pick",
                at,
                // Edit compares within the picker's rounding; review as before
                moved: movedFromAi(design?.picks?.[key], at, edit),
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
