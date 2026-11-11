import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import LocalVideoPreviewModal from "@/src/components/localVideoPreviewModal";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  ClassMediaThumb,
  ClassStateView,
  ClassTypePill,
  IoniconName,
  PriceTag,
  SectionCard,
  StatusChip,
} from "@/src/components/masterClasses/parts";
import ProDetailStudents from "@/src/components/masterClasses/proDetailStudents";
import {
  cancel as cancelClass,
  duplicate as duplicateClass,
  getClass,
  parseApiError,
  remove as removeClass,
  subscribeToMasterClassChanges,
} from "@/src/services/masterClassService";
import type { MasterClass } from "@/src/types/masterClass";
import {
  DEFAULT_CANCELLATION_WINDOW,
  formatClassPrice,
  formatDuration,
  formatIsoOnOwnClock,
  getClassAddress,
  getClassPrice,
  getClassWhenText,
  getFormatLabel,
  getListingBadge,
  getMissingCount,
  getSeatsEnrolledText,
  getSeatsLeftText,
  isClassDateTimeInFuture,
} from "@/src/utils/masterClassHelpers";

/**
 * Pro class detail (A2): everything about one of the pro's own classes —
 * media, facts, the FreshPass Deals listing (publish / renew), the class
 * text, first students, and the manage actions (edit / reschedule,
 * duplicate, cancel, delete). Notification "master_class" taps land here.
 */

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; status: number | null; message: string };

type BusyAction = "duplicate" | "cancel" | "delete" | null;

const MASTER_CLASSES_ROUTE = "/(main)/masterClasses";

