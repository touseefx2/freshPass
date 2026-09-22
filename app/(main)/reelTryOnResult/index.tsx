import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";
import {
  setGuestModeModalVisible,
  setTryOnPurchaseSuccessSource,
} from "@/src/state/slices/generalSlice";
import {
  getReelTryOnStatus,
  saveAiLook,
  startReelTryOn,
} from "@/src/services/reelsService";
import {
  clearPendingReelTryOn,
  pollReelTryOnJob,
  savePendingReelTryOn,
} from "@/src/utils/reelTryOnPoll";
import { resolveApiImageUrl } from "@/src/utils/media";
import ImagePickerModal from "@/src/components/imagePickerModal";
import HairPipelineProcessingModal, {
  INITIAL_HAIR_PIPELINE_STATE,
  type HairPipelineModalState,
} from "@/src/components/HairPipelineProcessingModal";
import type { ReelTryOnViewImages } from "@/src/types/reels";

type ViewKey = "front" | "left" | "right" | "back";
const VIEW_KEYS: ViewKey[] = ["front", "left", "right", "back"];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(32),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: moderateWidthScale(24),
    },
    image: {
      width: "100%",
      height: heightScale(360),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.grey15,
    },
    tabs: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(20),
    },
    tab: {
      flex: 1,
      paddingVertical: moderateHeightScale(10),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: theme.darkGreen,
    },
    tabText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    tabTextActive: {
      color: theme.white,
    },
    prompt: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(16),
    },
    actions: {
      gap: moderateHeightScale(10),
    },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(14),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    secondaryBtnText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    failedText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
  });

function firstAvailableView(images: ReelTryOnViewImages | null): ViewKey {
  if (!images) return "front";
  for (const key of VIEW_KEYS) {
    if (images[key]?.url) return key;
  }
  return "front";
}

