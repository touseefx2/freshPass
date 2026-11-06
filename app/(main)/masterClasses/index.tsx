import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setActionLoader,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import { isStripeOnboardingCompleted } from "@/src/state/slices/userSlice";
import {
  cancel as cancelClass,
  duplicate as duplicateClass,
  listMine,
  parseApiError,
  remove as removeClass,
  subscribeToMasterClassChanges,
} from "@/src/services/masterClassService";
import type {
  MasterClass,
  MasterClassCounts,
  MasterClassTab,
} from "@/src/types/masterClass";
import { MASTER_CLASS_TABS } from "@/src/utils/masterClassHelpers";
import {
  ClassStateView,
  type IoniconName,
} from "@/src/components/masterClasses/parts";
import {
  ProListCard,
  ProListCardSkeleton,
} from "@/src/components/masterClasses/proListCard";
import ProListActionSheet, {
  type ProClassAction,
} from "@/src/components/masterClasses/proListActionSheet";

/**
 * Pro "Classes & Training" (Design 2): Create Class, Upcoming / Drafts /
 * Past tabs with counts, one card per class with a ⋮ action sheet.
 */

const DETAIL_PATH = "/(main)/masterClasses/detail";
const EDITOR_PATH = "/(main)/masterClasses/editor";
const PUBLISH_PATH = "/(main)/masterClasses/publish";
const STUDENTS_PATH = "/(main)/masterClasses/students";

/** Let the sheet slide away before an Alert / blocking loader shows. */
const SHEET_CLOSE_MS = 280;

type TabState = {
  items: MasterClass[];
  page: number;
  lastPage: number;
  loaded: boolean;
  error: string | null;
};

const emptyTab = (): TabState => ({
  items: [],
  page: 1,
  lastPage: 1,
  loaded: false,
  error: null,
});

const EMPTY_STATE: Record<
  MasterClassTab,
  { icon: IoniconName; titleKey: string; textKey: string }
> = {
  upcoming: {
    icon: "calendar-outline",
    titleKey: "mcEmptyUpcomingTitle",
    textKey: "mcEmptyUpcomingText",
  },
  drafts: {
    icon: "document-text-outline",
    titleKey: "mcEmptyDraftsTitle",
    textKey: "mcEmptyDraftsText",
  },
  past: {
    icon: "time-outline",
    titleKey: "mcEmptyPastTitle",
    textKey: "mcEmptyPastText",
  },
};

