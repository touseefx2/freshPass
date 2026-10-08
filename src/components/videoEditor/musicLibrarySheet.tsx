import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio, type AVPlaybackStatus } from "expo-av";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import Logger from "@/src/services/logger";
import { formatVideoDuration } from "@/src/utils/videoDuration";
import {
  MUSIC_MOODS,
  MusicLibraryError,
  downloadTrack,
  getDownloadedTracks,
  licenseLabel,
  removeDownloadedTrack,
  searchLibraryTracks,
  type DownloadedTrack,
  type LibraryTrack,
} from "@/src/services/musicLibraryService";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Track is already on disk when this fires. */
  onSelect: (track: DownloadedTrack) => void;
  /** "light" = white sheet with dark text (step-by-step Reel Studio). */
  tone?: "dark" | "light";
};

const DOWNLOADS_TAB = "downloads";
const SEARCH_DEBOUNCE_MS = 450;

type LoadState = "idle" | "loading" | "error" | "rate_limited";

const createStyles = (theme: Theme, light = false) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: light ? "rgba(20, 28, 12, 0.5)" : "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      height: "86%",
      backgroundColor: light ? theme.white : theme.darkGreen,
      borderTopLeftRadius: moderateWidthScale(light ? 28 : 22),
      borderTopRightRadius: moderateWidthScale(light ? 28 : 22),
      overflow: "hidden",
    },
    handle: {
      alignSelf: "center",
      width: widthScale(light ? 44 : 40),
      height: light ? 5 : 4,
      borderRadius: 3,
      backgroundColor: light ? theme.borderMedium : theme.white15,
      marginTop: moderateHeightScale(8),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(light ? 20 : 16),
      paddingTop: moderateHeightScale(light ? 14 : 10),
      paddingBottom: moderateHeightScale(light ? 12 : 10),
    },
    title: {
      fontSize: light ? fontSize.size22 : fontSize.size18,
      fontFamily: fonts.fontBold,
      color: light ? theme.darkGreen : theme.white,
    },
    closeBtn: {
      width: widthScale(light ? 40 : 32),
      height: widthScale(light ? 40 : 32),
      borderRadius: widthScale(light ? 20 : 16),
      backgroundColor: light ? theme.lightGreen07 : theme.white15,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginHorizontal: moderateWidthScale(light ? 20 : 16),
      paddingHorizontal: moderateWidthScale(12),
      height: heightScale(light ? 50 : 42),
      borderRadius: moderateWidthScale(light ? 14 : 12),
      backgroundColor: light ? theme.background : theme.black,
      borderWidth: light ? 1.5 : 0,
      borderColor: theme.borderNormal,
    },
    searchInput: {
      flex: 1,
      fontSize: light ? fontSize.size16 : fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: light ? theme.darkGreen : theme.white,
      paddingVertical: 0,
    },
    chips: {
      gap: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(light ? 20 : 16),
      paddingVertical: moderateHeightScale(12),
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(light ? 16 : 14),
      height: heightScale(light ? 40 : 32),
      borderRadius: heightScale(light ? 20 : 16),
      borderWidth: light ? 1.5 : 1,
      borderColor: light ? theme.borderNormal : theme.white15,
      backgroundColor: light ? theme.background : "transparent",
    },
    chipActive: {
      backgroundColor: theme.buttonBack,
      borderColor: theme.buttonBack,
    },
    chipText: {
      fontSize: light ? fontSize.size14 : fontSize.size12,
      fontFamily: light ? fonts.fontBold : fonts.fontMedium,
      color: light ? theme.darkGreen : theme.white,
    },
    chipTextActive: { color: theme.white },
    listContent: {
      paddingHorizontal: moderateWidthScale(light ? 20 : 16),
      paddingBottom: moderateHeightScale(16),
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(light ? 12 : 10),
      borderBottomWidth: light ? 1 : StyleSheet.hairlineWidth,
      borderBottomColor: light ? theme.borderLight : theme.white15,
    },
    playBtn: {
      width: widthScale(light ? 48 : 44),
      height: widthScale(light ? 48 : 44),
      borderRadius: moderateWidthScale(light ? 14 : 10),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    playBtnActive: { backgroundColor: theme.selectCard },
    info: { flex: 1, minWidth: 0 },
    trackTitle: {
      fontSize: light ? fontSize.size16 : fontSize.size14,
      fontFamily: fonts.fontBold,
      color: light ? theme.darkGreen : theme.white,
    },
    trackMeta: {
      fontSize: light ? fontSize.size13 : fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: light ? theme.lightGreen : theme.white70,
      marginTop: moderateHeightScale(2),
    },
    progressTrack: {
      height: light ? 3 : 2,
      borderRadius: 2,
      backgroundColor: light ? theme.lightGreen1 : theme.white15,
      marginTop: moderateHeightScale(6),
      overflow: "hidden",
    },
    progressFill: {
      height: light ? 3 : 2,
      backgroundColor: light ? theme.selectCard : theme.orangeBrown,
    },
    iconBtn: {
      width: widthScale(34),
      height: widthScale(34),
      alignItems: "center",
      justifyContent: "center",
    },
    useBtn: {
      minWidth: widthScale(light ? 64 : 56),
      height: heightScale(light ? 40 : 32),
      paddingHorizontal: moderateWidthScale(light ? 16 : 12),
      borderRadius: heightScale(light ? 20 : 16),
      backgroundColor: light ? theme.darkGreen : theme.orangeBrown,
      alignItems: "center",
      justifyContent: "center",
    },
    useText: {
      fontSize: light ? fontSize.size14 : fontSize.size12,
      fontFamily: fonts.fontBold,
      color: light ? theme.white : theme.darkGreen,
    },
    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(8),
    },
    stateTitle: {
      fontSize: light ? fontSize.size17 : fontSize.size15,
      fontFamily: fonts.fontBold,
      color: light ? theme.darkGreen : theme.white,
      textAlign: "center",
    },
    stateBody: {
      fontSize: light ? fontSize.size14 : fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: light ? theme.lightGreen : theme.white70,
      textAlign: "center",
    },
    stateBtn: {
      marginTop: moderateHeightScale(8),
      paddingHorizontal: moderateWidthScale(18),
      height: heightScale(36),
      borderRadius: heightScale(18),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
    stateBtnText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.buttonText,
    },
    footerLoader: { paddingVertical: moderateHeightScale(16) },
    licenseNote: {
      fontSize: light ? fontSize.size12 : fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: light ? theme.lightGreen : theme.white70,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(8),
    },
  });

