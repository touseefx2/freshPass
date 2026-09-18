import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
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
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import {
  fetchReportReasons,
  reportReel,
  reportReelComment,
} from "@/src/services/reelsService";
import {
  REPORT_REASONS_REQUIRING_NOTE,
  type ReportReason,
} from "@/src/types/reels";

const NOTE_MAX_LENGTH = 500;

export type ReportTarget =
  | { kind: "reel"; reelId: number }
  | { kind: "comment"; reelId: number; commentId: number };

interface ReelReportSheetProps {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(12),
    },
    reasonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    radio: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.orangeBrown,
    },
    radioInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    reasonLabel: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    noteLabel: {
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(6),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    noteInput: {
      minHeight: moderateHeightScale(90),
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      backgroundColor: theme.background,
      textAlignVertical: "top",
    },
    loading: {
      paddingVertical: moderateHeightScale(30),
    },
  });

export default function ReelReportSheet({
  visible,
  onClose,
  target,
}: ReelReportSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();

  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedReason(null);
    setNote("");
    if (reasons.length > 0) return;
    setLoadingReasons(true);
    (async () => {
      try {
        setReasons(await fetchReportReasons());
      } catch (error) {
        Logger.error("Failed to load report reasons:", error);
        showBanner(t("error"), t("failedToReport"), "error", 3000);
      } finally {
        setLoadingReasons(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const noteRequired =
    !!selectedReason && REPORT_REASONS_REQUIRING_NOTE.includes(selectedReason);
  const canSubmit =
    !!selectedReason &&
    !submitting &&
    (!noteRequired || note.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (!target || !selectedReason || !canSubmit) return;
    setSubmitting(true);
    try {
      if (target.kind === "comment") {
        await reportReelComment(
          target.reelId,
          target.commentId,
          selectedReason,
          note,
        );
      } else {
        await reportReel(target.reelId, selectedReason, note);
      }
      // A duplicate report (`already: true`) is not an error — same thanks message.
      showBanner(t("success"), t("reportSubmitted"), "success", 2500);
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.reason?.[0] ||
        error?.response?.data?.errors?.note?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        t("failedToReport");
      showBanner(t("error"), message, "error", 3000);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, note, onClose, selectedReason, showBanner, t, target]);

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={
        target?.kind === "comment" ? t("reportComment") : t("reportReel")
      }
      footerButtonTitle={submitting ? t("submitting") : t("submitReport")}
      onFooterButtonPress={handleSubmit}
      footerButtonDisabled={!canSubmit}
      maxHeightPercent={0.88}
    >
      <Text style={styles.intro}>{t("reportIntro")}</Text>

      {loadingReasons ? (
        <ActivityIndicator
          style={styles.loading}
          size="large"
          color={theme.darkGreen}
        />
      ) : (
        reasons.map((reason) => {
          const selected = selectedReason === reason.value;
          return (
            <TouchableOpacity
              key={reason.value}
              style={styles.reasonRow}
              onPress={() => setSelectedReason(reason.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.reasonLabel}>{reason.label}</Text>
            </TouchableOpacity>
          );
        })
      )}

      {selectedReason ? (
        <>
          <Text style={styles.noteLabel}>
            {noteRequired ? t("reportNoteRequired") : t("reportNote")}
          </Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t("reportNotePlaceholder")}
            placeholderTextColor={theme.lightGreen}
            multiline
            maxLength={NOTE_MAX_LENGTH}
          />
        </>
      ) : null}
    </ModalizeBottomSheet>
  );
}
