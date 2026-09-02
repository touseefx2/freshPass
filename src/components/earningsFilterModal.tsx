import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import type {
  EarningsFilters,
  PaymentStatusFilter,
  RevenueSourceFilter,
  TransactionTypeFilter,
} from "@/src/types/businessEarnings";
import { DEFAULT_EARNINGS_FILTERS } from "@/src/services/businessEarningsService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(20),
      borderTopRightRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
    },
    handle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderNormal,
      marginBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(16),
    },
    sectionLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen6,
      marginBottom: moderateHeightScale(8),
      marginTop: moderateHeightScale(8),
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    chip: {
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(8),
      borderRadius: moderateWidthScale(20),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    chipActive: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    chipText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    chipTextActive: {
      color: theme.white,
    },
    actions: {
      marginTop: moderateHeightScale(20),
      gap: moderateHeightScale(10),
    },
    resetBtn: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(8),
    },
    resetText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen6,
    },
  });

type ChipOption<T extends string> = { value: T; label: string };

type Props = {
  visible: boolean;
  filters: Required<EarningsFilters>;
  onClose: () => void;
  onApply: (filters: Required<EarningsFilters>) => void;
};

export default function EarningsFilterModal({
  visible,
  filters,
  onClose,
  onApply,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const sourceOptions: ChipOption<RevenueSourceFilter>[] = [
    { value: "all", label: t("earningsFilterAll") },
    { value: "appointment", label: t("earningsFilterAppointments") },
    { value: "subscription", label: t("earningsFilterMemberships") },
    { value: "tip", label: t("earningsFilterTips") },
    { value: "other", label: t("earningsFilterOther") },
  ];

  const statusOptions: ChipOption<PaymentStatusFilter>[] = [
    { value: "all", label: t("earningsFilterAll") },
    { value: "paid", label: t("earningsStatusPaid") },
    { value: "refunded", label: t("earningsStatusRefunded") },
    { value: "partially_refunded", label: t("earningsStatusPartialRefund") },
  ];

  const typeOptions: ChipOption<TransactionTypeFilter>[] = [
    { value: "all", label: t("earningsFilterAll") },
    { value: "charge", label: t("earningsFilterCharges") },
    { value: "refund", label: t("earningsFilterRefunds") },
  ];

  const renderChips = <T extends string>(
    options: ChipOption<T>[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.chipsRow}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t("earningsFilters")}</Text>

          <Text style={styles.sectionLabel}>{t("earningsFilterSource")}</Text>
          {renderChips(sourceOptions, draft.revenueSource, (revenueSource) =>
            setDraft((prev) => ({ ...prev, revenueSource })),
          )}

          <Text style={styles.sectionLabel}>{t("earningsFilterStatus")}</Text>
          {renderChips(statusOptions, draft.paymentStatus, (paymentStatus) =>
            setDraft((prev) => ({ ...prev, paymentStatus })),
          )}

          <Text style={styles.sectionLabel}>{t("earningsFilterType")}</Text>
          {renderChips(typeOptions, draft.transactionType, (transactionType) =>
            setDraft((prev) => ({ ...prev, transactionType })),
          )}

          <View style={styles.actions}>
            <Button
              title={t("apply")}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setDraft(DEFAULT_EARNINGS_FILTERS)}
              activeOpacity={0.7}
            >
              <Text style={styles.resetText}>{t("earningsResetFilters")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