/** Admin reason on suspended / removed classes, when the API sends one. */
function getModerationReason(cls: MasterClass): string | null {
  const raw = cls as unknown as Record<string, unknown>;
  const value =
    raw.moderation_reason ?? raw.status_reason ?? raw.suspension_reason ?? raw.reason;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Google Maps search link (opens the Maps app or the browser on both platforms). */
function buildMapsUrl(cls: MasterClass): string | null {
  const lat = cls.location?.latitude;
  const lng = cls.location?.longitude;
  const address = cls.location?.address;
  const query =
    lat != null && lng != null ? `${lat},${lng}` : address ? address : null;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function ProClassDetailScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { showBanner } = useNotificationContext();
  // showBanner is a new function on every provider render; keep it out of deps
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;
  const params = useLocalSearchParams<{ id?: string }>();
  const classId = params.id ? String(params.id) : "";

  const [cls, setCls] = useState<MasterClass | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [studentsKey, setStudentsKey] = useState(0);

  const mountedRef = useRef(true);
  const hasDataRef = useRef(false);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      if (!classId) {
        setState({ kind: "error", status: 404, message: t("mcClassUnavailable") });
        return;
      }
      const requestId = ++requestRef.current;
      if (mode === "initial" && !hasDataRef.current) setState({ kind: "loading" });
      if (mode === "refresh") setRefreshing(true);
      try {
        const data = await getClass(classId);
        if (!mountedRef.current || requestId !== requestRef.current) return;
        hasDataRef.current = true;
        setCls(data);
        setState({ kind: "ready" });
        if (mode !== "silent") setStudentsKey((k) => k + 1);
      } catch (err) {
        if (!mountedRef.current || requestId !== requestRef.current) return;
        const parsed = parseApiError(err, t("mcSomethingWrong"));
        if (hasDataRef.current && parsed.status !== 404 && parsed.status !== 403) {
          // Keep what is on screen; just tell the pro the refresh failed
          if (mode === "refresh") showBannerRef.current(t("error"), parsed.message, "error", 3000);
        } else {
          hasDataRef.current = false;
          setCls(null);
          setState({ kind: "error", status: parsed.status, message: parsed.message });
        }
      } finally {
        if (mountedRef.current && mode === "refresh") setRefreshing(false);
      }
    },
    [classId, t],
  );

  // First load + refetch whenever the screen comes back into focus
  // (after the editor, publish or students screens).
  useFocusEffect(
    useCallback(() => {
      void load(hasDataRef.current ? "silent" : "initial");
    }, [load]),
  );

  // Saves made elsewhere (editor, list menu) patch this copy right away.
  useEffect(
    () =>
      subscribeToMasterClassChanges((change) => {
        if (change.type === "saved" && String(change.masterClass.id) === classId) {
          setCls((prev) => (prev ? { ...prev, ...change.masterClass } : prev));
        }
      }),
    [classId],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(MASTER_CLASSES_ROUTE as any);
  }, [router]);

  // ── Navigation ────────────────────────────────────────────────────

  const openEditor = useCallback(
    (id: number | string) =>
      router.push({
        pathname: "/(main)/masterClasses/editor" as any,
        params: { id: String(id) },
      }),
    [router],
  );

  const openPublish = useCallback(
    (renew: boolean) => {
      if (!cls) return;
      router.push({
        pathname: "/(main)/masterClasses/publish" as any,
        params: renew ? { id: String(cls.id), mode: "renew" } : { id: String(cls.id) },
      });
    },
    [cls, router],
  );

  const openStudents = useCallback(() => {
    if (!cls) return;
    router.push({
      pathname: "/(main)/masterClasses/students" as any,
      params: { id: String(cls.id), title: cls.title },
    });
  }, [cls, router]);

  const openUrl = useCallback(
    async (url: string | null) => {
      if (!url) return;
      try {
        await Linking.openURL(url);
      } catch {
        showBannerRef.current(t("error"), t("mcSomethingWrong"), "error", 3000);
      }
    },
    [t],
  );

  // ── Actions ───────────────────────────────────────────────────────

  const handleDuplicate = useCallback(async () => {
    if (!cls || busy) return;
    setBusy("duplicate");
    try {
      const copy = await duplicateClass(cls.id);
      if (!mountedRef.current) return;
      showBannerRef.current(t("success"), t("mcClassDuplicated"), "success", 3000);
      if (copy?.id) openEditor(copy.id);
    } catch (err) {
      if (mountedRef.current) {
        showBannerRef.current(t("error"), parseApiError(err, t("mcSomethingWrong")).message, "error");
      }
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  }, [busy, cls, openEditor, t]);

  const runCancel = useCallback(async () => {
    if (!cls) return;
    setBusy("cancel");
    try {
      const updated = await cancelClass(cls.id);
      if (!mountedRef.current) return;
      if (updated) setCls(updated);
      showBannerRef.current(t("success"), t("mcClassCancelled"), "success");
      void load("silent");
      setStudentsKey((k) => k + 1);
    } catch (err) {
      if (mountedRef.current) {
        showBannerRef.current(t("error"), parseApiError(err, t("mcSomethingWrong")).message, "error");
      }
    } finally {
      if (mountedRef.current) setBusy(null);
    }
  }, [cls, load, t]);

  const handleCancel = useCallback(() => {
    if (!cls || busy) return;
    Alert.alert(t("mcCancelClassConfirmTitle"), t("mcCancelClassConfirmText"), [
      { text: t("mcKeepClass"), style: "cancel" },
      { text: t("mcCancelClass"), style: "destructive", onPress: () => void runCancel() },
    ]);
  }, [busy, cls, runCancel, t]);

  const runDelete = useCallback(async () => {
    if (!cls) return;
    setBusy("delete");
    try {
      await removeClass(cls.id);
      if (!mountedRef.current) return;
      showBannerRef.current(t("success"), t("mcDraftDeleted"), "success", 3000);
      handleBack();
    } catch (err) {
      if (mountedRef.current) {
        showBannerRef.current(t("error"), parseApiError(err, t("mcSomethingWrong")).message, "error");
        setBusy(null);
      }
    }
  }, [cls, handleBack, t]);

  const handleDelete = useCallback(() => {
    if (!cls || busy) return;
    Alert.alert(t("mcDeleteDraftConfirmTitle"), t("mcDeleteDraftConfirmText"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => void runDelete() },
    ]);
  }, [busy, cls, runDelete, t]);

  // ── States ────────────────────────────────────────────────────────

  const header = <StackHeader title="" centerLogo onBack={handleBack} />;

  if (state.kind === "loading" && !cls) {
    return (
      <View style={styles.container}>
        {header}
        <ClassStateView loading style={styles.stateFill} />
      </View>
    );
  }

  if (state.kind === "error" || !cls) {
    const status = state.kind === "error" ? state.status : null;
    const message = state.kind === "error" ? state.message : t("mcSomethingWrong");
    return (
      <View style={styles.container}>
        {header}
        {status === 403 ? (
          <ClassStateView
            icon="lock-closed-outline"
            title={t("mcOwnerOnly")}
            actionLabel={t("goBack")}
            actionIcon="arrow-back"
            onAction={handleBack}
            style={styles.stateFill}
          />
        ) : status === 404 ? (
          <ClassStateView
            icon="school-outline"
            title={t("mcClassUnavailable")}
            actionLabel={t("goBack")}
            actionIcon="arrow-back"
            onAction={handleBack}
            style={styles.stateFill}
          />
        ) : (
          <ClassStateView
            icon="cloud-offline-outline"
            title={t("mcSomethingWrong")}
            message={message !== t("mcSomethingWrong") ? message : undefined}
            actionLabel={t("retry")}
            actionIcon="refresh"
            onAction={() => void load("initial")}
            style={styles.stateFill}
          />
        )}
      </View>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────

  const isDraft = cls.status === "draft";
  const isPublished = cls.status === "published";
  // `starts_at` is an absolute instant; date/time alone are the salon's clock
  const startsAtMs = cls.starts_at ? Date.parse(cls.starts_at) : NaN;
  const isUpcoming = Number.isFinite(startsAtMs)
    ? startsAtMs > Date.now()
    : !cls.date || isClassDateTimeInFuture(cls.date, cls.time, cls.timezone);
  const listing = cls.listing ?? null;
  const fee = formatClassPrice(listing?.fee ?? 50);
  const days = listing?.days ?? 30;
  const missing = cls.missing ?? {};
  const missingCount = getMissingCount(cls);
  // Stripe alone isn't a form field: the payment screen shows the Connect card
  const formMissingCount = Object.keys(missing).filter((k) => k !== "stripe").length;
  const price = getClassPrice(cls);
  const durationText = formatDuration(cls.duration_minutes);
  const isOnline = cls.format === "online";
  const address = getClassAddress(cls);
  const mapsUrl = !isOnline ? buildMapsUrl(cls) : null;
  const seatsLeft = getSeatsLeftText(cls);
  const heroWidth = screenWidth - moderateWidthScale(20) * 2;
  const heroHeight = Math.round((heroWidth * 9) / 16);
  const isVideo = cls.media?.type === "video";
  const videoUrl = isVideo ? cls.media?.url ?? null : null;
  const reason = getModerationReason(cls);
  const canEdit = isDraft || (isPublished && isUpcoming);
  const canCancel = isPublished && isUpcoming;
  const showStudents = !isDraft;
  const actionsDisabled = busy !== null;

  // ── Pieces ────────────────────────────────────────────────────────

  const renderInfoRow = (
    icon: IoniconName,
    label: string,
    value: React.ReactNode,
    opts: { first?: boolean; extra?: React.ReactNode; accessibilityText?: string } = {},
  ) => (
    <View
      key={label}
      style={[styles.infoRow, !opts.first && styles.infoRowBorder]}
      accessible={!opts.extra}
      accessibilityLabel={opts.extra ? undefined : `${label}: ${opts.accessibilityText ?? ""}`}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={iconScale(18)} color={theme.darkGreen} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        {typeof value === "string" ? (
          <Text style={styles.infoValue}>{value}</Text>
        ) : (
          value
        )}
        {opts.extra}
      </View>
    </View>
  );

  const renderLinkButton = (
    icon: IoniconName,
    label: string,
    onPress: () => void,
    a11y?: string,
  ) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.inlineLink}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 12 }}
      accessibilityRole="link"
      accessibilityLabel={a11y ?? label}
    >
      <Ionicons name={icon} size={iconScale(15)} color={theme.orangeBrownText} />
      <Text style={styles.inlineLinkText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPrimaryButton = (
    label: string,
    onPress: () => void,
    icon?: IoniconName,
  ) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={actionsDisabled}
      style={[styles.primaryButton, actionsDisabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: actionsDisabled }}
    >
      {icon ? <Ionicons name={icon} size={iconScale(18)} color={theme.white} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderOutlineButton = (
    label: string,
    onPress: () => void,
    icon: IoniconName,
    opts: { loading?: boolean; danger?: boolean; flex?: boolean } = {},
  ) => {
    const fg = opts.danger ? theme.red : theme.darkGreen;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={actionsDisabled}
        style={[
          styles.outlineButton,
          opts.danger && styles.dangerButton,
          opts.flex && styles.flexButton,
          actionsDisabled && !opts.loading && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: actionsDisabled, busy: !!opts.loading }}
      >
        {opts.loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <Ionicons name={icon} size={iconScale(18)} color={fg} />
        )}
        <Text style={[styles.outlineButtonText, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Listing card — what the pro needs to do next with the Deals listing
  const renderListing = () => {
    if (cls.status === "cancelled" || cls.status === "suspended" || cls.status === "removed") {
      const textKey =
        cls.status === "cancelled"
          ? "mcCancelledText"
          : cls.status === "suspended"
            ? "mcSuspendedText"
            : "mcRemovedText";
      return (
        <View style={styles.alertBox} accessibilityRole="alert">
          <Ionicons
            name={cls.status === "suspended" ? "pause-circle-outline" : "alert-circle-outline"}
            size={iconScale(20)}
            color={theme.red}
            style={styles.alertIcon}
          />
          <View style={styles.flex1}>
            <Text style={styles.alertText}>{t(textKey)}</Text>
            {reason && cls.status !== "cancelled" ? (
              <Text style={styles.alertReason}>{t("mcModerationReason", { reason })}</Text>
            ) : null}
          </View>
        </View>
      );
    }

    if (isDraft) {
      return (
        <SectionCard
          title={t("mcListingCard")}
          icon="megaphone-outline"
          highlighted
        >
          <Text style={styles.cardBody}>{t("mcListingDraftText", { fee, days })}</Text>
          {missingCount > 0 ? (
            <View style={styles.missingBox}>
              <Text style={styles.missingTitle}>
                {t("mcStepsLeftToPublish", { count: missingCount })}
              </Text>
              {Object.entries(missing).map(([field, msg]) => (
                <View key={field} style={styles.missingRow}>
                  <Ionicons
                    name="ellipse-outline"
                    size={iconScale(12)}
                    color={theme.orangeBrownText}
                    style={styles.missingDot}
                  />
                  <Text style={styles.missingText}>{msg}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.cardButtonWrap}>
            {formMissingCount > 0
              ? renderPrimaryButton(t("mcFinishDetails"), () => openEditor(cls.id), "create-outline")
              : renderPrimaryButton(t("mcPublishClass"), () => openPublish(false), "rocket-outline")}
          </View>
        </SectionCard>
      );
    }

    // Published
    const listingStatus = listing?.status ?? "none";
    const until = formatIsoOnOwnClock(listing?.listed_until || listing?.ends_at, false);
    return (
      <SectionCard
        title={t("mcListingCard")}
        icon="megaphone-outline"
        highlighted={listingStatus !== "active"}
      >
        {listingStatus === "active" ? (
          <Text style={styles.cardBody}>
            {until ? t("mcListedUntil", { date: until }) : t("mcListingLive")}
          </Text>
        ) : listingStatus === "expired" || listingStatus === "ended" ? (
          <Text style={styles.cardBody}>{t("mcListingEndedText")}</Text>
        ) : (
          <Text style={styles.cardBody}>{t("mcListingNotListed")}</Text>
        )}
        {listing?.can_renew ? (
          <View style={styles.cardButtonWrap}>
            {listingStatus === "active"
              ? renderOutlineButton(
                  `${t("mcRenewListing")} (${fee})`,
                  () => openPublish(true),
                  "refresh",
                )
              : renderPrimaryButton(
                  `${t("mcRenewListing")} (${fee})`,
                  () => openPublish(true),
                  "refresh",
                )}
          </View>
        ) : null}
      </SectionCard>
    );
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + moderateHeightScale(24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
      >
        {/* Hero media (16:9) */}
        {isVideo && videoUrl ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setVideoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("mcPlayVideo")}
          >
            <ClassMediaThumb
              media={cls.media}
              width={heroWidth}
              height={heroHeight}
              radius={moderateWidthScale(16)}
              playSize={iconScale(26)}
            />
          </TouchableOpacity>
        ) : (
          <ClassMediaThumb
            media={cls.media}
            width={heroWidth}
            height={heroHeight}
            radius={moderateWidthScale(16)}
            playSize={iconScale(26)}
          />
        )}

        {/* Type + status + title */}
        <View style={styles.titleBlock}>
          <View style={styles.pillRow}>
            <ClassTypePill label={cls.label} size="md" showIcon />
            <StatusChip meta={getListingBadge(cls)} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {cls.title || t("mcClassDetails")}
          </Text>
        </View>

        {/* Key facts */}
        <View style={styles.factsCard}>
          {renderInfoRow("calendar-outline", t("mcDate"), getClassWhenText(cls), {
            first: true,
            accessibilityText: getClassWhenText(cls),
          })}
          {durationText
            ? renderInfoRow("time-outline", t("mcDuration"), durationText, {
                accessibilityText: durationText,
              })
            : null}
          {cls.format
            ? isOnline
              ? renderInfoRow("videocam-outline", t("mcFormat"), getFormatLabel(cls.format), {
                  extra: cls.meeting_url
                    ? renderLinkButton(
                        "link-outline",
                        cls.meeting_url,
                        () => void openUrl(cls.meeting_url),
                        `${t("mcMeetingLink")}: ${cls.meeting_url}`,
                      )
                    : (
                        <Text style={styles.infoSub}>{t("mcNoMeetingLinkYet")}</Text>
                      ),
                })
              : renderInfoRow(
                  "location-outline",
                  t("mcLocation"),
                  address || t("mcLocationBusiness"),
                  {
                    accessibilityText: address || t("mcLocationBusiness"),
                    extra: mapsUrl
                      ? renderLinkButton("navigate-outline", t("mcOpenInMaps"), () =>
                          void openUrl(mapsUrl),
                        )
                      : undefined,
                  },
                )
            : null}
          {cls.capacity != null
            ? renderInfoRow("people-outline", t("mcSeats"), getSeatsEnrolledText(cls), {
                accessibilityText: `${getSeatsEnrolledText(cls)}${seatsLeft ? `, ${seatsLeft}` : ""}`,
                extra: seatsLeft && !isDraft ? (
                  <Text style={styles.infoSub}>{seatsLeft}</Text>
                ) : undefined,
              })
            : null}
          {price.current != null
            ? renderInfoRow(
                "pricetag-outline",
                t("mcPrice"),
                <PriceTag amount={price.current} original={price.original} size="md" />,
                {
                  accessibilityText: price.original
                    ? `${formatClassPrice(price.current)}, ${formatClassPrice(price.original)}`
                    : formatClassPrice(price.current),
                },
              )
            : null}
        </View>

        {/* Deals listing */}
        {renderListing()}

        {/* Class text */}
        {cls.description ? (
          <SectionCard title={t("mcWhatYoullLearn")} icon="bulb-outline">
            <Text style={styles.cardBody}>{cls.description}</Text>
          </SectionCard>
        ) : null}

        {cls.prerequisites ? (
          <SectionCard title={t("mcPrerequisites")} icon="list-outline">
            <Text style={styles.cardBody}>{cls.prerequisites}</Text>
          </SectionCard>
        ) : null}

        <SectionCard title={t("mcCancellationPolicy")} icon="shield-checkmark-outline">
          <Text style={styles.cardBody}>
            {cls.cancellation_terms ||
              t("mcCancellationWindowHelper", {
                hours: cls.cancellation_window_hours ?? DEFAULT_CANCELLATION_WINDOW,
              })}
          </Text>
        </SectionCard>

        {/* Students */}
        {showStudents ? (
          <ProDetailStudents
            classId={cls.id}
            reloadKey={studentsKey}
            onViewAll={openStudents}
          />
        ) : null}

        {/* Manage */}
        <View style={styles.manageBlock}>
          <Text style={styles.manageTitle} accessibilityRole="header">
            {t("mcManageClass")}
          </Text>
          <View style={styles.manageRow}>
            {canEdit
              ? renderOutlineButton(
                  isDraft ? t("mcEdit") : t("mcReschedule"),
                  () => openEditor(cls.id),
                  isDraft ? "create-outline" : "calendar-outline",
                  { flex: true },
                )
              : null}
            {renderOutlineButton(t("mcDuplicate"), () => void handleDuplicate(), "copy-outline", {
              flex: true,
              loading: busy === "duplicate",
            })}
          </View>

          {isDraft || canCancel ? (
            <View style={styles.dangerZone}>
              {isDraft
                ? renderOutlineButton(t("mcDeleteDraft"), handleDelete, "trash-outline", {
                    danger: true,
                    loading: busy === "delete",
                  })
                : renderOutlineButton(t("mcCancelClass"), handleCancel, "close-circle-outline", {
                    danger: true,
                    loading: busy === "cancel",
                  })}
              {canCancel ? (
                <Text style={styles.dangerHint}>{t("mcCancelClassConfirmText")}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {videoUrl ? (
        <LocalVideoPreviewModal
          visible={videoOpen}
          uri={videoUrl}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    stateFill: { flex: 1 },
    flex1: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(16),
    },

    // Title
    titleBlock: { gap: moderateHeightScale(10) },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    title: {
      fontSize: fontSize.size24,
      lineHeight: fontSize.size24 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },

    // Facts card
    factsCard: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(13),
    },
    infoRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    infoIcon: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    infoText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    infoLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: fontSize.size15,
      lineHeight: fontSize.size15 * 1.35,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    infoSub: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    inlineLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(5),
      minHeight: moderateHeightScale(32),
      maxWidth: "100%",
    },
    inlineLinkText: {
      flexShrink: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
      textDecorationLine: "underline",
    },

    // Cards
    cardBody: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.5,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    cardButtonWrap: { marginTop: moderateHeightScale(14) },
    missingBox: {
      marginTop: moderateHeightScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.tilePeach,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      gap: moderateHeightScale(6),
    },
    missingTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    missingRow: { flexDirection: "row", alignItems: "flex-start" },
    missingDot: {
      marginRight: moderateWidthScale(8),
      marginTop: moderateHeightScale(3),
    },
    missingText: {
      flex: 1,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    alertBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightRed,
      borderWidth: 1,
      borderColor: theme.lightRed30,
    },
    alertIcon: { marginRight: moderateWidthScale(10), marginTop: moderateHeightScale(1) },
    alertText: {
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontMedium,
      color: theme.red,
    },
    alertReason: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },

    // Buttons
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(50),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      paddingHorizontal: moderateWidthScale(18),
    },
    primaryButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(48),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      backgroundColor: theme.surfaceRaised,
      paddingHorizontal: moderateWidthScale(14),
    },
    flexButton: { flex: 1 },
    dangerButton: {
      borderColor: theme.lightRedBorder,
      backgroundColor: theme.background,
    },
    outlineButtonText: {
      flexShrink: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
    },
    disabled: { opacity: 0.5 },

    // Manage
    manageBlock: {
      marginTop: moderateHeightScale(4),
      gap: moderateHeightScale(12),
    },
    manageTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    manageRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    dangerZone: {
      marginTop: moderateHeightScale(8),
      paddingTop: moderateHeightScale(16),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
      gap: moderateHeightScale(8),
    },
    dangerHint: {
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