export default function ReelTryOnResultScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const user = useAppSelector((s) => s.user);
  const isGuest = user.isGuest || !user.accessToken;

  const params = useLocalSearchParams<{
    job_id?: string;
    reel_id?: string;
    business_id?: string;
    service_id?: string;
    prompt?: string;
    estimated_minutes?: string;
  }>();

  const jobId = params.job_id ?? "";
  const reelId = params.reel_id ? Number(params.reel_id) : null;
  const businessId = params.business_id;
  const serviceId = params.service_id;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"processing" | "completed" | "failed">(
    "processing",
  );
  const [images, setImages] = useState<ReelTryOnViewImages | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("front");
  const [prompt, setPrompt] = useState(params.prompt ?? "");
  const [saving, setSaving] = useState(false);
  const [savedLookId, setSavedLookId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pipelineState, setPipelineState] = useState<HairPipelineModalState>(
    INITIAL_HAIR_PIPELINE_STATE,
  );
  const pollSignal = useRef({ cancelled: false });
  const pipelineStartRef = useRef<number | null>(null);
  const pipelineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const refreshQuota = useCallback(async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: { ai_quota?: number };
      }>(userEndpoints.details);
      if (response?.success && response.data?.ai_quota !== undefined) {
        dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
      }
    } catch {}
  }, [dispatch]);

  const applyCompleted = useCallback((payload: {
    images: ReelTryOnViewImages | null;
    prompt?: string | null;
  }) => {
    setImages(payload.images);
    setActiveView(firstAvailableView(payload.images));
    if (payload.prompt) setPrompt(payload.prompt);
    setStatus("completed");
    setLoading(false);
    void clearPendingReelTryOn();
    void refreshQuota();
  }, [refreshQuota]);

  useEffect(() => {
    pollSignal.current.cancelled = false;
    if (!jobId) {
      setLoading(false);
      setStatus("failed");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const current = await getReelTryOnStatus(jobId);
        if (!mounted) return;
        if (current.status === "completed") {
          applyCompleted({
            images: current.images,
            prompt: current.prompt,
          });
          return;
        }
        if (current.status === "failed") {
          setStatus("failed");
          setLoading(false);
          void clearPendingReelTryOn();
          return;
        }
        setStatus("processing");
        setLoading(false);
        const result = await pollReelTryOnJob(jobId, {
          signal: pollSignal.current,
        });
        if (!mounted || pollSignal.current.cancelled) return;
        if (!result) {
          setStatus("failed");
          return;
        }
        if (result.status === "completed") {
          applyCompleted({
            images: result.images,
            prompt: result.prompt,
          });
        } else {
          setStatus("failed");
          void clearPendingReelTryOn();
        }
      } catch (error: any) {
        Logger.error("Failed to load reel try-on result:", error);
        if (!mounted) return;
        setStatus("failed");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      pollSignal.current.cancelled = true;
    };
  }, [applyCompleted, jobId]);

  useEffect(() => {
    if (!pipelineState.visible || pipelineState.complete) return;
    const totalMs = pipelineState.estimatedMinutes * 60 * 1000;
    const start = pipelineStartRef.current ?? Date.now();
    pipelineStartRef.current = start;
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - start) / totalMs) * 100);
      setPipelineState((prev) => ({
        ...prev,
        progress: pct,
        complete: pct >= 100,
      }));
      if (pct >= 100 && pipelineIntervalRef.current) {
        clearInterval(pipelineIntervalRef.current);
        pipelineIntervalRef.current = null;
      }
    };
    tick();
    pipelineIntervalRef.current = setInterval(tick, 500);
    return () => {
      if (pipelineIntervalRef.current) {
        clearInterval(pipelineIntervalRef.current);
        pipelineIntervalRef.current = null;
      }
    };
  }, [
    pipelineState.visible,
    pipelineState.estimatedMinutes,
    pipelineState.complete,
  ]);

  const imageUrl = resolveApiImageUrl(images?.[activeView]?.url);

  const handleSaveLook = useCallback(async () => {
    if (!jobId) return;
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAiLook({ jobId, view: activeView });
      setSavedLookId(saved.id);
      showBanner(t("success"), t("lookSavedToMyLooks"), "success", 2500);
    } catch (error: any) {
      showBanner(
        t("error"),
        error?.message || t("failedToSaveLook"),
        "error",
        3000,
      );
    } finally {
      setSaving(false);
    }
  }, [activeView, dispatch, isGuest, jobId, showBanner, t]);

  const handleBookOriginal = useCallback(() => {
    if (!businessId) {
      showBanner(t("error"), t("businessNotAvailable"), "error", 2500);
      return;
    }
    router.push({
      pathname: "/(main)/bookingNow",
      params: {
        business_id: String(businessId),
        ...(serviceId ? { service_id: String(serviceId) } : {}),
        ...(reelId ? { reel_id: String(reelId) } : {}),
        ...(savedLookId ? { saved_look_id: String(savedLookId) } : {}),
      },
    });
  }, [businessId, reelId, router, savedLookId, serviceId, showBanner, t]);

  const handleFindPros = useCallback(() => {
    if (!reelId) return;
    router.push({
      pathname: "/(main)/similarPros",
      params: { reel_id: String(reelId) },
    });
  }, [reelId, router]);

  const startTryAnother = useCallback(
    async (uri: string) => {
      if (!reelId) return;
      if (isGuest) {
        dispatch(setGuestModeModalVisible(true));
        return;
      }
      const balance = user.ai_quota;
      if (balance != null && balance < 1) {
        dispatch(setTryOnPurchaseSuccessSource("tools"));
        router.push({
          pathname: "/(main)/tryOnPurchase",
          params: { screen: "reels" },
        });
        return;
      }

      setPipelineState({
        visible: true,
        jobId: null,
        jobType: "Hair Tryon",
        estimatedMinutes: 5,
        progress: 0,
        imageUri: uri,
        complete: false,
      });
      pipelineStartRef.current = Date.now();

      try {
        const started = await startReelTryOn(reelId, uri);
        await refreshQuota();
        await savePendingReelTryOn({
          jobId: started.job_id,
          reelId,
          prompt: started.prompt ?? prompt,
          estimatedMinutes: started.estimated_time_minutes ?? 5,
          imageUri: uri,
          startedAt: Date.now(),
        });
        setPipelineState((prev) => ({
          ...prev,
          jobId: started.job_id,
          estimatedMinutes: started.estimated_time_minutes ?? 5,
        }));

        pollSignal.current.cancelled = true;
        pollSignal.current = { cancelled: false };
        const result = await pollReelTryOnJob(started.job_id, {
          signal: pollSignal.current,
        });
        setPipelineState(INITIAL_HAIR_PIPELINE_STATE);
        if (!result || result.status === "failed") {
          showBanner(t("error"), t("tryOnFailed"), "error", 3000);
          void refreshQuota();
          return;
        }
        router.replace({
          pathname: "/(main)/reelTryOnResult",
          params: {
            job_id: started.job_id,
            reel_id: String(reelId),
            ...(businessId ? { business_id: String(businessId) } : {}),
            ...(serviceId ? { service_id: String(serviceId) } : {}),
            ...(started.prompt ? { prompt: started.prompt } : {}),
            estimated_minutes: String(started.estimated_time_minutes ?? 5),
          },
        });
      } catch (error: any) {
        setPipelineState(INITIAL_HAIR_PIPELINE_STATE);
        const errors = error?.data?.errors;
        if (errors?.credits || error?.status === 422) {
          if (errors?.credits) {
            dispatch(setTryOnPurchaseSuccessSource("tools"));
            router.push({
              pathname: "/(main)/tryOnPurchase",
              params: { screen: "reels" },
            });
            return;
          }
        }
        if (error?.status === 429) return;
        showBanner(
          t("error"),
          error?.message || t("tryOnFailed"),
          "error",
          3000,
        );
        void refreshQuota();
      }
    },
    [
      businessId,
      dispatch,
      isGuest,
      prompt,
      refreshQuota,
      reelId,
      router,
      serviceId,
      showBanner,
      t,
      user.ai_quota,
    ],
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <StackHeader title={t("tryOnResult")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </View>
    );
  }

  if (status === "processing") {
    return (
      <View style={styles.root}>
        <StackHeader title={t("tryOnResult")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
          <Text style={[styles.prompt, { marginTop: moderateHeightScale(16) }]}>
            {prompt || t("aiIsProcessing")}
          </Text>
        </View>
      </View>
    );
  }

  if (status === "failed") {
    return (
      <View style={styles.root}>
        <StackHeader title={t("tryOnResult")} />
        <View style={styles.center}>
          <Text style={styles.failedText}>{t("tryOnFailed")}</Text>
          <Button title={t("tryAnother")} onPress={() => setPickerVisible(true)} />
        </View>
        <ImagePickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onImageSelected={(uri) => {
            setPickerVisible(false);
            void startTryAnother(uri);
          }}
        />
        <HairPipelineProcessingModal
          state={pipelineState}
          onClose={() => setPipelineState(INITIAL_HAIR_PIPELINE_STATE)}
          onSeeStatus={() => {
            setPipelineState(INITIAL_HAIR_PIPELINE_STATE);
            router.push({ pathname: "/aiRequests", params: { fromProcessingModal: "1" } });
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StackHeader title={t("tryOnResult")} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.center]}>
            <MaterialIcons
              name="image-not-supported"
              size={widthScale(40)}
              color={theme.lightGreen}
            />
          </View>
        )}

        <View style={styles.tabs}>
          {VIEW_KEYS.filter((key) => images?.[key]?.url).map((key) => {
            const active = key === activeView;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveView(key)}
              >
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                >
                  {t(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

        <View style={styles.actions}>
          <Button
            title={saving ? t("saving") : t("saveThisLook")}
            onPress={handleSaveLook}
            disabled={saving}
          />
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setPickerVisible(true)}
          >
            <MaterialIcons
              name="refresh"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.secondaryBtnText}>{t("tryAnother")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleBookOriginal}
          >
            <MaterialIcons
              name="event-available"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.secondaryBtnText}>{t("bookOriginalPro")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleFindPros}>
            <MaterialIcons
              name="storefront"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.secondaryBtnText}>{t("findProsNearMe")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ImagePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onImageSelected={(uri) => {
          setPickerVisible(false);
          void startTryAnother(uri);
        }}
      />
      <HairPipelineProcessingModal
        state={pipelineState}
        onClose={() => setPipelineState(INITIAL_HAIR_PIPELINE_STATE)}
        onSeeStatus={() => {
          setPipelineState(INITIAL_HAIR_PIPELINE_STATE);
          router.push({
            pathname: "/aiRequests",
            params: { fromProcessingModal: "1" },
          });
        }}
      />
    </View>
  );
}
