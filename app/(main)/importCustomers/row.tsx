import React, { useEffect, useMemo, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FlowButton from "@/src/components/reelFlow/flowButton";
import {
  EditorChips,
  EditorFieldError,
  EditorLabel,
  EditorPickerBox,
  EditorTextInput,
} from "@/src/components/masterClasses/editorFields";
import PastDateSheet from "@/src/components/businessCustomers/PastDateSheet";
import { formatCustomerDate } from "@/src/components/businessCustomers/customerDisplay";
import { rowActionLabel } from "@/src/components/importCustomers/importDisplay";
import { importFlowCache } from "@/src/components/importCustomers/importFlowCache";
import {
  customerErrorText,
  customerFieldErrors,
  getBusinessCustomerRecord,
  updateImportRow,
} from "@/src/services/businessCustomerService";
import type { ImportRow, ImportRowPatch } from "@/src/types/businessCustomer";

type FormKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "last_visit_on"
  | "previous_customer"
  | "email_status"
  | "consent_on"
  | "consent_source";

/** What the server read, under the PATCH field names. */
function formFromRow(row: ImportRow): Record<FormKey, string> {
  const d = row.data;
  const full = d.full_name ?? d.name ?? "";
  const [first, ...rest] = full.split(" ");
  return {
    first_name: d.first_name ?? (full ? first : "") ?? "",
    last_name: d.last_name ?? (full ? rest.join(" ") : "") ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    last_visit_on: d.last_visit_on ?? d.last_completed_visit_date ?? "",
    previous_customer: d.previous_customer ?? "",
    email_status: d.email_status ?? d.email_marketing_status ?? "",
    consent_on: d.consent_on ?? d.email_consent_date ?? "",
    consent_source: d.consent_source ?? d.email_consent_source ?? "",
  };
}

export default function ImportRowScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const importId = importFlowCache.importId;
  const columns = importFlowCache.columns;
  const [row, setRow] = useState<ImportRow | null>(importFlowCache.row);
  const [form, setForm] = useState<Record<FormKey, string> | null>(
    row ? formFromRow(row) : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [datePick, setDatePick] = useState<null | "last_visit_on" | "consent_on">(null);
  const [candidateNames, setCandidateNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!row || importId == null) router.back();
  }, [row, importId, router]);

  // Names for the "update this customer" choices (max 3 lookups)
  useEffect(() => {
    if (!row?.candidateIds.length) return;
    row.candidateIds.slice(0, 3).forEach((cid) => {
      getBusinessCustomerRecord(cid)
        .then((c) =>
          setCandidateNames((m) => ({
            ...m,
            [cid]: [c.name, c.email || c.phone].filter(Boolean).join(" · "),
          })),
        )
        .catch(() => {});
    });
  }, [row?.candidateIds]);

  if (!row || !form || importId == null) return null;

  const original = formFromRow(row);
  const set = (key: FormKey) => (value: string) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const apply = async (key: string, body: ImportRowPatch) => {
    setBusy(key);
    setError(null);
    setFieldErrors({});
    try {
      const res = await updateImportRow(importId, row.id, body);
      importFlowCache.updatedSummary = res.summary;
      importFlowCache.rowsChanged = true;
      importFlowCache.row = res.row;
      const resolved =
        body.action != null ||
        (res.row.errors.length === 0 && res.row.status !== "conflict");
      if (resolved) {
        router.back();
        return;
      }
      setRow(res.row);
      setForm(formFromRow(res.row));
    } catch (err: any) {
      setFieldErrors(customerFieldErrors(err));
      setError(customerErrorText(err, t("bcuSaveError")));
    } finally {
      setBusy(null);
    }
  };

  const saveFixes = () => {
    const changed: NonNullable<ImportRowPatch["data"]> = {};
    (Object.keys(form) as FormKey[]).forEach((k) => {
      const v = form[k].trim();
      if (v !== (original[k] ?? "").trim()) changed[k] = v || null;
    });
    if (!Object.keys(changed).length) {
      setError(t("bcuNothingChanged"));
      return;
    }
    apply("fix", { data: changed });
  };

  const status = row.status;
  const canDecide = status === "conflict" || status === "duplicate" || row.candidateIds.length > 0;
  const action = rowActionLabel(t, row.action);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" />
      <StackHeader
        title={row.rowNumber != null ? t("bcuRowN", { n: row.rowNumber }) : t("bcuRow")}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, statusTone(theme, status)]}>
            <Text style={[styles.statusText, { color: statusTone(theme, status).color }]}>
              {statusLabel(t, status)}
            </Text>
          </View>
          {action ? <Text style={styles.actionText}>{action}</Text> : null}
        </View>

        {row.errors.map((e, i) => (
          <View key={`e${i}`} style={styles.msgRow}>
            <MaterialIcons name="error-outline" size={16} color={theme.red} />
            <Text style={[styles.msgText, { color: theme.red }]}>{e}</Text>
          </View>
        ))}
        {row.warnings.map((w, i) => (
          <View key={`w${i}`} style={styles.msgRow}>
            <MaterialIcons name="info-outline" size={16} color={theme.accentAmber} />
            <Text style={[styles.msgText, { color: theme.accentAmber }]}>{w}</Text>
          </View>
        ))}

        {row.raw.some((c) => c.value.trim()) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("bcuFromYourFile")}</Text>
            {row.raw.map((cell, i) =>
              cell.value.trim() ? (
                <View key={`r${i}`} style={styles.rawRow}>
                  <Text style={styles.rawKey} numberOfLines={1}>
                    {cell.label?.trim() ||
                      columns[i]?.trim() ||
                      t("bcuColumnN", { n: i + 1 })}
                  </Text>
                  <Text style={styles.rawValue}>{cell.value}</Text>
                </View>
              ) : null,
            )}
          </View>
        ) : null}

        {canDecide ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("bcuDecideTitle")}</Text>
            <Text style={styles.hint}>
              {status === "conflict" ? t("bcuConflictText") : t("bcuDuplicateText")}
            </Text>
            {row.candidateIds.map((cid) => (
              <FlowButton
                key={cid}
                label={t("bcuUpdateExisting", {
                  name: candidateNames[cid] ?? `#${cid}`,
                })}
                variant="outline"
                compact
                icon="sync"
                style={styles.gapTop}
                loading={busy === `update${cid}`}
                disabled={!!busy}
                onPress={() =>
                  apply(`update${cid}`, { action: "update", match_customer_id: cid })
                }
              />
            ))}
            <FlowButton
              label={t("bcuCreateNew")}
              variant="outline"
              compact
              icon="person-add"
              style={styles.gapTop}
              loading={busy === "create"}
              disabled={!!busy}
              onPress={() => apply("create", { action: "create" })}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("bcuFixTitle")}</Text>
          <Text style={styles.hint}>{t("bcuFixText")}</Text>
          <View style={styles.form}>
            <EditorTextInput
              label={t("bcuFirstName")}
              value={form.first_name}
              onChangeText={set("first_name")}
              error={fieldErrors.first_name}
              autoCapitalize="words"
            />
            <EditorTextInput
              label={t("bcuLastName")}
              value={form.last_name}
              onChangeText={set("last_name")}
              error={fieldErrors.last_name}
              autoCapitalize="words"
            />
            <EditorTextInput
              label={t("bcuEmail")}
              value={form.email}
              onChangeText={set("email")}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <EditorTextInput
              label={t("bcuPhone")}
              value={form.phone}
              onChangeText={set("phone")}
              error={fieldErrors.phone}
              keyboardType="phone-pad"
            />
            <EditorPickerBox
              label={t("bcuFieldLastVisit")}
              icon="calendar-outline"
              value={form.last_visit_on ? formatCustomerDate(form.last_visit_on) : null}
              placeholder={t("bcuPickDate")}
              onPress={() => setDatePick("last_visit_on")}
              error={fieldErrors.last_visit_on}
            />
            {form.last_visit_on ? (
              <TouchableOpacity
                onPress={() => set("last_visit_on")("")}
                hitSlop={8}
                style={styles.clear}
              >
                <Text style={styles.clearText}>{t("bcuClearDate")}</Text>
              </TouchableOpacity>
            ) : null}
            <EditorLabel label={t("bcuFieldPrevious")} />
            <EditorChips
              options={[
                { value: "yes", label: t("bcuYes") },
                { value: "no", label: t("bcuNo") },
                { value: "unknown", label: t("bcuUnknown") },
              ]}
              value={form.previous_customer || "unknown"}
              onChange={(v) => set("previous_customer")(v)}
            />
            {fieldErrors.previous_customer ? (
              <EditorFieldError message={fieldErrors.previous_customer} />
            ) : null}
            <EditorLabel label={t("bcuFieldEmailStatus")} />
            <EditorChips
              options={[
                { value: "subscribed", label: t("bcuEmailSubscribedShort") },
                { value: "unsubscribed", label: t("bcuEmailUnsubscribed") },
                { value: "unknown", label: t("bcuUnknown") },
              ]}
              value={form.email_status || "unknown"}
              onChange={(v) => set("email_status")(v)}
            />
            {fieldErrors.email_status ? (
              <EditorFieldError message={fieldErrors.email_status} />
            ) : null}
            {form.email_status === "subscribed" ? (
              <>
                <EditorPickerBox
                  label={t("bcuConsentDate")}
                  icon="calendar-outline"
                  value={form.consent_on ? formatCustomerDate(form.consent_on) : null}
                  placeholder={t("bcuPickDate")}
                  onPress={() => setDatePick("consent_on")}
                  error={fieldErrors.consent_on}
                />
                <EditorTextInput
                  label={t("bcuConsentSource")}
                  value={form.consent_source}
                  onChangeText={set("consent_source")}
                  placeholder={t("bcuConsentSourcePlaceholder")}
                  error={fieldErrors.consent_source}
                />
              </>
            ) : null}
          </View>
          {error ? <EditorFieldError message={error} /> : null}
          <FlowButton
            label={t("bcuSaveFixes")}
            compact
            icon="check"
            style={styles.gapTop}
            loading={busy === "fix"}
            disabled={!!busy}
            onPress={saveFixes}
          />
        </View>

        <FlowButton
          label={t("bcuSkipRow")}
          variant="text"
          danger
          loading={busy === "skip"}
          disabled={!!busy}
          onPress={() => apply("skip", { action: "skip" })}
        />
      </KeyboardAwareScrollView>

      <PastDateSheet
        visible={datePick != null}
        title={datePick === "consent_on" ? t("bcuConsentDate") : t("bcuFieldLastVisit")}
        value={datePick ? form[datePick] || null : null}
        onClose={() => setDatePick(null)}
        onConfirm={(date) => {
          if (datePick) set(datePick)(date);
          setDatePick(null);
        }}
      />
    </SafeAreaView>
  );
}