export default function MusicLibrarySheet({
  visible,
  onClose,
  onSelect,
  tone = "dark",
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const light = tone === "light";
  const styles = useMemo(() => createStyles(theme, light), [theme, light]);
  // Icons / spinners on the sheet surface
  const ink = light ? theme.darkGreen : theme.white;
  const inkMuted = light ? theme.lightGreen : theme.white70;
  const inkFaint = light ? theme.lightGreen5 : theme.white50;
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<string>(MUSIC_MOODS[0].key);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [offline, setOffline] = useState(false);
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  /** trackId → 0–1 while downloading. */
  const [progress, setProgress] = useState<Record<string, number>>({});
  /** Track that should be applied once its download finishes. */
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewRatio, setPreviewRatio] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const showingDownloads = tab === DOWNLOADS_TAB && !debouncedSearch;
  const activeQuery = debouncedSearch
    ? debouncedSearch
    : (MUSIC_MOODS.find((m) => m.key === tab)?.query ?? "");

  const downloadsById = useMemo(
    () => new Map(downloads.map((d) => [d.id, d])),
    [downloads],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Preview player ────────────────────────────────────────────────

  const stopPreview = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setPreviewId(null);
    setPreviewPlaying(false);
    setPreviewLoading(false);
    setPreviewRatio(0);
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
  }, []);

  const onPreviewStatus = useCallback((status: AVPlaybackStatus) => {
    if (!mountedRef.current || !status.isLoaded) return;
    setPreviewPlaying(status.isPlaying);
    if (status.durationMillis) {
      setPreviewRatio(status.positionMillis / status.durationMillis);
    }
    if (status.didJustFinish) {
      setPreviewPlaying(false);
      setPreviewRatio(0);
    }
  }, []);

  const togglePreview = useCallback(
    async (track: LibraryTrack) => {
      if (previewId === track.id && soundRef.current) {
        try {
          if (previewPlaying) await soundRef.current.pauseAsync();
          else await soundRef.current.playAsync();
        } catch {}
        return;
      }
      await stopPreview();
      const local = downloadsById.get(track.id)?.localUri;
      if (!local && offline) return;
      setPreviewId(track.id);
      setPreviewLoading(true);
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: local ?? track.streamUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 250 },
          onPreviewStatus,
        );
        if (!mountedRef.current) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch (error) {
        Logger.error("Music preview failed:", error);
        setPreviewId(null);
        Alert.alert(t("error"), t("musicPreviewFailed"));
      } finally {
        if (mountedRef.current) setPreviewLoading(false);
      }
    },
    [downloadsById, offline, onPreviewStatus, previewId, previewPlaying, stopPreview, t],
  );

  // Stop audio whenever the sheet hides or unmounts.
  useEffect(() => {
    if (!visible) void stopPreview();
  }, [stopPreview, visible]);
  useEffect(
    () => () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    },
    [],
  );

  // ── Connectivity + downloads ──────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    // isConnected can be null (unknown) on iOS simulator — only treat false as offline.
    const unsub = NetInfo.addEventListener((s) => setOffline(s.isConnected === false));
    void getDownloadedTracks().then((list) => {
      if (mountedRef.current) setDownloads(list);
    });
    return unsub;
  }, [visible]);

  // Offline on open with saved tracks → land on Downloads.
  useEffect(() => {
    if (visible && offline && downloads.length > 0 && !debouncedSearch) {
      setTab(DOWNLOADS_TAB);
    }
  }, [debouncedSearch, downloads.length, offline, visible]);

  // ── Search ────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setTimeout(() => {
      const q = searchText.trim();
      setDebouncedSearch(q.length >= 2 ? q : "");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchText]);

  const loadPage = useCallback(
    async (query: string, nextPage: number) => {
      const reqId = ++requestIdRef.current;
      if (nextPage === 1) {
        setLoadState("loading");
        setTracks([]);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await searchLibraryTracks(query, nextPage);
        if (reqId !== requestIdRef.current || !mountedRef.current) return;
        setTracks((prev) => {
          if (nextPage === 1) return res.tracks;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.tracks.filter((r) => !seen.has(r.id))];
        });
        setHasMore(res.hasMore);
        setPage(nextPage);
        setLoadState("idle");
      } catch (error) {
        if (reqId !== requestIdRef.current || !mountedRef.current) return;
        const rateLimited =
          error instanceof MusicLibraryError && error.code === "rate_limited";
        if (nextPage === 1) setLoadState(rateLimited ? "rate_limited" : "error");
        setHasMore(false);
      } finally {
        if (reqId === requestIdRef.current && mountedRef.current) {
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible || showingDownloads || offline) return;
    void loadPage(activeQuery, 1);
  }, [activeQuery, loadPage, offline, showingDownloads, visible]);

  const onEndReached = useCallback(() => {
    if (showingDownloads || offline || loadingMore || !hasMore) return;
    if (loadState !== "idle") return;
    void loadPage(activeQuery, page + 1);
  }, [activeQuery, hasMore, loadPage, loadState, loadingMore, offline, page, showingDownloads]);

  // ── Download / use ────────────────────────────────────────────────

  const startDownload = useCallback(
    async (track: LibraryTrack): Promise<DownloadedTrack | null> => {
      const done = downloadsById.get(track.id);
      if (done) return done;
      if (offline) return null;
      setProgress((p) => ({ ...p, [track.id]: 0 }));
      try {
        const saved = await downloadTrack(track, (ratio) => {
          if (mountedRef.current) {
            setProgress((p) => ({ ...p, [track.id]: ratio }));
          }
        });
        if (mountedRef.current) {
          setDownloads((list) => [saved, ...list.filter((d) => d.id !== saved.id)]);
        }
        return saved;
      } catch (error) {
        Logger.error("Music download failed:", error);
        if (mountedRef.current) Alert.alert(t("error"), t("musicDownloadFailed"));
        return null;
      } finally {
        if (mountedRef.current) {
          setProgress((p) => {
            const next = { ...p };
            delete next[track.id];
            return next;
          });
        }
      }
    },
    [downloadsById, offline, t],
  );

  const applyTrack = useCallback(
    async (track: LibraryTrack) => {
      if (applyingId) return;
      setApplyingId(track.id);
      const saved = await startDownload(track);
      if (!mountedRef.current) return;
      setApplyingId(null);
      if (!saved) return;
      await stopPreview();
      onSelect(saved);
    },
    [applyingId, onSelect, startDownload, stopPreview],
  );

  const confirmRemove = useCallback(
    (track: DownloadedTrack) => {
      Alert.alert(t("musicRemoveDownloadTitle"), track.title, [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("remove"),
          style: "destructive",
          onPress: async () => {
            if (previewId === track.id) await stopPreview();
            await removeDownloadedTrack(track.id);
            if (mountedRef.current) {
              setDownloads((list) => list.filter((d) => d.id !== track.id));
            }
          },
        },
      ]);
    },
    [previewId, stopPreview, t],
  );

  const selectTab = useCallback((key: string) => {
    Keyboard.dismiss();
    setSearchText("");
    setDebouncedSearch("");
    setTab(key);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    void stopPreview();
    onClose();
  }, [onClose, stopPreview]);

  // ── Render ────────────────────────────────────────────────────────

  const renderTrack = useCallback(
    ({ item }: { item: LibraryTrack }) => {
      const saved = downloadsById.get(item.id);
      const isPreview = previewId === item.id;
      const dl = progress[item.id];
      const downloading = dl !== undefined;
      const canStream = !!saved || !offline;
      const meta = [
        item.artist,
        item.durationMs > 0 ? formatVideoDuration(item.durationMs / 1000) : null,
        licenseLabel(item),
      ]
        .filter(Boolean)
        .join(" · ");

      return (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.playBtn, isPreview && styles.playBtnActive]}
            onPress={() => void togglePreview(item)}
            disabled={!canStream}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            activeOpacity={0.8}
          >
            {isPreview && previewLoading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <MaterialIcons
                name={isPreview && previewPlaying ? "pause" : "play-arrow"}
                size={moderateWidthScale(26)}
                color={canStream ? theme.white : theme.white50}
              />
            )}
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trackMeta} numberOfLines={1}>
              {meta}
            </Text>
            {isPreview ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, previewRatio * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>

          {showingDownloads && saved ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => confirmRemove(saved)}
              hitSlop={6}
              accessibilityLabel={t("remove")}
            >
              <MaterialIcons
                name="delete-outline"
                size={moderateWidthScale(22)}
                color={light ? theme.red : theme.white70}
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.useBtn, !canStream && { opacity: 0.5 }]}
            onPress={() => void applyTrack(item)}
            disabled={!canStream || !!applyingId}
            activeOpacity={0.85}
          >
            {downloading ? (
              <Text style={styles.useText}>{Math.round(dl * 100)}%</Text>
            ) : applyingId === item.id ? (
              <ActivityIndicator color={light ? theme.white : theme.darkGreen} size="small" />
            ) : (
              <Text style={styles.useText}>{t("musicUse")}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [
      applyingId,
      confirmRemove,
      downloadsById,
      light,
      offline,
      previewId,
      previewLoading,
      previewPlaying,
      previewRatio,
      progress,
      showingDownloads,
      styles,
      t,
      theme,
      togglePreview,
      applyTrack,
    ],
  );

  const renderState = (
    icon: keyof typeof MaterialIcons.glyphMap,
    title: string,
    body?: string,
    action?: { label: string; onPress: () => void },
  ) => (
    <View style={styles.state}>
      <MaterialIcons name={icon} size={moderateWidthScale(40)} color={inkFaint} />
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
      {action ? (
        <TouchableOpacity style={styles.stateBtn} onPress={action.onPress}>
          <Text style={styles.stateBtnText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  let emptyComponent: React.ReactElement | null = null;
  if (showingDownloads) {
    emptyComponent = renderState(
      "download-for-offline",
      t("musicNoDownloads"),
      t("musicNoDownloadsHint"),
    );
  } else if (offline) {
    emptyComponent = renderState(
      "wifi-off",
      t("musicOfflineTitle"),
      t("musicOfflineBody"),
      downloads.length > 0
        ? { label: t("musicViewDownloads"), onPress: () => selectTab(DOWNLOADS_TAB) }
        : undefined,
    );
  } else if (loadState === "loading") {
    emptyComponent = (
      <View style={styles.state}>
        <ActivityIndicator color={ink} />
      </View>
    );
  } else if (loadState === "error" || loadState === "rate_limited") {
    emptyComponent = renderState(
      "error-outline",
      loadState === "rate_limited" ? t("musicRateLimited") : t("musicLoadFailed"),
      undefined,
      { label: t("retry"), onPress: () => void loadPage(activeQuery, 1) },
    );
  } else if (loadState === "idle") {
    emptyComponent = renderState("music-off", t("musicNoResults"));
  }

  const data: LibraryTrack[] = showingDownloads ? downloads : offline ? [] : tracks;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t("musicLibraryTitle")}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={8}
              accessibilityLabel={t("close")}
            >
              <MaterialIcons
                name="close"
                size={moderateWidthScale(light ? 22 : 18)}
                color={ink}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={moderateWidthScale(20)} color={inkMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t("musicSearchPlaceholder")}
              placeholderTextColor={inkFaint}
              returnKeyType="search"
              autoCorrect={false}
              editable={!offline}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText("")} hitSlop={8}>
                <MaterialIcons name="cancel" size={moderateWidthScale(18)} color={inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              {[
                { key: DOWNLOADS_TAB, labelKey: "musicDownloadsTab" },
                ...MUSIC_MOODS,
              ].map((chip) => {
                const active = !debouncedSearch && tab === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => selectTab(chip.key)}
                    activeOpacity={0.85}
                  >
                    {chip.key === DOWNLOADS_TAB ? (
                      <MaterialIcons
                        name="download-done"
                        size={moderateWidthScale(light ? 16 : 14)}
                        color={active ? theme.white : ink}
                      />
                    ) : null}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(chip.labelKey)}
                      {chip.key === DOWNLOADS_TAB && downloads.length > 0
                        ? ` (${downloads.length})`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderTrack}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={emptyComponent}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.footerLoader} color={ink} />
              ) : null
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={10}
            windowSize={7}
          />

          <Text style={[styles.licenseNote, { paddingBottom: insets.bottom + moderateHeightScale(8) }]}>
            {t("musicLicenseNote")}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
