import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ApiService } from "@/src/services/api";
import { aiRequestsEndpoints } from "@/src/services/endpoints";
import {
  getAutoReel,
  getGenerationStatus,
  listAutoReels,
  listMyReels,
} from "@/src/services/reelsService";
import {
  autoReelMissingStages,
  isAutoReelInProgress,
  type AutoReel,
  type GenerationStatus,
  type OwnerReel,
} from "@/src/types/reels";
import dayjs from "dayjs";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { moderateWidthScale } from "@/src/theme/dimensions";
import RetryButton from "@/src/components/retryButton";
import EmptyState from "@/src/components/emptyState";
import Logger from "@/src/services/logger";

const PER_PAGE = 20;
const POLL_INTERVAL_MS = 10000;
/** Auto reels: poll in-progress items every 5 s (auto-reel guide) */
const REELS_POLL_MS = 5000;

const HAIR_TRYON_JOB_TYPES = new Set([
  "generate_with_replicate",
  "hair_pipeline",
]);

export type AiRequestJob = {
  job_id: string;
  user_id: number;
  request_payload: {
    job_type: string;
    [key: string]: unknown;
  };
  response?: Record<string, unknown>;
  expiry_date: string;
  status: string;
  message?: string | null;
  created_at: string;
  updated_at: string;
};

type AiRequestsApiResponse = {
  data: AiRequestJob[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    current_page_url: string;
    from: number | null;
    path: string;
    per_page: string;
    to: number | null;
  };
};

type RequestTab = "tools" | "reels";

/** Unified row for Tools jobs and AI auto reels */
type RequestListItem = {
  key: string;
  kind: "job" | "autoReel" | "templateReel";
  title: string;
  /** UI status: completed | failed | processing | review | needs_input */
  status: string;
  createdAt: string;
  /** Second line — reel rows only (caption / why it needs input) */
  prompt?: string;
  autoReelId?: number;
  reelId?: number | null;
  jobId?: string;
  /** Raw job_type / try-on category — drive result screen + icon, never the title */
  jobType?: string;
  category?: string | null;
};

type RequestSection = {
  dayKey: string;
  title: string;
  count: number;
  data: RequestListItem[];
};

function isHairTryonJob(job: AiRequestJob): boolean {
  const jobType =
    job.request_payload?.job_type ?? job.response?.job_type ?? "";
  return (
    typeof jobType === "string" && HAIR_TRYON_JOB_TYPES.has(jobType)
  );
}

function filterJobsForRole(
  jobs: AiRequestJob[],
  shouldFilterHairTryon: boolean,
): AiRequestJob[] {
  if (!shouldFilterHairTryon) return jobs;
  return jobs.filter(isHairTryonJob);
}

/** Shotstack template reels (they carry a generation_status) */
function isTemplateGeneratedReel(reel: OwnerReel): boolean {
  return reel.generation_status != null;
}

function isTemplateReelInProgress(status: GenerationStatus | null | undefined) {
  return status === "pending" || status === "rendering";
}

function mapGenerationToUiStatus(
  status: GenerationStatus | null | undefined,
): string {
  if (status === "ready") return "completed";
  if (status === "failed") return "failed";
  return "processing";
}

function mapAutoReelToUiStatus(autoReel: AutoReel): string {
  const { status } = autoReel;
  if (status === "ready") return "completed";
  if (status === "failed") return "failed";
  if (status === "review") {
    // Auto build stops here only when the AI missed a moment; otherwise it's a
    // video design waiting for its picks (also when the row has no `design`)
    return autoReelMissingStages(autoReel).length > 0 ? "needs_input" : "review";
  }
  return "processing";
}

/** `design.missing_stages` values → label keys */
const STAGE_LABEL_KEYS: Record<string, string> = {
  before: "autoBuildStageBefore",
  progress: "autoBuildStageProgress",
  after: "autoBuildStageAfter",
};

