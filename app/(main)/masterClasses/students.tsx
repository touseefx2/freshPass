import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  enrollments as fetchEnrollments,
  getClass,
  parseApiError,
} from "@/src/services/masterClassService";
import type { ClassStudent } from "@/src/types/masterClass";
import {
  formatClassPrice,
  formatIsoOnOwnClock,
  getEnrollmentStatusMeta,
  getInitials,
} from "@/src/utils/masterClassHelpers";
import {
  ClassStateView,
  StatusChip,
} from "@/src/components/masterClasses/parts";

/** Pro: students enrolled in one class (`GET /master-classes/{id}/enrollments`). */
export default function MasterClassStudentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const classId = typeof params.id === "string" ? params.id : "";

  const [classTitle, setClassTitle] = useState(
    typeof params.title === "string" ? params.title : "",
  );
  const [items, setItems] = useState<ClassStudent[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{
    status: number | null;
    message: string;
  } | null>(null);

  const requestRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!classId) {
        setLoading(false);
        setError({ status: 404, message: t("mcClassUnavailable") });
        return;
      }
      const request = ++requestRef.current;
      if (mode === "initial") {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }
      try {
        const result = await fetchEnrollments(classId, 1);
        if (request !== requestRef.current) return;
        setItems(result.items);
        setPage(result.meta?.current_page || 1);
        setLastPage(result.meta?.last_page || 1);
        setTotal(result.meta?.total ?? result.items.length);
        setError(null);
      } catch (err) {
        if (request !== requestRef.current) return;
        const parsed = parseApiError(err, t("mcSomethingWrong"));
        if (mode === "refresh" && itemsRef.current.length > 0) {
          showBannerRef.current(t("mcSomethingWrong"), parsed.message, "error");
        } else {
          setError({ status: parsed.status, message: parsed.message });
        }
      } finally {
        if (request === requestRef.current) setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [classId, t],
  );

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMore || page >= lastPage) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await fetchEnrollments(classId, next);
      if (request !== requestRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...result.items.filter((s) => !seen.has(s.id))];
      });
      setPage(next);
      if (result.meta?.last_page) setLastPage(result.meta.last_page);
    } catch {
      // Keep what is loaded; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  }, [classId, lastPage, loading, loadingMore, page, refreshing]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Opened without a title (e.g. from a notification): fetch it quietly
  useEffect(() => {
    if (classTitle || !classId) return;
    let active = true;
    getClass(classId)
      .then((cls) => {
        if (active && cls.title) setClassTitle(cls.title);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [classId, classTitle]);

  const renderItem = useCallback(
    ({ item }: { item: ClassStudent }) => {
      const { student } = item;
      // No name on file: the first contact detail stands in for it
      const name = student.name || student.email || student.phone || "—";
      const contact = [student.email, student.phone]
        .filter((part) => part && part !== name)
        .join(" · ");
      const paid = item.paid_at
        ? t("mcPaidOn", { date: formatIsoOnOwnClock(item.paid_at, false) })
        : "";
      const status = getEnrollmentStatusMeta(item.status);
      const amount = formatClassPrice(item.amount);
      return (
        <View
          style={styles.row}
          accessible
          accessibilityLabel={[name, contact, status.label, amount, paid]
            .filter(Boolean)
            .join(", ")}
        >
          <View style={styles.avatar}>
            <AppImage
              uri={student.image_url}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              fallback={
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              }
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {contact ? (
              <Text style={styles.contact} numberOfLines={2}>
                {contact}
              </Text>
            ) : null}
            <View style={styles.rowMeta}>
              <StatusChip meta={status} />
              {paid ? (
                <Text style={styles.paid} numberOfLines={1}>
                  {paid}
                </Text>
              ) : null}
            </View>
          </View>
          {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        </View>
      );
    },
    [styles, t],
  );

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {t("mcStudents")}
      </Text>
      {classTitle ? (
        <View style={styles.classRow}>
          <MaterialCommunityIcons
            name="school-outline"
            size={iconScale(17)}
            color={theme.darkGreenLight}
          />
          <Text style={styles.classTitle} numberOfLines={2}>
            {classTitle}
          </Text>
        </View>
      ) : null}
      {total != null && total > 0 && !error ? (
        <View style={styles.countPill}>
          <Text style={styles.countText}>
            {t("mcStudentsCount", { count: total })}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return <ClassStateView loading style={styles.state} />;
    }
    if (error) {
      if (error.status === 403) {
        return (
          <ClassStateView
            style={styles.state}
            icon="lock-closed-outline"
            message={t("mcOwnerOnly")}
            actionLabel={t("goBack")}
            actionIcon="arrow-back"
            onAction={() => router.back()}
          />
        );
      }
      if (error.status === 404) {
        return (
          <ClassStateView
            style={styles.state}
            icon="alert-circle-outline"
            message={t("mcClassUnavailable")}
            actionLabel={t("goBack")}
            actionIcon="arrow-back"
            onAction={() => router.back()}
          />
        );
      }
      return (
        <ClassStateView
          style={styles.state}
          icon="cloud-offline-outline"
          title={t("mcSomethingWrong")}
          message={error.message}
          actionLabel={t("retry")}
          actionIcon="refresh"
          onAction={() => void load("initial")}
        />
      );
    }
    return (
      <ClassStateView
        style={styles.state}
        icon="people-outline"
        title={t("mcNoStudentsTitle")}
        message={t("mcNoStudentsText")}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title="" centerLogo />
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={loading || error ? [] : items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={RowGap}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const RowGap = () => <View style={{ height: moderateHeightScale(10) }} />;

const AVATAR = moderateWidthScale(46);

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
      gap: moderateHeightScale(8),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    classRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    classTitle: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
    },
    countPill: {
      alignSelf: "flex-start",
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      backgroundColor: theme.lightGreen07,
    },
    countText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.surfaceRaised,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.darkGreen,
    },
    avatarText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    rowBody: {
      flex: 1,
      gap: moderateHeightScale(4),
    },
    name: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    contact: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.35,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    rowMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginTop: moderateHeightScale(2),
    },
    paid: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
    },
    amount: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    state: {
      flex: 1,
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(16),
    },
  });
