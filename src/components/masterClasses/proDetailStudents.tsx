// Students preview on the pro class detail: count, first 3 rows, "View all".

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import { SectionCard, StatusChip } from "@/src/components/masterClasses/parts";
import { enrollments, parseApiError } from "@/src/services/masterClassService";
import type { ClassStudent } from "@/src/types/masterClass";
import {
  formatClassPrice,
  getEnrollmentStatusMeta,
  getInitials,
} from "@/src/utils/masterClassHelpers";

const PREVIEW_COUNT = 3;

type Props = {
  classId: number;
  /** Bump to refetch (pull-to-refresh, after cancelling the class). */
  reloadKey?: number;
  onViewAll: () => void;
};

export default function ProDetailStudents({ classId, reloadKey = 0, onViewAll }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const [rows, setRows] = useState<ClassStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!loadedRef.current) setLoading(true);
    setError(null);
    try {
      const res = await enrollments(classId, 1);
      if (requestId !== requestRef.current) return;
      loadedRef.current = true;
      setRows(res.items.slice(0, PREVIEW_COUNT));
      setTotal(Math.max(res.meta?.total ?? 0, res.items.length));
    } catch (err) {
      if (requestId !== requestRef.current) return;
      if (!loadedRef.current) {
        setError(parseApiError(err, t("mcSomethingWrong")).message);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    void load();
    return () => {
      // drop answers that arrive after unmount
      requestRef.current += 1;
    };
  }, [load, reloadKey]);

  const viewAll =
    total > 0 ? (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onViewAll}
        style={styles.viewAll}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`${t("mcViewAll")}, ${t("mcStudentsCount", { count: total })}`}
      >
        <Text style={styles.viewAllText}>{t("mcViewAll")}</Text>
        <Ionicons name="chevron-forward" size={iconScale(16)} color={theme.orangeBrownText} />
      </TouchableOpacity>
    ) : null;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.placeholder}>
        <ActivityIndicator color={theme.darkGreen} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.placeholder}>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => void load()}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel={t("retry")}
        >
          <Ionicons name="refresh" size={iconScale(16)} color={theme.darkGreen} />
          <Text style={styles.retryText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (rows.length === 0) {
    body = (
      <View style={styles.emptyRow}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={iconScale(20)} color={theme.darkGreen} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.emptyTitle}>{t("mcNoStudentsTitle")}</Text>
          <Text style={styles.muted}>{t("mcNoStudentsText")}</Text>
        </View>
      </View>
    );
  } else {
    body = rows.map((row, index) => {
      const name = row.student.name || row.student.email || "—";
      const contact = [row.student.email, row.student.phone].filter(Boolean).join(" · ");
      const paid = row.paid_at && dayjs(row.paid_at).isValid()
        ? t("mcPaidOn", { date: dayjs(row.paid_at).format("MMM D") })
        : "";
      const status = getEnrollmentStatusMeta(row.status);
      return (
        <View
          key={row.id || index}
          style={[styles.row, index > 0 && styles.rowBorder]}
          accessible
          accessibilityLabel={[name, status.label, formatClassPrice(row.amount), paid]
            .filter(Boolean)
            .join(", ")}
        >
          <View style={styles.avatar}>
            <AppImage
              uri={row.student.image_url}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              fallback={<Text style={styles.avatarText}>{getInitials(name)}</Text>}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {contact ? (
              <Text style={styles.contact} numberOfLines={1}>
                {contact}
              </Text>
            ) : null}
            <StatusChip meta={status} style={styles.rowChip} />
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.amount}>{formatClassPrice(row.amount)}</Text>
            {paid ? <Text style={styles.paid}>{paid}</Text> : null}
          </View>
        </View>
      );
    });
  }

  return (
    <SectionCard
      title={total > 0 ? `${t("mcStudents")} (${total})` : t("mcStudents")}
      icon="people-outline"
      right={viewAll}
    >
      {body}
    </SectionCard>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex1: { flex: 1 },
    viewAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(2),
      minHeight: moderateHeightScale(32),
      paddingLeft: moderateWidthScale(8),
    },
    viewAllText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.orangeBrownText,
    },
    placeholder: {
      minHeight: moderateHeightScale(72),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(8),
    },
    muted: {
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    retry: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      minHeight: moderateHeightScale(44),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.borderMedium,
    },
    retryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    emptyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(72),
    },
    emptyIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(10),
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    avatar: {
      width: moderateWidthScale(42),
      height: moderateWidthScale(42),
      borderRadius: moderateWidthScale(21),
      overflow: "hidden",
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    rowText: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    contact: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
    rowChip: { marginTop: moderateHeightScale(3) },
    rowRight: { alignItems: "flex-end", gap: moderateHeightScale(2) },
    amount: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    paid: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.textMuted,
    },
  });