/** Why an auto build needs the user, e.g. "AI couldn't find a clear Before…" */
function missingStagesText(
  stages: string[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const labelKeys = stages.map((stage) => STAGE_LABEL_KEYS[stage.toLowerCase()]);
  if (labelKeys.length === 0 || labelKeys.some((key) => !key)) {
    return t("autoBuildMissingBodyGeneric");
  }
  return t("autoBuildMissingBody", {
    stages: labelKeys.map((key) => t(key)).join(t("autoBuildStageJoin")),
  });
}

/**
 * Silent refresh only re-reads page 1 — update those rows in place (and add
 * new ones on top) instead of dropping the pages the user already scrolled to.
 */
function mergeRefreshedFirstPage<T>(
  prev: T[],
  fresh: T[],
  keyOf: (item: T) => string | number,
): T[] {
  if (prev.length <= fresh.length) return fresh;
  const freshByKey = new Map(fresh.map((item) => [keyOf(item), item]));
  const prevKeys = new Set(prev.map(keyOf));
  const added = fresh.filter((item) => !prevKeys.has(keyOf(item)));
  return [
    ...added,
    ...prev.map((item) => freshByKey.get(keyOf(item)) ?? item),
  ];
}

function formatSectionDayLabel(dayKey: string, t: (key: string) => string): string {
  const sectionDate = dayjs(dayKey);
  if (!sectionDate.isValid()) return dayKey;

  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");

  if (sectionDate.isSame(today, "day")) {
    return t("today");
  }
  if (sectionDate.isSame(yesterday, "day")) {
    return t("yesterday");
  }
  return sectionDate.format("MMM D, YYYY");
}

function buildSections(
  items: RequestListItem[],
  t: (key: string, options?: Record<string, unknown>) => string,
  collapsedDays: Set<string>,
): RequestSection[] {
  const sectionsByDay = new Map<string, RequestListItem[]>();
  const orderedDayKeys: string[] = [];

  for (const item of items) {
    const dayKey = dayjs(item.createdAt).format("YYYY-MM-DD");
    if (!sectionsByDay.has(dayKey)) {
      sectionsByDay.set(dayKey, []);
      orderedDayKeys.push(dayKey);
    }
    sectionsByDay.get(dayKey)!.push(item);
  }

  return orderedDayKeys.map((dayKey) => {
    const dayItems = sectionsByDay.get(dayKey) ?? [];
    const dayLabel = formatSectionDayLabel(dayKey, t);
    return {
      dayKey,
      title: t("aiHistoryDayHeader", {
        date: dayLabel,
        count: dayItems.length,
      }),
      count: dayItems.length,
      // Folded day: header + count stay, rows aren't rendered
      data: collapsedDays.has(dayKey) ? [] : dayItems,
    };
  });
}

function formatTime(value: string): string {
  const d = dayjs(value);
  if (d.isValid()) {
    return d.format("h:mm A");
  }
  return value;
}

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type TileIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** job_type → aiResults resultType */
const JOB_RESULT_TYPES: Record<string, string> = {
  generate_with_replicate: "hairTryon",
  hair_pipeline: "hairTryon",
  generate_collage: "collage",
  generate_post: "post",
  generate_reel: "reel",
};

/** Social media jobs (owner Tools tab) → title key */
const JOB_TITLE_KEYS: Record<string, string> = {
  generate_post: "aiJobTitlePost",
  generate_collage: "aiJobTitleCollage",
  generate_reel: "aiJobTitleReel",
};

/** Try-on categories with one title whatever `gender` says */
const SINGLE_TRYON_TITLE_KEYS: Record<string, string> = {
  "nail-salon": "tryOnTitleNail",
  makeup: "tryOnTitleMakeup",
  tattoo: "tryOnTitleTattoo",
  "pet-services": "tryOnTitlePet",
  "brows-lashes": "tryOnTitleBrowsLashes",
  piercings: "tryOnTitlePiercing",
};

function tryOnTitleKey(category: string | null, gender: unknown): string {
  // Items made before categories existed were always hair
  if (category == null) return "tryOnTitleHair";
  if (category === "barbershop" || category === "beauty-salon") {
    if (gender === "male") return "tryOnTitleMenHair";
    if (gender === "female") return "tryOnTitleWomenHair";
    return "tryOnTitleHair";
  }
  if (category === "braids-locs") {
    if (gender === "male") return "tryOnTitleMenBraids";
    if (gender === "female") return "tryOnTitleWomenBraids";
    return "tryOnTitleBraids";
  }
  return SINGLE_TRYON_TITLE_KEYS[category] ?? "tryOnTitleGeneric";
}

type TileIcon = { name: TileIconName; bg: string; color: string };

/** Icon tile for a row: try-ons by category, the rest by kind / job_type */
function requestIcon(item: RequestListItem, theme: Theme): TileIcon {
  const neutral = { bg: theme.lightGreen07, color: theme.darkGreen };
  if (item.kind === "autoReel") return { name: "movie-filter", ...neutral };
  if (item.kind === "templateReel") {
    return { name: "view-dashboard-edit", ...neutral };
  }
  if (item.jobType && HAIR_TRYON_JOB_TYPES.has(item.jobType)) {
    switch (item.category) {
      case null:
      case undefined:
      case "barbershop":
      case "beauty-salon":
        return { name: "content-cut", bg: theme.apptMintBg, color: theme.apptMintAccent };
      case "braids-locs":
        return { name: "hair-dryer", bg: theme.apptGoldBg, color: theme.apptGoldAccent };
      case "nail-salon":
        return { name: "bottle-tonic", bg: theme.apptPinkBg, color: theme.apptPinkAccent };
      case "makeup":
        return { name: "lipstick", bg: theme.tileRose, color: theme.accentRose };
      case "tattoo":
        return { name: "needle", bg: theme.apptBlueBg, color: theme.apptBlueAccent };
      case "pet-services":
        return { name: "paw", bg: theme.apptPeachBg, color: theme.apptPeachAccent };
      case "brows-lashes":
        return { name: "eye-outline", bg: theme.apptLavenderBg, color: theme.apptLavenderAccent };
      case "piercings":
        return { name: "diamond-stone", bg: theme.apptBlueBg, color: theme.apptBlueAccent };
      default:
        return { name: "creation", ...neutral };
    }
  }
  if (item.jobType === "generate_collage") return { name: "view-grid", ...neutral };
  if (item.jobType === "generate_post") return { name: "image", ...neutral };
  if (item.jobType === "generate_reel") return { name: "video", ...neutral };
  return { name: "creation", ...neutral };
}

function jobToListItem(
  job: AiRequestJob,
  t: (key: string) => string,
): RequestListItem {
  const rawJobType = job.request_payload?.job_type ?? job.response?.job_type;
  const jobType = typeof rawJobType === "string" ? rawJobType : "";
  const rawCategory =
    job.request_payload?.category ?? job.response?.category ?? null;
  const category = typeof rawCategory === "string" ? rawCategory : null;
  const gender = job.request_payload?.gender ?? job.response?.gender ?? null;
  const titleKey = HAIR_TRYON_JOB_TYPES.has(jobType)
    ? tryOnTitleKey(category, gender)
    : (JOB_TITLE_KEYS[jobType] ?? "aiJobTitleGeneric");

  return {
    key: `job-${job.job_id}`,
    kind: "job",
    title: t(titleKey),
    status: (job.status ?? "processing").toLowerCase(),
    createdAt: job.created_at,
    jobId: job.job_id,
    jobType,
    category,
  };
}

/** Second line of an auto reel row */
function autoReelDetail(
  autoReel: AutoReel,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null | undefined {
  if (autoReel.status === "failed") return autoReel.error_message;
  const missingStages = autoReelMissingStages(autoReel);
  if (missingStages.length > 0) return missingStagesText(missingStages, t);
  const caption = autoReel.reel?.caption?.trim();
  // Auto-built and not published yet: the caption the AI suggested
  if (!caption && autoReel.status === "ready" && autoReel.reel == null) {
    return autoReel.design?.suggestions?.caption;
  }
  return caption;
}

function autoReelToListItem(
  autoReel: AutoReel,
  t: (key: string, options?: Record<string, unknown>) => string,
): RequestListItem {
  const detail = autoReelDetail(autoReel, t);
  return {
    key: `auto-reel-${autoReel.id}`,
    kind: "autoReel",
    title: autoReel.template?.name || t("autoReelTitle"),
    status: mapAutoReelToUiStatus(autoReel),
    createdAt:
      autoReel.created_at ?? autoReel.updated_at ?? new Date().toISOString(),
    prompt: detail?.trim() || undefined,
    autoReelId: autoReel.id,
    reelId: autoReel.reel_id,
  };
}

function templateReelToListItem(
  reel: OwnerReel,
  title: string,
): RequestListItem {
  const detail =
    reel.generation_status === "failed" ? reel.generation_error : reel.caption;
  return {
    key: `template-reel-${reel.id}`,
    kind: "templateReel",
    title,
    status: mapGenerationToUiStatus(reel.generation_status),
    createdAt: reel.created_at ?? reel.updated_at ?? new Date().toISOString(),
    prompt: detail?.trim() || undefined,
    reelId: reel.id,
  };
}

export default function AiRequests() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    returnTo?: string;
    fromProcessingModal?: string;
    tab?: string;
    highlightReelId?: string;
    highlightAutoReelId?: string;
  }>();
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const userRole = useAppSelector((state) => state.user.userRole);
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const isTryOnFlow =
    params.returnTo === "booking" || params.returnTo === "chat";
  const fromProcessingModal = params.fromProcessingModal === "1";
  // Customers only ever have try-ons; owner/staff lists also hold posts & reels
  const headerTitle =
    isTryOnFlow || (userRole !== "business" && userRole !== "staff")
      ? t("myFreshyTryOn")
      : t("aiRequests");
  const shouldFilterHairTryon = isTryOnFlow || userRole !== "business";
  const canFetchHistory = Boolean(accessToken) && !isGuest;
  // Auto reels list is business-wide for owner and staff
  const showReelsTab =
    !isTryOnFlow && (userRole === "business" || userRole === "staff");
  // Staff only have reels in AI Tools, so no Tools/Reels switch for them
  const reelsOnly = showReelsTab && userRole === "staff";

  const initialTab: RequestTab =
    reelsOnly || (showReelsTab && params.tab === "reels") ? "reels" : "tools";
  const [activeTab, setActiveTab] = useState<RequestTab>(initialTab);

  useEffect(() => {
    if (showReelsTab && params.tab === "reels") {
      setActiveTab("reels");
    }
  }, [params.tab, showReelsTab]);

  const handleRobotPress = useCallback(() => {
    if (fromProcessingModal) {
      if (router.canDismiss()) {
        router.dismiss(2);
      } else {
        router.back();
        router.back();
      }
      return;
    }
    router.back();
  }, [fromProcessingModal]);

  const [jobs, setJobs] = useState<AiRequestJob[]>([]);
  const [reels, setReels] = useState<AutoReel[]>([]);
  const [templateReels, setTemplateReels] = useState<OwnerReel[]>([]);
  // Reels tab pages two lists (auto reels + template reels) independently
  const autoPagingRef = useRef({ page: 0, hasMore: true });
  const templatePagingRef = useRef({ page: 0, hasMore: true });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Folded day keys — kept across refresh/poll, only while the screen is open
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(
    () => new Set(),
  );
  const isPollingRef = useRef(false);

  const toggleDay = useCallback((dayKey: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  }, []);

  const fetchJobs = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      silent: boolean = false,
    ) => {
      if (!canFetchHistory || !accessToken) {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
        return;
      }

      if (!silent) {
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);
        setLoadError(false);
      }

      try {
        const result = await ApiService.get<AiRequestsApiResponse>(
          aiRequestsEndpoints.list({ page, per_page: PER_PAGE }),
        );
        const raw = result?.data ?? [];
        const filtered = filterJobsForRole(raw, shouldFilterHairTryon);

        setJobs((prev) => {
          if (silent && !append && page === 1) {
            return mergeRefreshedFirstPage(prev, filtered, (j) => j.job_id);
          }
          if (!append) return filtered;
          const existing = new Set(prev.map((j) => j.job_id));
          return [...prev, ...filtered.filter((j) => !existing.has(j.job_id))];
        });
        // A silent page-1 refresh must not reset paging the user already did
        if (!silent) {
          setCurrentPage(page);
          setHasMore(Boolean(result?.links?.next));
        }
        setLoadError(false);
      } catch (error) {
        Logger.error("Failed to load AI requests:", error);
        if (!silent) setLoadError(true);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, canFetchHistory, refreshing, shouldFilterHairTryon],
  );

  const fetchReels = useCallback(
    async (
      page: number = 1,
      append: boolean = false,
      silent: boolean = false,
    ) => {
      if (!canFetchHistory || !accessToken || !showReelsTab) {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
        return;
      }

      if (!silent) {
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);
        setLoadError(false);
      }

      try {
        // Only what this user started (owner or staff): AI auto reels and
        // Shotstack template reels, merged by time below
        const firstPage = !append;
        const auto = autoPagingRef.current;
        const tpl = templatePagingRef.current;
        const autoPage = firstPage ? 1 : auto.page + 1;
        const tplPage = firstPage ? 1 : tpl.page + 1;
        const [autoResult, tplResult] = await Promise.allSettled([
          firstPage || auto.hasMore
            ? listAutoReels(autoPage, undefined, PER_PAGE, true)
            : Promise.resolve(null),
          firstPage || tpl.hasMore
            ? listMyReels(tplPage, undefined, PER_PAGE, true)
            : Promise.resolve(null),
        ]);
        if (autoResult.status === "rejected" && tplResult.status === "rejected") {
          throw autoResult.reason;
        }

        if (autoResult.status === "fulfilled" && autoResult.value) {
          const { autoReels, meta } = autoResult.value;
          if (!silent || !firstPage) {
            autoPagingRef.current = {
              page: meta.current_page ?? autoPage,
              hasMore: Boolean(meta.has_more),
            };
          }
          setReels((prev) => {
            if (silent && firstPage) {
              return mergeRefreshedFirstPage(prev, autoReels, (r) => r.id);
            }
            if (firstPage) return autoReels;
            const existing = new Set(prev.map((r) => r.id));
            return [...prev, ...autoReels.filter((r) => !existing.has(r.id))];
          });
        } else if (autoResult.status === "rejected") {
          Logger.error("Failed to load auto reels:", autoResult.reason);
        }

        if (tplResult.status === "fulfilled" && tplResult.value) {
          const { reels: pageReels, meta } = tplResult.value;
          const generated = pageReels.filter(isTemplateGeneratedReel);
          if (!silent || !firstPage) {
            templatePagingRef.current = {
              page: meta.current_page ?? tplPage,
              hasMore: Boolean(meta.has_more),
            };
          }
          setTemplateReels((prev) => {
            if (silent && firstPage) {
              return mergeRefreshedFirstPage(prev, generated, (r) => r.id);
            }
            if (firstPage) return generated;
            const existing = new Set(prev.map((r) => r.id));
            return [...prev, ...generated.filter((r) => !existing.has(r.id))];
          });
        } else if (tplResult.status === "rejected") {
          Logger.error("Failed to load template reels:", tplResult.reason);
        }

        if (!silent) {
          setCurrentPage(page);
          setHasMore(
            autoPagingRef.current.hasMore || templatePagingRef.current.hasMore,
          );
        }
        setLoadError(false);
      } catch (error) {
        Logger.error("Failed to load reel requests:", error);
        if (!silent) setLoadError(true);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, canFetchHistory, refreshing, showReelsTab],
  );

  const fetchActive = useCallback(
    (page: number = 1, append: boolean = false, silent: boolean = false) => {
      if (activeTab === "reels") {
        return fetchReels(page, append, silent);
      }
      return fetchJobs(page, append, silent);
    },
    [activeTab, fetchJobs, fetchReels],
  );

  useFocusEffect(
    useCallback(() => {
      if (!canFetchHistory) {
        setLoading(false);
        return;
      }

      setCurrentPage(1);
      setHasMore(true);
      void fetchActive(1, false);

      const intervalId = setInterval(() => {
        if (isPollingRef.current || !canFetchHistory) return;
        isPollingRef.current = true;
        fetchActive(1, false, true).finally(() => {
          isPollingRef.current = false;
        });
      }, POLL_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        isPollingRef.current = false;
      };
    }, [canFetchHistory, fetchActive]),
  );

  // In-progress ids, read by the poll without re-arming it on every update
  const inProgressIdsRef = useRef<number[]>([]);
  inProgressIdsRef.current = reels
    .filter((r) => isAutoReelInProgress(r.status))
    .map((r) => r.id);
  const templateInProgressIdsRef = useRef<number[]>([]);
  templateInProgressIdsRef.current = templateReels
    .filter((r) => isTemplateReelInProgress(r.generation_status))
    .map((r) => r.id);

  // Poll in-progress auto reels every 5 s — only while this screen is focused
  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "reels" || !showReelsTab) return;
      let cancelled = false;
      let running = false;
      const tick = async () => {
        const ids = inProgressIdsRef.current;
        const tplIds = templateInProgressIdsRef.current;
        if (running || (ids.length === 0 && tplIds.length === 0)) return;
        running = true;
        const [settled, tplSettled] = await Promise.all([
          Promise.allSettled(ids.map((id) => getAutoReel(id))),
          Promise.allSettled(tplIds.map((id) => getGenerationStatus(id))),
        ]);
        running = false;
        if (cancelled) return;
        const latestById = new Map<number, AutoReel>();
        settled.forEach((result, index) => {
          if (result.status === "fulfilled") {
            latestById.set(ids[index], result.value);
          } else {
            Logger.error(`Auto reel poll failed for ${ids[index]}:`, result.reason);
          }
        });
        if (latestById.size > 0) {
          setReels((prev) => prev.map((r) => latestById.get(r.id) ?? r));
        }
        const tplById = new Map<
          number,
          { generation_status: GenerationStatus; generation_error: string | null }
        >();
        tplSettled.forEach((result, index) => {
          if (result.status === "fulfilled") {
            tplById.set(tplIds[index], {
              generation_status: result.value.generation_status,
              generation_error: result.value.generation_error,
            });
          } else {
            Logger.error(
              `Template reel poll failed for ${tplIds[index]}:`,
              result.reason,
            );
          }
        });
        if (tplById.size > 0) {
          setTemplateReels((prev) =>
            prev.map((r) => {
              const latest = tplById.get(r.id);
              return latest ? { ...r, ...latest } : r;
            }),
          );
        }
      };
      const id = setInterval(() => {
        void tick();
      }, REELS_POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [activeTab, showReelsTab]),
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !canFetchHistory) return;
    void fetchActive(currentPage + 1, true);
  }, [loadingMore, hasMore, currentPage, fetchActive, canFetchHistory]);

  const handleRefresh = useCallback(() => {
    if (!canFetchHistory) return;
    setRefreshing(true);
    void fetchActive(1, false);
  }, [canFetchHistory, fetchActive]);

  const handleTabChange = useCallback(
    (tab: RequestTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setJobs([]);
      setReels([]);
      setTemplateReels([]);
      setCollapsedDays(new Set());
      setCurrentPage(1);
      setHasMore(true);
      setLoading(true);
      setLoadError(false);
      // useFocusEffect re-runs when fetchActive identity changes with activeTab
    },
    [activeTab],
  );

  const listItems = useMemo((): RequestListItem[] => {
    if (activeTab === "reels") {
      // Both kinds in one list, newest first
      return [
        ...reels.map((r) => autoReelToListItem(r, t)),
        ...templateReels.map((r) =>
          templateReelToListItem(r, t("reelTypeTemplateTitle")),
        ),
      ].sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
      );
    }
    return jobs.map((job) => jobToListItem(job, t));
  }, [activeTab, jobs, reels, templateReels, t]);

  const sections = useMemo(
    () => buildSections(listItems, t, collapsedDays),
    [listItems, t, collapsedDays],
  );

  const getStatusBadgeStyle = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return styles.jobCardStatusBadgeCompleted;
      if (s === "failed") return styles.jobCardStatusBadgeFailed;
      if (s === "needs_input") return styles.jobCardStatusBadgeNeedsInput;
      return styles.jobCardStatusBadgeProcessing;
    },
    [styles],
  );

  const getStatusTextColor = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return (colors as Theme).buttonBack;
      if (s === "failed") return (colors as Theme).red;
      return (colors as Theme).orangeBrownText;
    },
    [colors],
  );

  const getStatusIcon = useCallback((status: string): IconName => {
    const s = (status ?? "").toLowerCase();
    if (s === "completed") return "check-circle";
    if (s === "failed") return "error-outline";
    if (s === "review") return "rate-review";
    if (s === "needs_input") return "touch-app";
    return "schedule";
  }, []);

  const formatStatusLabel = useCallback(
    (status: string) => {
      const s = (status ?? "").toLowerCase();
      if (s === "completed") return t("completed");
      if (s === "failed") return t("generationFailed");
      if (s === "processing") return t("processingText").replace(/\.\.\.$/, "");
      if (s === "review") return t("designNeedsReview");
      if (s === "needs_input") return t("autoReelNeedsInput");
      return status?.charAt(0).toUpperCase() + (status?.slice(1) ?? "");
    },
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: RequestListItem }) => {
      const statusBadgeStyle = getStatusBadgeStyle(item.status);
      const statusColor = getStatusTextColor(item.status);
      const icon = requestIcon(item, theme);
      const isHighlighted =
        (item.kind === "autoReel" &&
          params.highlightAutoReelId != null &&
          String(item.autoReelId) === String(params.highlightAutoReelId)) ||
        (item.kind !== "job" &&
          params.highlightReelId != null &&
          item.reelId != null &&
          String(item.reelId) === String(params.highlightReelId));

      return (
        <TouchableOpacity
          style={[
            styles.jobCard,
            styles.shadow,
            isHighlighted && styles.jobCardHighlighted,
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${formatStatusLabel(item.status)}, ${formatTime(item.createdAt)}`}
          onPress={() => {
            if (item.kind === "autoReel" && item.autoReelId != null) {
              router.push({
                pathname: "/(main)/autoReel" as any,
                params: { autoReelId: String(item.autoReelId) },
              });
              return;
            }
            // Shotstack template reel → AI Results (status, preview, publish)
            if (item.kind === "templateReel" && item.reelId != null) {
              router.push({
                pathname: "/aiResults",
                params: {
                  reelId: String(item.reelId),
                  resultType: "reel",
                  ...(params.returnTo ? { returnTo: params.returnTo } : {}),
                },
              });
              return;
            }
            const resultType = JOB_RESULT_TYPES[item.jobType ?? ""] ?? "reel";
            if (item.jobId) {
              router.push({
                pathname: "/aiResults",
                params: {
                  jobId: item.jobId,
                  resultType,
                  ...(params.returnTo ? { returnTo: params.returnTo } : {}),
                },
              });
            }
          }}
        >
          <View style={[styles.jobCardIcon, { backgroundColor: icon.bg }]}>
            <MaterialCommunityIcons
              name={icon.name}
              size={moderateWidthScale(22)}
              color={icon.color}
            />
          </View>
          <View style={styles.jobCardContent}>
            <Text
              style={styles.jobCardTypeTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            {item.prompt ? (
              <Text
                style={styles.jobCardPromptText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.prompt}
              </Text>
            ) : null}
            <View style={styles.jobCardFooter}>
              <MaterialIcons
                name="access-time"
                size={moderateWidthScale(13)}
                color={theme.lightGreen}
              />
              <Text style={styles.jobCardMetaValue} numberOfLines={1}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={[styles.jobCardStatusBadge, statusBadgeStyle]}>
            <MaterialIcons
              name={getStatusIcon(item.status)}
              size={moderateWidthScale(12)}
              color={statusColor}
            />
            <Text style={[styles.jobCardStatusText, { color: statusColor }]}>
              {formatStatusLabel(item.status)}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={moderateWidthScale(20)}
            color={theme.lightGreen5}
          />
        </TouchableOpacity>
      );
    },
    [
      styles,
      theme,
      getStatusBadgeStyle,
      getStatusTextColor,
      getStatusIcon,
      formatStatusLabel,
      params.returnTo,
      params.highlightReelId,
      params.highlightAutoReelId,
    ],
  );

  const keyExtractor = useCallback((item: RequestListItem) => item.key, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: RequestSection }) => {
      const collapsed = collapsedDays.has(section.dayKey);
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          activeOpacity={0.7}
          onPress={() => toggleDay(section.dayKey)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
        >
          <Text style={styles.sectionHeaderText}>
            {formatSectionDayLabel(section.dayKey, t)}
          </Text>
          <View style={styles.sectionCountChip}>
            <Text style={styles.sectionCountText}>
              {t("aiHistoryCount", { count: section.count })}
            </Text>
          </View>
          <MaterialIcons
            name={collapsed ? "expand-more" : "expand-less"}
            size={moderateWidthScale(22)}
            color={theme.darkGreen}
          />
        </TouchableOpacity>
      );
    },
    [styles, t, theme.darkGreen, collapsedDays, toggleDay],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.buttonBack} />
      </View>
    );
  }, [loadingMore, styles.loadingFooter, theme.buttonBack]);

  const renderTabs = useCallback(() => {
    if (!showReelsTab || reelsOnly) return null;
    return (
      <View style={styles.tabsRow} accessibilityRole="tablist">
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "tools" && styles.tabButtonActive,
          ]}
          onPress={() => handleTabChange("tools")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "tools" }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "tools" && styles.tabButtonTextActive,
            ]}
          >
            {t("aiRequestsTabTools")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "reels" && styles.tabButtonActive,
          ]}
          onPress={() => handleTabChange("reels")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "reels" }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "reels" && styles.tabButtonTextActive,
            ]}
          >
            {t("aiRequestsTabReels")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [showReelsTab, reelsOnly, styles, activeTab, handleTabChange, t]);

  const renderListHeader = useCallback(() => {
    const errorBanner =
      loadError && listItems.length > 0 ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <View style={styles.errorBannerRow}>
            <MaterialIcons
              name="wifi-off"
              size={moderateWidthScale(18)}
              color={theme.red}
            />
            <Text style={styles.errorBannerText}>{t("aiHistoryLoadError")}</Text>
          </View>
          <RetryButton
            onPress={() => void fetchActive(1, false)}
            loading={loading && !refreshing}
          />
        </View>
      ) : null;

    return (
      <View>
        {renderTabs()}
        {errorBanner}
      </View>
    );
  }, [
    loadError,
    listItems.length,
    styles.errorBanner,
    styles.errorBannerRow,
    styles.errorBannerText,
    theme.red,
    t,
    fetchActive,
    loading,
    refreshing,
    renderTabs,
  ]);

  const listEmptyComponent = useCallback(() => {
    if (loading) return null;

    if (isGuest) {
      return (
        <EmptyState
          icon="lock-outline"
          title={t("aiHistorySignInRequired")}
          subtitle={t("aiHistorySignInSubtitle")}
        />
      );
    }

    if (loadError) {
      return (
        <EmptyState
          icon="wifi-off"
          title={t("aiHistoryLoadErrorTitle")}
          subtitle={t("aiHistoryLoadError")}
          actionTitle={t("retry")}
          onActionPress={() => void fetchActive(1, false)}
        />
      );
    }

    if (activeTab === "reels") {
      return (
        <EmptyState
          icon="movie-filter"
          title={t("noReelRequests")}
          subtitle={t("reelRequestsEmptySubtitle")}
          actionTitle={t("exploreAiTools")}
          onActionPress={() => router.back()}
        />
      );
    }

    return (
      <EmptyState
        icon={isTryOnFlow ? "content-cut" : "auto-awesome"}
        title={isTryOnFlow ? t("noTryOnRequests") : t("noAiRequests")}
        subtitle={
          isTryOnFlow
            ? t("tryOnRequestsEmptySubtitle")
            : t("aiRequestsEmptySubtitle")
        }
        actionTitle={isTryOnFlow ? undefined : t("exploreAiTools")}
        onActionPress={isTryOnFlow ? undefined : () => router.back()}
      />
    );
  }, [loading, isGuest, loadError, isTryOnFlow, activeTab, t, fetchActive]);

  const showInitialLoader =
    loading && listItems.length === 0 && !loadError && canFetchHistory;

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader
        title={headerTitle}
        rightIcon={
          isTryOnFlow ? undefined : (
            <MaterialIcons
              name="smart-toy"
              size={moderateWidthScale(22)}
              color={theme.white}
            />
          )
        }
        onRightPress={handleRobotPress}
      />
      {showInitialLoader ? (
        <View style={styles.listContent}>
          {renderTabs()}
          <ActivityIndicator size="large" color={theme.buttonBack} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={listEmptyComponent}
          ListHeaderComponent={renderListHeader}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.buttonBack}
              colors={[theme.buttonBack]}
            />
          }
        />
      )}
    </View>
  );
}
