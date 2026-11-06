// ⋮ menu of a pro class card: the actions the class's state allows.

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import type { MasterClass, MasterClassTab } from "@/src/types/masterClass";
import { formatClassPrice } from "@/src/utils/masterClassHelpers";
import type { IoniconName } from "@/src/components/masterClasses/parts";

export type ProClassAction =
  | "view"
  | "edit"
  | "reschedule"
  | "duplicate"
  | "students"
  | "publish"
  | "renew"
  | "cancel"
  | "delete";

type ActionRow = {
  key: ProClassAction;
  label: string;
  icon: IoniconName;
  destructive?: boolean;
  highlight?: boolean;
};

/** What the ⋮ menu offers for this class (guide 13.1). */
export function getProClassActions(
  cls: MasterClass,
  tab: MasterClassTab,
): ProClassAction[] {
  const isDraft = cls.status === "draft";
  const isPublished = cls.status === "published";
  const isPast = tab === "past";
  const actions: ProClassAction[] = ["view"];
  if (isDraft) actions.push("edit", "publish");
  if (isPublished && !isPast) actions.push("reschedule");
  if (isPublished && cls.listing?.can_renew) actions.push("renew");
  if (!isDraft) actions.push("students");
  actions.push("duplicate");
  if (isPublished && !isPast) actions.push("cancel");
  if (isDraft) actions.push("delete");
  return actions;
}

type ProListActionSheetProps = {
  masterClass: MasterClass | null;
  tab: MasterClassTab;
  visible: boolean;
  onClose: () => void;
  onSelect: (action: ProClassAction, cls: MasterClass) => void;
};

export default function ProListActionSheet({
  masterClass,
  tab,
  visible,
  onClose,
  onSelect,
}: ProListActionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const rows = useMemo<ActionRow[]>(() => {
    if (!masterClass) return [];
    const fee = formatClassPrice(masterClass.listing?.fee ?? 50);
    const meta: Record<ProClassAction, Omit<ActionRow, "key">> = {
      view: { label: t("mcViewClass"), icon: "eye-outline" },
      edit: { label: t("mcEdit"), icon: "create-outline" },
      reschedule: { label: t("mcReschedule"), icon: "calendar-outline" },
      duplicate: { label: t("mcDuplicate"), icon: "copy-outline" },
      students: { label: t("mcViewStudents"), icon: "people-outline" },
      publish: {
        label: t("mcPublishWithFee", { fee }),
        icon: "megaphone-outline",
        highlight: true,
      },
      renew: {
        label: t("mcRenewListing"),
        icon: "refresh",
        highlight: true,
      },
      cancel: {
        label: t("mcCancelClass"),
        icon: "close-circle-outline",
        destructive: true,
      },
      delete: {
        label: t("mcDeleteDraft"),
        icon: "trash-outline",
        destructive: true,
      },
    };
    return getProClassActions(masterClass, tab).map((key) => ({
      key,
      ...meta[key],
    }));
  }, [masterClass, tab, t]);

  const regular = rows.filter((r) => !r.destructive);
  const destructive = rows.filter((r) => r.destructive);

  const renderRow = (row: ActionRow) => {
    const fg = row.destructive
      ? theme.red
      : row.highlight
        ? theme.orangeBrownText
        : theme.darkGreen;
    const bg = row.destructive
      ? theme.lightRed
      : row.highlight
        ? theme.tilePeach
        : theme.lightGreen07;
    return (
      <TouchableOpacity
        key={row.key}
        activeOpacity={0.7}
        onPress={() => masterClass && onSelect(row.key, masterClass)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={row.label}
      >
        <View style={[styles.rowIcon, { backgroundColor: bg }]}>
          <Ionicons name={row.icon} size={iconScale(19)} color={fg} />
        </View>
        <Text
          style={[
            styles.rowLabel,
            { color: fg },
            (row.destructive || row.highlight) && styles.rowLabelStrong,
          ]}
          numberOfLines={1}
        >
          {row.label}
        </Text>
        {!row.destructive ? (
          <Ionicons
            name="chevron-forward"
            size={iconScale(16)}
            color={theme.lightGreen4}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={masterClass?.title || t("mcMoreActions")}
    >
      <View style={styles.list}>{regular.map(renderRow)}</View>
      {destructive.length ? (
        <>
          <View style={styles.divider} />
          <View style={styles.list}>{destructive.map(renderRow)}</View>
        </>
      ) : null}
    </ModalizeBottomSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: moderateHeightScale(2),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: 52,
      paddingVertical: moderateHeightScale(6),
    },
    rowIcon: {
      width: moderateWidthScale(38),
      height: moderateWidthScale(38),
      borderRadius: moderateWidthScale(11),
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
    },
    rowLabelStrong: {
      fontFamily: fonts.fontBold,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
      marginVertical: moderateHeightScale(8),
    },
  });