export default function MasterClassesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);
  const stripeStatus = businessStatus?.stripe_onboarding_status;
  // Unknown status (not loaded yet): let the server's 422 `stripe` decide
  const needsStripe =
    !!businessStatus && !isStripeOnboardingCompleted(businessStatus);

  const [tab, setTab] = useState<MasterClassTab>("upcoming");
  const [tabs, setTabs] = useState<Record<MasterClassTab, TabState>>(() => ({
    upcoming: emptyTab(),
    drafts: emptyTab(),
    past: emptyTab(),
  }));
  const [counts, setCounts] = useState<MasterClassCounts | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forbidden, setForbidden] = useState(userRole === "staff");
  const [sheetClass, setSheetClass] = useState<MasterClass | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Answers for an older request of the same tab are dropped
  const requestRef = useRef<Record<MasterClassTab, number>>({
    upcoming: 0,
    drafts: 0,
    past: 0,
  });
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;
  const navLockRef = useRef(0);

  const current = tabs[tab];

  const patchTab = useCallback(
    (key: MasterClassTab, patch: Partial<TabState>) =>
      setTabs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } })),
    [],
  );

  /**
   * initial — skeleton until the first answer; refresh — pull-to-refresh;
   * silent — focus / tab return / after an action, keeps rows on screen.
   */
  const loadFirstPage = useCallback(
    async (key: MasterClassTab, mode: "initial" | "refresh" | "silent") => {
      if (forbidden) return;
      const request = ++requestRef.current[key];
      if (mode === "initial") patchTab(key, { error: null, loaded: false });
      if (mode === "refresh") setRefreshing(true);
      try {
        const result = await listMine(key, 1);
        if (request !== requestRef.current[key]) return;
        setCounts(result.counts);
        patchTab(key, {
          items: result.items,
          page: result.meta.current_page || 1,
          lastPage: result.meta.last_page || 1,
          loaded: true,
          error: null,
        });
      } catch (err) {
        if (request !== requestRef.current[key]) return;
        const parsed = parseApiError(err, t("mcLoadError"));
        if (parsed.status === 403) {
          setForbidden(true);
          return;
        }
        const hasRows = tabsRef.current[key].items.length > 0;
        if (hasRows) {
          // Keep what is shown; only a pull-to-refresh says it failed
          if (mode === "refresh") {
            showBannerRef.current(t("mcLoadError"), parsed.message, "error");
          }
        } else if (mode !== "silent" || !tabsRef.current[key].loaded) {
          patchTab(key, { loaded: true, error: parsed.message });
        }
      } finally {
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [forbidden, patchTab, t],
  );

  const loadMore = useCallback(async () => {
    const key = tabRef.current;
    const state = tabsRef.current[key];
    if (
      forbidden ||
      loadingMore ||
      refreshing ||
      !state.loaded ||
      state.page >= state.lastPage
    ) {
      return;
    }
    const request = requestRef.current[key];
    setLoadingMore(true);
    try {
      const nextPage = state.page + 1;
      const result = await listMine(key, nextPage);
      if (request !== requestRef.current[key]) return;
      setCounts(result.counts);
      setTabs((prev) => {
        const seen = new Set(prev[key].items.map((c) => c.id));
        return {
          ...prev,
          [key]: {
            ...prev[key],
            items: [
              ...prev[key].items,
              ...result.items.filter((c) => !seen.has(c.id)),
            ],
            page: nextPage,
            lastPage: result.meta.last_page || prev[key].lastPage,
          },
        };
      });
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [forbidden, loadingMore, refreshing]);

  // First visit of a tab: skeleton; coming back to it: quiet refresh
  useEffect(() => {
    const state = tabsRef.current[tab];
    void loadFirstPage(tab, state.loaded && !state.error ? "silent" : "initial");
  }, [tab, loadFirstPage]);

  // Back from the editor / publish / detail: refresh quietly
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      void loadFirstPage(tabRef.current, "silent");
    }, [loadFirstPage]),
  );

  // Saved / deleted elsewhere: patch rows in place (new rows come with the refresh)
  useEffect(
    () =>
      subscribeToMasterClassChanges((change) => {
        setTabs((prev) => {
          const next = { ...prev };
          (Object.keys(prev) as MasterClassTab[]).forEach((key) => {
            const items = prev[key].items;
            if (change.type === "deleted") {
              if (items.some((c) => c.id === change.id)) {
                next[key] = {
                  ...prev[key],
                  items: items.filter((c) => c.id !== change.id),
                };
              }
              return;
            }
            const index = items.findIndex(
              (c) => c.id === change.masterClass.id,
            );
            if (index < 0) return;
            const copy = [...items];
            // Keep list-only fields the save answer may leave out
            copy[index] = {
              ...copy[index],
              ...change.masterClass,
              listing: change.masterClass.listing ?? copy[index].listing,
              missing: change.masterClass.missing ?? copy[index].missing,
            };
            next[key] = { ...prev[key], items: copy };
          });
          return next;
        });
      }),
    [],
  );

  // ── Navigation ───────────────────────────────────────────────────

  /** One push per tap burst (double taps open one screen). */
  const push = useCallback(
    (pathname: string, params?: Record<string, string>) => {
      const now = Date.now();
      if (now - navLockRef.current < 700) return;
      navLockRef.current = now;
      router.push({ pathname: pathname as any, params });
    },
    [router],
  );

  const openStripe = useCallback(() => {
    if (stripeStatus === "action_required" || stripeStatus === "under_review") {
      router.push("/(main)/stripeConnectOnboarding" as any);
    } else {
      dispatch(setStripeConnectModalVisible(true));
    }
  }, [dispatch, router, stripeStatus]);

  const handleCreate = useCallback(() => {
    if (needsStripe) {
      Alert.alert(t("mcConnectStripeTitle"), t("mcConnectStripeText"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("mcConnectStripe"), onPress: openStripe },
      ]);
      return;
    }
    push(EDITOR_PATH);
  }, [needsStripe, openStripe, push, t]);

  const openClass = useCallback(
    (cls: MasterClass) => push(DETAIL_PATH, { id: String(cls.id) }),
    [push],
  );

  const openRenew = useCallback(
    (cls: MasterClass) =>
      push(PUBLISH_PATH, { id: String(cls.id), mode: "renew" }),
    [push],
  );

  const openMenu = useCallback((cls: MasterClass) => {
    setSheetClass(cls);
    setSheetVisible(true);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────

  const runBlocking = useCallback(
    async (work: () => Promise<void>, failTitle: string) => {
      dispatch(setActionLoader(true));
      try {
        await work();
      } catch (err) {
        const parsed = parseApiError(err, t("mcSomethingWrong"));
        showBannerRef.current(failTitle, parsed.message, "error");
      } finally {
        dispatch(setActionLoader(false));
      }
    },
    [dispatch, t],
  );

  const doDuplicate = useCallback(
    (cls: MasterClass) =>
      runBlocking(async () => {
        const copy = await duplicateClass(cls.id);
        showBannerRef.current(t("mcClassDuplicated"), "", "success");
        // Show the new draft right away, then let the server settle counts
        setTabs((prev) => ({
          ...prev,
          drafts: prev.drafts.loaded
            ? {
                ...prev.drafts,
                items: [
                  copy,
                  ...prev.drafts.items.filter((c) => c.id !== copy.id),
                ],
              }
            : prev.drafts,
        }));
        setCounts((prev) =>
          prev ? { ...prev, drafts: prev.drafts + 1 } : prev,
        );
        setTab("drafts");
        void loadFirstPage("drafts", "silent");
      }, t("mcSomethingWrong")),
    [loadFirstPage, runBlocking, t],
  );

  const doCancel = useCallback(
    (cls: MasterClass) => {
      Alert.alert(t("mcCancelClassConfirmTitle"), t("mcCancelClassConfirmText"), [
        { text: t("mcKeepClass"), style: "cancel" },
        {
          text: t("mcCancelClass"),
          style: "destructive",
          onPress: () =>
            void runBlocking(async () => {
              await cancelClass(cls.id);
              showBannerRef.current(t("mcClassCancelled"), "", "success");
              void loadFirstPage(tabRef.current, "silent");
            }, t("mcSomethingWrong")),
        },
      ]);
    },
    [loadFirstPage, runBlocking, t],
  );

  const doDelete = useCallback(
    (cls: MasterClass) => {
      Alert.alert(
        t("mcDeleteDraftConfirmTitle"),
        t("mcDeleteDraftConfirmText"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("delete"),
            style: "destructive",
            onPress: () =>
              void runBlocking(async () => {
                await removeClass(cls.id);
                setCounts((prev) =>
                  prev
                    ? { ...prev, drafts: Math.max(0, prev.drafts - 1) }
                    : prev,
                );
                showBannerRef.current(t("mcDraftDeleted"), "", "success");
                void loadFirstPage(tabRef.current, "silent");
              }, t("mcSomethingWrong")),
          },
        ],
      );
    },
    [loadFirstPage, runBlocking, t],
  );

  const handleAction = useCallback(
    (action: ProClassAction, cls: MasterClass) => {
      setSheetVisible(false);
      const id = String(cls.id);
      switch (action) {
        case "view":
          push(DETAIL_PATH, { id });
          return;
        case "edit":
        case "reschedule":
          push(EDITOR_PATH, { id });
          return;
        case "students":
          push(STUDENTS_PATH, { id, title: cls.title });
          return;
        case "publish":
          push(PUBLISH_PATH, { id });
          return;
        case "renew":
          push(PUBLISH_PATH, { id, mode: "renew" });
          return;
        case "duplicate":
          setTimeout(() => void doDuplicate(cls), SHEET_CLOSE_MS);
          return;
        case "cancel":
          setTimeout(() => doCancel(cls), SHEET_CLOSE_MS);
          return;
        case "delete":
          setTimeout(() => doDelete(cls), SHEET_CLOSE_MS);
          return;
      }
    },
    [doCancel, doDelete, doDuplicate, push],
  );

  // ── Render ───────────────────────────────────────────────────────

  const tabLabel = (key: MasterClassTab, labelKey: string) => {
    const label = t(labelKey);
    const count = counts?.[key] ?? 0;
    return count > 0 ? t("mcTabWithCount", { label, count }) : label;
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="school-outline"
            size={iconScale(34)}
            color={theme.darkGreen}
          />
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">
          {t("mcClassesTitle")}
        </Text>
        <Text style={styles.heroSubtitle}>{t("mcClassesSubtitle")}</Text>
      </View>

      {needsStripe ? (
        <View style={styles.stripeCard}>
          <View style={styles.stripeIcon}>
            <Ionicons
              name="card-outline"
              size={iconScale(20)}
              color={theme.orangeBrownText}
            />
          </View>
          <View style={styles.stripeBody}>
            <Text style={styles.stripeTitle}>{t("mcConnectStripeTitle")}</Text>
            <Text style={styles.stripeText}>{t("mcConnectStripeText")}</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={openStripe}
              style={styles.stripeButton}
              accessibilityRole="button"
              accessibilityLabel={t("mcConnectStripe")}
            >
              <Text style={styles.stripeButtonText}>
                {t("mcConnectStripe")}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={iconScale(15)}
                color={theme.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.createRing}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCreate}
          style={styles.createButton}
          accessibilityRole="button"
          accessibilityLabel={t("mcCreateClass")}
        >
          <Ionicons name="add" size={iconScale(24)} color={theme.white} />
          <Text style={styles.createText}>{t("mcCreateClass")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {MASTER_CLASS_TABS.map(({ value, labelKey }) => {
          const active = tab === value;
          const label = tabLabel(value, labelKey);
          return (
            <TouchableOpacity
              key={value}
              activeOpacity={0.8}
              onPress={() => setTab(value)}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (!current.loaded) {
      return (
        <View style={styles.skeletons}>
          <ProListCardSkeleton />
          <ProListCardSkeleton />
          <ProListCardSkeleton />
        </View>
      );
    }
    if (current.error) {
      return (
        <ClassStateView
          icon="cloud-offline-outline"
          title={t("mcLoadError")}
          actionLabel={t("retry")}
          actionIcon="refresh"
          onAction={() => void loadFirstPage(tab, "initial")}
        />
      );
    }
    const empty = EMPTY_STATE[tab];
    return (
      <ClassStateView
        icon={empty.icon}
        title={t(empty.titleKey)}
        message={t(empty.textKey)}
        actionLabel={t("mcCreateClass")}
        actionIcon="add"
        onAction={handleCreate}
      />
    );
  };

  if (forbidden) {
    return (
      <View style={styles.container}>
        <StackHeader title="" centerLogo />
        <ClassStateView
          style={styles.forbidden}
          icon="lock-closed-outline"
          title={t("mcMasterClasses")}
          message={t("mcOwnerOnly")}
          actionLabel={t("goBack")}
          actionIcon="arrow-back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StackHeader title="" centerLogo />
      <FlatList
        data={current.loaded && !current.error ? current.items : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProListCard
            masterClass={item}
            onPress={openClass}
            onMenu={openMenu}
            onRenew={openRenew}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={ListGap}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + moderateHeightScale(28) },
        ]}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage(tab, "refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <ProListActionSheet
        masterClass={sheetClass}
        tab={tab}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={handleAction}
      />
    </View>
  );
}

const ListGap = () => <View style={{ height: moderateHeightScale(14) }} />;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: moderateWidthScale(16),
    },
    headerBlock: {
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(16),
      gap: moderateHeightScale(18),
    },
    hero: {
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(8),
    },
    heroIcon: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.orangeBrown015,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      marginBottom: moderateHeightScale(10),
    },
    heroTitle: {
      fontSize: fontSize.size26,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    heroSubtitle: {
      marginTop: moderateHeightScale(6),
      fontSize: fontSize.size14,
      lineHeight: fontSize.size14 * 1.45,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
      textAlign: "center",
      maxWidth: moderateWidthScale(330),
    },

    // Stripe Connect needed
    stripeCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
    },
    stripeIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(19),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.tilePeach,
    },
    stripeBody: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    stripeTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    stripeText: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    stripeButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: moderateWidthScale(6),
      minHeight: 44,
      marginTop: moderateHeightScale(6),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.darkGreen,
    },
    stripeButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // Create Class (dark green with a soft orange ring, like the sample)
    createRing: {
      padding: moderateWidthScale(3),
      borderRadius: moderateWidthScale(17),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown30,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: moderateHeightScale(54),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.darkGreen,
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 3,
    },
    createText: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    // Tabs
    tabs: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
    },
    tab: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: moderateWidthScale(8),
      borderRadius: moderateWidthScale(22),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    tabActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    tabText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    tabTextActive: {
      fontFamily: fonts.fontBold,
      color: theme.white,
    },

    skeletons: {
      gap: moderateHeightScale(14),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
    forbidden: {
      flex: 1,
    },
  });