function statusLabel(t: (k: string) => string, status: string) {
  if (status === "valid") return t("bcuReady");
  if (status === "duplicate") return t("bcuDuplicate");
  if (status === "invalid") return t("bcuNeedsFix");
  if (status === "conflict") return t("bcuConflict");
  return status;
}

function statusTone(theme: Theme, status: string) {
  if (status === "valid") return { backgroundColor: theme.mintTint, color: theme.successGreen };
  if (status === "invalid") return { backgroundColor: theme.lightRed, color: theme.red };
  if (status === "conflict") return { backgroundColor: theme.noticeCream, color: theme.accentAmber };
  return { backgroundColor: theme.lightGreen1, color: theme.darkGreen };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    statusChip: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusText: { fontFamily: fonts.fontMedium, fontSize: fontSize.size12 },
    actionText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.successGreen,
    },
    msgRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 6 },
    msgText: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      lineHeight: fontSize.size13 * 1.4,
    },
    card: {
      marginTop: moderateHeightScale(14),
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    cardTitle: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size15,
      color: theme.darkGreen,
    },
    hint: {
      marginTop: 4,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      lineHeight: fontSize.size12 * 1.45,
    },
    rawRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rawKey: {
      width: "38%",
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
    },
    rawValue: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    form: { marginTop: moderateHeightScale(12), gap: moderateHeightScale(10) },
    gapTop: { marginTop: moderateHeightScale(10) },
    clear: { alignSelf: "flex-start" },
    clearText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.selectCard,
    },
  });
