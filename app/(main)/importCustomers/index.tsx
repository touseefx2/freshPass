import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { FlowTitle, InfoNote, SectionLabel } from "@/src/components/reelFlow/flowParts";
import {
  EditorFieldError,
  EditorPickerBox,
  EditorTextInput,
} from "@/src/components/masterClasses/editorFields";
import { EditorOptionSheet } from "@/src/components/masterClasses/editorSheets";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { formatCustomerDate } from "@/src/components/businessCustomers/customerDisplay";
import {
  importFieldLabel,
  rowActionLabel,
} from "@/src/components/importCustomers/importDisplay";
import {
  openImportRow,
  takeImportRowChanges,
} from "@/src/components/importCustomers/importFlowCache";
import {
  confirmCustomerImport,
  customerErrorText,
  downloadImportErrors,
  downloadImportTemplate,
  getCustomerImport,
  isForbiddenError,
  listCustomerImports,
  listImportRows,
  previewCustomerImport,
  setImportSheet,
  skipImportProblems,
  uploadCustomerImport,
} from "@/src/services/businessCustomerService";
import type {
  CustomerImport,
  ImportRow,
  ImportSummary,
} from "@/src/types/businessCustomer";

type Step = "upload" | "sheet" | "mapping" | "review" | "done";
type RowTab = "invalid" | "conflict" | "duplicate" | "valid";

const MAX_BYTES = 10 * 1024 * 1024;
const NONE = -1;

const isMapped = (m: Record<string, number | null>, key: string) =>
  m[key] != null && (m[key] as number) >= 0;

export default function ImportCustomersScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [imp, setImp] = useState<CustomerImport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Upload
  const [past, setPast] = useState<CustomerImport[] | null>(null);
  const [templateBusy, setTemplateBusy] = useState<"csv" | "xlsx" | null>(null);

  // Sheet
  const [sheet, setSheet] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState(1);

  // Mapping
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [pickField, setPickField] = useState<string | null>(null);
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [permissionNote, setPermissionNote] = useState("");

  // Review
  const [tab, setTab] = useState<RowTab>("invalid");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsMeta, setRowsMeta] = useState({ page: 1, last: 1 });
  const rowsRequestRef = useRef(0);

  const multiSheet = (imp?.sheets.length ?? 0) > 1;
  const flowSteps: Step[] = useMemo(
    () => ["upload", ...(multiSheet ? (["sheet"] as Step[]) : []), "mapping", "review"],
    [multiSheet],
  );

  // ── Past imports (resume) ─────────────────────────────────────────
  useEffect(() => {
    listCustomerImports()
      .then((list) => setPast(list.slice(0, 5)))
      .catch((err) => {
        if (isForbiddenError(err)) setForbidden(true);
        setPast([]);
      });
  }, []);

  const applyImport = useCallback((next: CustomerImport) => {
    setImp(next);
    setSheet(next.sheet ?? next.sheets[0] ?? null);
    setHeaderRow(next.headerRow ?? 1);
    const m: Record<string, number | null> = {};
    next.fields.forEach((f) => {
      m[f.key] = next.mapping[f.key] ?? null;
    });
    Object.entries(next.mapping).forEach(([k, v]) => {
      if (!(k in m)) m[k] = v;
    });
    setMapping(m);
  }, []);

  const resumeImport = async (item: CustomerImport) => {
    setBusy("resume");
    setStepError(null);
    try {
      const full = await getCustomerImport(item.id);
      applyImport(full);
      setStep(
        full.status === "completed"
          ? "done"
          : full.status === "previewed"
            ? "review"
            : "mapping",
      );
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuLoadError")));
    } finally {
      setBusy(null);
    }
  };

  // ── Upload ─────────────────────────────────────────────────────────
  const pickFile = async () => {
    setStepError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "text/plain",
          "application/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name = asset.name || "customers.csv";
      const lower = name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
        setStepError(t("bcuWrongFileType"));
        return;
      }
      if (asset.size != null && asset.size > MAX_BYTES) {
        setStepError(t("bcuFileTooBig"));
        return;
      }
      setBusy("upload");
      const uploaded = await uploadCustomerImport({
        uri: asset.uri,
        name,
        mimeType: asset.mimeType,
      });
      applyImport(uploaded);
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuUploadError")));
    } finally {
      setBusy(null);
    }
  };

  const getTemplate = async (format: "csv" | "xlsx") => {
    setTemplateBusy(format);
    setStepError(null);
    try {
      await downloadImportTemplate(format);
    } catch (err: any) {
      setStepError(
        err?.message === "share_unavailable"
          ? t("bcuShareUnavailable")
          : t("bcuDownloadError"),
      );
    } finally {
      setTemplateBusy(null);
    }
  };

  // ── Sheet ──────────────────────────────────────────────────────────
  const saveSheet = async () => {
    if (!imp) return;
    setBusy("sheet");
    setStepError(null);
    try {
      const next = await setImportSheet(imp.id, { sheet, header_row: headerRow });
      applyImport(next);
      setStep("mapping");
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuSaveError")));
    } finally {
      setBusy(null);
    }
  };

  // ── Mapping ────────────────────────────────────────────────────────
  const hasName =
    isMapped(mapping, "full_name") ||
    isMapped(mapping, "first_name") ||
    isMapped(mapping, "last_name");
  const hasContact = isMapped(mapping, "email") || isMapped(mapping, "phone");
  const marketingMapped = isMapped(mapping, "email_marketing_status");
  const permissionNoteMissing =
    marketingMapped && permissionConfirmed && !permissionNote.trim();
  const mappingReady = hasName && hasContact && !permissionNoteMissing;

  const runPreview = async () => {
    if (!imp) return;
    setBusy("preview");
    setStepError(null);
    try {
      const clean: Record<string, number | null> = {};
      Object.entries(mapping).forEach(([k, v]) => {
        clean[k] = v != null && v >= 0 ? v : null;
      });
      const confirmed = marketingMapped && permissionConfirmed;
      const next = await previewCustomerImport(imp.id, {
        mapping: clean,
        permission_confirmed: confirmed,
        permission_note: confirmed ? permissionNote.trim() || null : null,
      });
      applyImport(next);
      setStep("review");
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuPreviewError")));
    } finally {
      setBusy(null);
    }
  };

  // ── Review ─────────────────────────────────────────────────────────
  const summary: ImportSummary | null = imp?.summary ?? null;
  const tabCount = (k: RowTab) => (summary ? summary[k] : 0);

  const loadRows = useCallback(
    async (status: RowTab, page = 1) => {
      if (!imp) return;
      const req = ++rowsRequestRef.current;
      setRowsLoading(true);
      try {
        const { items, meta } = await listImportRows(imp.id, { status, page });
        if (req !== rowsRequestRef.current) return;
        setRows((prev) => (page > 1 ? [...prev, ...items] : items));
        setRowsMeta({ page: meta.current_page, last: meta.last_page });
      } catch (err: any) {
        if (req !== rowsRequestRef.current) return;
        if (page === 1) setRows([]);
        setStepError(customerErrorText(err, t("bcuLoadError")));
      } finally {
        if (req === rowsRequestRef.current) setRowsLoading(false);
      }
    },
    [imp, t],
  );

  // Pick the first tab that has rows when the review opens
  const reviewOpenedFor = useRef<number | null>(null);
  useEffect(() => {
    if (step !== "review" || !imp) return;
    if (reviewOpenedFor.current === imp.id) return;
    reviewOpenedFor.current = imp.id;
    const order: RowTab[] = ["invalid", "conflict", "duplicate", "valid"];
    const first = order.find((k) => (imp.summary[k] ?? 0) > 0) ?? "valid";
    setTab(first);
    loadRows(first, 1);
  }, [step, imp, loadRows]);

  // Back from the row screen: take its summary and reload the tab
  useFocusEffect(
    useCallback(() => {
      const { summary: s, changed } = takeImportRowChanges();
      if (s) setImp((prev) => (prev ? { ...prev, summary: s } : prev));
      if (changed && step === "review") loadRows(tab, 1);
    }, [step, tab, loadRows]),
  );

  const switchTab = (k: RowTab) => {
    setTab(k);
    setRows([]);
    loadRows(k, 1);
  };

  const skipProblems = async () => {
    if (!imp) return;
    setBusy("skip");
    setStepError(null);
    try {
      const next = await skipImportProblems(imp.id);
      // Keep the mapping/columns if the answer is a bare summary
      setImp((prev) =>
        prev
          ? { ...prev, ...next, columns: next.columns.length ? next.columns : prev.columns }
          : next,
      );
      loadRows(tab, 1);
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuSaveError")));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!imp) return;
    setBusy("confirm");
    setStepError(null);
    try {
      const done = await confirmCustomerImport(imp.id);
      setImp((prev) => (prev ? { ...prev, ...done, id: done.id || prev.id } : done));
      setStep("done");
    } catch (err: any) {
      setStepError(customerErrorText(err, t("bcuConfirmError")));
    } finally {
      setBusy(null);
    }
  };

  const openRow = (row: ImportRow) => {
    if (!imp) return;
    openImportRow(imp, row);
    router.push("/(main)/importCustomers/row" as any);
  };

  // ── Navigation ─────────────────────────────────────────────────────
  const stepIndex = flowSteps.indexOf(step);
  const goBack = () => {
    setStepError(null);
    if (step === "upload" || step === "done") {
      router.back();
      return;
    }
    if (step === "review") {
      reviewOpenedFor.current = null;
      setStep("mapping");
      return;
    }
    if (step === "mapping") {
      setStep(multiSheet ? "sheet" : "upload");
      return;
    }
    setStep("upload");
  };

  const goNext = () => {
    setStepError(null);
    if (step === "upload") setStep(multiSheet ? "sheet" : "mapping");
    else if (step === "sheet") saveSheet();
    else if (step === "mapping") runPreview();
    else if (step === "review") confirm();
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <FlowHeader title={t("bcuImportTitle")} onBack={() => router.back()} backIcon="close" />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.lightGreen} />
          <Text style={styles.centerTitle}>{t("bcuOwnerOnlyTitle")}</Text>
          <Text style={styles.centerText}>{t("bcuOwnerOnlyText")}</Text>
        </View>
      </View>
    );
  }

  if (step === "done" && imp) {
    const s = imp.summary;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <FlowHeader title={t("bcuImportTitle")} onBack={() => router.back()} backIcon="close" />
        <ScrollView contentContainerStyle={styles.doneScroll}>
          <View style={styles.halo}>
            <View style={styles.haloInner}>
              <MaterialIcons name="check" size={40} color={theme.white} />
            </View>
          </View>
          <Text style={styles.doneTitle}>{t("bcuDoneTitle")}</Text>
          <Text style={styles.doneText}>{t("bcuDoneText")}</Text>
          <View style={styles.tiles}>
            <Tile styles={styles} label={t("bcuCreated")} value={s.created} tone="green" />
            <Tile styles={styles} label={t("bcuUpdated")} value={s.updated} />
            <Tile styles={styles} label={t("bcuSkipped")} value={s.skipped} />
            <Tile styles={styles} label={t("bcuFailed")} value={s.failed} tone={s.failed ? "red" : undefined} />
          </View>
          {s.failed > 0 || s.invalid > 0 ? (
            <FlowButton
              label={t("bcuDownloadErrors")}
              variant="outline"
              icon="file-download"
              compact
              loading={busy === "errors"}
              style={styles.gapTop}
              onPress={async () => {
                setBusy("errors");
                setStepError(null);
                try {
                  await downloadImportErrors(imp.id);
                } catch (err: any) {
                  setStepError(
                    err?.message === "share_unavailable"
                      ? t("bcuShareUnavailable")
                      : t("bcuDownloadError"),
                  );
                } finally {
                  setBusy(null);
                }
              }}
            />
          ) : null}
          {stepError ? <EditorFieldError message={stepError} /> : null}
          <InfoNote text={t("bcuNeverSends")} style={styles.gapTop} />
        </ScrollView>
        <FlowFooter
          row
          secondary={{ label: t("goToHome"), onPress: resetToDashboardHome, icon: "home" }}
          primary={{
            label: t("bcuViewImported"),
            onPress: () =>
              router.replace({
                pathname: "/(main)/importCustomers/customers",
                params: { import_id: String(imp.id) },
              } as any),
            trailingIcon: "arrow-forward",
          }}
        />
      </View>
    );
  }

  const fieldOptions = imp
    ? [
        { value: NONE, label: t("bcuNotInFile") },
        ...imp.columns.map((c, i) => ({
          value: i,
          label: c?.trim() ? c : t("bcuColumnN", { n: i + 1 }),
        })),
      ]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlowHeader
        title={t("bcuImportTitle")}
        step={{ current: stepIndex + 1, total: flowSteps.length }}
        onBack={goBack}
        backDisabled={!!busy}
        backIcon={step === "upload" ? "close" : "back"}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        {step === "upload" ? (
          <>
            <FlowTitle title={t("bcuUploadTitle")} subtitle={t("bcuUploadSub")} />
            <TouchableOpacity
              style={styles.uploadCard}
              activeOpacity={0.8}
              onPress={pickFile}
              disabled={busy === "upload"}
              accessibilityRole="button"
              accessibilityLabel={t("bcuUploadCta")}
            >
              <View style={styles.uploadIcon}>
                {busy === "upload" ? (
                  <ActivityIndicator color={theme.darkGreen} />
                ) : (
                  <MaterialIcons name="upload-file" size={30} color={theme.darkGreen} />
                )}
              </View>
              <Text style={styles.uploadTitle}>
                {busy === "upload" ? t("bcuUploading") : t("bcuUploadCta")}
              </Text>
              <Text style={styles.uploadSub}>{t("bcuUploadLimits")}</Text>
            </TouchableOpacity>

            {imp ? (
              <View style={styles.fileCard}>
                <View style={styles.fileIcon}>
                  <MaterialIcons name="description" size={24} color={theme.successGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {imp.fileName ?? t("bcuYourFile")}
                  </Text>
                  {/* Rows are counted at the check step; right after upload totalRows is 0 */}
                  {imp.totalRows > 0 || imp.sheets.length > 1 ? (
                    <Text style={styles.fileMeta}>
                      {imp.totalRows > 0
                        ? t("bcuRowsFound", { count: imp.totalRows })
                        : ""}
                      {imp.totalRows > 0 && imp.sheets.length > 1 ? " · " : ""}
                      {imp.sheets.length > 1
                        ? t("bcuSheetsFound", { count: imp.sheets.length })
                        : ""}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={pickFile}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("bcuChangeFile")}
                >
                  <Text style={styles.linkText}>{t("bcuChangeFile")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <SectionLabel label={t("bcuTemplateLabel")} style={styles.gapTopLg} />
            <View style={styles.templateRow}>
              <FlowButton
                label={t("bcuTemplateCsv")}
                singleLine
                variant="outline"
                icon="file-download"
                compact
                style={{ flex: 1 }}
                loading={templateBusy === "csv"}
                onPress={() => getTemplate("csv")}
              />
              <FlowButton
                label={t("bcuTemplateXlsx")}
                singleLine
                variant="outline"
                icon="file-download"
                compact
                style={{ flex: 1 }}
                loading={templateBusy === "xlsx"}
                onPress={() => getTemplate("xlsx")}
              />
            </View>

            <View style={styles.reqCard}>
              <MaterialIcons name="checklist" size={20} color={theme.darkGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reqText}>
                  <Text style={styles.reqBold}>{t("bcuRequired")} </Text>
                  {t("bcuRequiredText")}
                </Text>
                <Text style={[styles.reqText, { marginTop: 4 }]}>
                  <Text style={styles.reqBold}>{t("bcuOptional")} </Text>
                  {t("bcuOptionalText")}
                </Text>
              </View>
            </View>

            <InfoNote text={t("bcuNeverSends")} />

            {past && past.length ? (
              <>
                <SectionLabel label={t("bcuPastImports")} />
                {past.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pastRow}
                    activeOpacity={0.8}
                    onPress={() => resumeImport(p)}
                    disabled={!!busy}
                  >
                    <MaterialIcons name="history" size={20} color={theme.lightGreen} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {p.fileName ?? t("bcuYourFile")}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {[p.createdAt ? formatCustomerDate(p.createdAt) : null, importStatusLabel(t, p.status)]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.lightGreen} />
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {step === "sheet" && imp ? (
          <>
            <FlowTitle title={t("bcuSheetTitle")} subtitle={t("bcuSheetSub")} />
            {imp.sheets.length > 1 ? (
              <>
                <SectionLabel label={t("bcuSheetLabel")} />
                {imp.sheets.map((name) => {
                  const on = sheet === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.option, on && styles.optionOn]}
                      activeOpacity={0.8}
                      onPress={() => setSheet(name)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                    >
                      <MaterialIcons
                        name={on ? "radio-button-checked" : "radio-button-unchecked"}
                        size={22}
                        color={theme.darkGreen}
                      />
                      <Text style={styles.optionText}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}
            <SectionLabel label={t("bcuHeaderRowLabel")} />
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setHeaderRow((n) => Math.max(1, n - 1))}
                accessibilityRole="button"
                accessibilityLabel={t("bcuHeaderRowDown")}
              >
                <MaterialIcons name="remove" size={22} color={theme.darkGreen} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{t("bcuRowN", { n: headerRow })}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setHeaderRow((n) => Math.min(50, n + 1))}
                accessibilityRole="button"
                accessibilityLabel={t("bcuHeaderRowUp")}
              >
                <MaterialIcons name="add" size={22} color={theme.darkGreen} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>{t("bcuHeaderRowHint")}</Text>
            {imp.columns.length ? (
              <>
                <SectionLabel label={t("bcuColumnsFound")} />
                <View style={styles.columnWrap}>
                  {imp.columns.map((c, i) => (
                    <View key={`c${i}`} style={styles.columnChip}>
                      <Text style={styles.columnText} numberOfLines={1}>
                        {c?.trim() ? c : t("bcuColumnN", { n: i + 1 })}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {step === "mapping" && imp ? (
          <>
            <FlowTitle title={t("bcuMapTitle")} subtitle={t("bcuMapSub")} />
            {imp.fields.map((f) => {
              const idx = mapping[f.key];
              const value =
                idx != null && idx >= 0
                  ? imp.columns[idx]?.trim() || t("bcuColumnN", { n: idx + 1 })
                  : t("bcuNotInFile");
              return (
                <View key={f.key} style={styles.mapRow}>
                  <EditorPickerBox
                    label={importFieldLabel(t, f.key, f.label)}
                    required={f.required}
                    icon={idx != null && idx >= 0 ? "checkmark-circle" : "remove-circle-outline"}
                    value={value}
                    placeholder={t("bcuNotInFile")}
                    onPress={() => setPickField(f.key)}
                  />
                </View>
              );
            })}
            {!hasName || !hasContact ? (
              <InfoNote tone="warm" icon="error-outline" text={t("bcuMapNeeds")} />
            ) : null}
            <TouchableOpacity
              onPress={() => setStep("sheet")}
              hitSlop={8}
              style={styles.inlineLink}
            >
              <Text style={styles.linkText}>{t("bcuWrongHeaderRow")}</Text>
            </TouchableOpacity>

            {marketingMapped ? (
              <View style={styles.permissionCard}>
                <Text style={styles.permissionTitle}>{t("bcuPermissionTitle")}</Text>
                <Text style={styles.hint}>{t("bcuPermissionText")}</Text>
                <TouchableOpacity
                  style={styles.checkRow}
                  activeOpacity={0.8}
                  onPress={() => setPermissionConfirmed((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: permissionConfirmed }}
                >
                  <MaterialIcons
                    name={permissionConfirmed ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={theme.darkGreen}
                  />
                  <Text style={styles.checkText}>{t("bcuPermissionImportConfirm")}</Text>
                </TouchableOpacity>
                {permissionConfirmed ? (
                  <EditorTextInput
                    label={t("bcuPermissionNote")}
                    required
                    value={permissionNote}
                    onChangeText={setPermissionNote}
                    placeholder={t("bcuPermissionNotePlaceholder")}
                    multiline
                    minLines={2}
                    error={permissionNoteMissing ? t("bcuPermissionNoteRequired") : null}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {step === "review" && imp && summary ? (
          <>
            <FlowTitle title={t("bcuReviewTitle")} subtitle={t("bcuReviewSub")} />
            <View style={styles.tiles}>
              <Tile styles={styles} label={t("bcuReady")} value={summary.valid} tone="green" />
              <Tile styles={styles} label={t("bcuDuplicates")} value={summary.duplicate} />
              <Tile
                styles={styles}
                label={t("bcuNeedFixing")}
                value={summary.invalid}
                tone={summary.invalid ? "red" : undefined}
              />
              <Tile
                styles={styles}
                label={t("bcuConflicts")}
                value={summary.conflict}
                tone={summary.conflict ? "amber" : undefined}
              />
            </View>
            {summary.needsDecision > 0 ? (
              <InfoNote
                tone="warm"
                icon="error-outline"
                text={t("bcuNeedsDecision", { count: summary.needsDecision })}
              />
            ) : (
              <InfoNote icon="check-circle" text={t("bcuAllReady")} />
            )}
            {summary.invalid + summary.conflict > 0 || summary.needsDecision > 0 ? (
              <FlowButton
                label={t("bcuSkipProblems")}
                variant="outline"
                compact
                icon="block"
                loading={busy === "skip"}
                disabled={!!busy && busy !== "skip"}
                style={styles.gapTop}
                onPress={skipProblems}
              />
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabs}
              keyboardShouldPersistTaps="handled"
            >
              {(["invalid", "conflict", "duplicate", "valid"] as RowTab[]).map((k) => {
                const on = tab === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.tab, on && styles.tabOn]}
                    activeOpacity={0.8}
                    onPress={() => switchTab(k)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>
                      {t(TAB_LABEL[k])} · {tabCount(k)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {rows.map((row) => (
              <RowCard key={row.id} row={row} styles={styles} theme={theme} t={t} onPress={() => openRow(row)} />
            ))}
            {rowsLoading ? (
              <ActivityIndicator color={theme.darkGreen} style={styles.gapTop} />
            ) : rows.length === 0 ? (
              <Text style={styles.emptyRows}>{t("bcuNoRowsHere")}</Text>
            ) : rowsMeta.page < rowsMeta.last ? (
              <FlowButton
                label={t("bcuLoadMore")}
                variant="text"
                compact
                onPress={() => loadRows(tab, rowsMeta.page + 1)}
              />
            ) : null}
            <InfoNote text={t("bcuNeverSends")} style={styles.gapTop} />
          </>
        ) : null}

        {stepError ? (
          <View style={styles.gapTop}>
            <EditorFieldError message={stepError} />
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      <FlowFooter
        row={step !== "upload"}
        secondary={
          step !== "upload"
            ? { label: t("back"), onPress: goBack, disabled: !!busy }
            : null
        }
        hint={
          step === "review" && summary && summary.needsDecision > 0
            ? t("bcuFixFirst", { count: summary.needsDecision })
            : step === "mapping" && !mappingReady
              ? t("bcuMapNeedsShort")
              : null
        }
        primary={{
          label:
            step === "review"
              ? t("bcuImportNow")
              : step === "mapping"
                ? t("bcuCheckRows")
                : t("next"),
          onPress: goNext,
          disabled:
            !!busy ||
            !imp ||
            (step === "mapping" && !mappingReady) ||
            (step === "review" && (!summary || summary.needsDecision > 0)),
          loading:
            busy === "sheet" || busy === "preview" || busy === "confirm" || busy === "resume",
          trailingIcon: step === "review" ? undefined : "arrow-forward",
          icon: step === "review" ? "group-add" : undefined,
        }}
      />

      <EditorOptionSheet<number>
        visible={pickField != null}
        title={pickField ? importFieldLabel(t, pickField) : ""}
        subtitle={t("bcuPickColumn")}
        options={fieldOptions}
        selected={pickField ? (mapping[pickField] ?? NONE) : NONE}
        onSelect={(value) => {
          if (pickField) {
            setMapping((m) => ({ ...m, [pickField]: value === NONE ? null : value }));
          }
          setPickField(null);
        }}
        onClose={() => setPickField(null)}
      />
    </View>
  );
}

const TAB_LABEL: Record<RowTab, string> = {
  invalid: "bcuNeedFixing",
  conflict: "bcuConflicts",
  duplicate: "bcuDuplicates",
  valid: "bcuReady",
};

function importStatusLabel(t: (k: string) => string, status: string) {
  if (status === "completed") return t("bcuStatusCompleted");
  if (status === "previewed") return t("bcuStatusPreviewed");
  return t("bcuStatusUploaded");
}

function Tile({
  styles,
  label,
  value,
  tone,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: number;
  tone?: "green" | "red" | "amber";
}) {
  return (
    <View style={styles.tile}>
      <Text
        style={[
          styles.tileValue,
          tone === "green" && styles.toneGreen,
          tone === "red" && styles.toneRed,
          tone === "amber" && styles.toneAmber,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function RowCard({
  row,
  styles,
  theme,
  t,
  onPress,
}: {
  row: ImportRow;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  t: (k: string, o?: any) => string;
  onPress: () => void;
}) {
  const d = row.data;
  const name =
    [d.first_name, d.last_name].filter(Boolean).join(" ") || d.full_name || d.name || null;
  const contact = [d.email, d.phone].filter(Boolean).join(" · ");
  const action = rowActionLabel(t, row.action);
  return (
    <TouchableOpacity
      style={styles.rowCard}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowNumber}>
            {row.rowNumber != null ? t("bcuRowN", { n: row.rowNumber }) : t("bcuRow")}
          </Text>
          {action ? <Text style={styles.rowAction}>{action}</Text> : null}
        </View>
        <Text style={styles.rowName} numberOfLines={1}>
          {name || t("bcuNoName")}
        </Text>
        {contact ? (
          <Text style={styles.rowContact} numberOfLines={1}>
            {contact}
          </Text>
        ) : null}
        {row.errors.slice(0, 2).map((e, i) => (
          <View key={`e${i}`} style={styles.msgRow}>
            <MaterialIcons name="error-outline" size={14} color={theme.red} />
            <Text style={[styles.msgText, { color: theme.red }]}>{e}</Text>
          </View>
        ))}
        {row.warnings.slice(0, 2).map((w, i) => (
          <View key={`w${i}`} style={styles.msgRow}>
            <MaterialIcons name="info-outline" size={14} color={theme.accentAmber} />
            <Text style={[styles.msgText, { color: theme.accentAmber }]}>{w}</Text>
          </View>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.lightGreen} />
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(8),
      paddingBottom: moderateHeightScale(32),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(32),
      gap: moderateHeightScale(8),
    },
    centerTitle: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size16,
      color: theme.darkGreen,
      textAlign: "center",
    },
    centerText: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.lightGreen,
      textAlign: "center",
    },
    gapTop: { marginTop: moderateHeightScale(12) },
    gapTopLg: { marginTop: moderateHeightScale(20) },
    hint: {
      marginTop: moderateHeightScale(6),
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      lineHeight: fontSize.size12 * 1.45,
    },
    uploadCard: {
      alignItems: "center",
      paddingVertical: moderateHeightScale(22),
      paddingHorizontal: moderateWidthScale(16),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    uploadIcon: {
      width: moderateWidthScale(60),
      height: moderateWidthScale(60),
      borderRadius: moderateWidthScale(30),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.lightGreen1,
      marginBottom: moderateHeightScale(10),
    },
    uploadTitle: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size16,
      color: theme.darkGreen,
    },
    uploadSub: {
      marginTop: 4,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      textAlign: "center",
    },
    fileCard: {
      marginTop: moderateHeightScale(12),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    fileIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.mintTint,
    },
    fileName: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    fileMeta: {
      marginTop: 2,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
    },
    linkText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.selectCard,
      textDecorationLine: "underline",
    },
    inlineLink: { alignSelf: "flex-start", marginTop: moderateHeightScale(10) },
    templateRow: { flexDirection: "row", gap: moderateWidthScale(10) },
    reqCard: {
      marginTop: moderateHeightScale(14),
      marginBottom: moderateHeightScale(12),
      flexDirection: "row",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    reqText: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.textMuted,
      lineHeight: fontSize.size13 * 1.45,
    },
    reqBold: { fontFamily: fonts.fontBold, color: theme.darkGreen },
    pastRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(8),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      minHeight: moderateHeightScale(52),
      paddingHorizontal: moderateWidthScale(14),
      marginBottom: moderateHeightScale(8),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.white,
    },
    optionOn: { borderColor: theme.darkGreen, borderWidth: 1.5 },
    optionText: {
      flex: 1,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(16),
      alignSelf: "flex-start",
    },
    stepperBtn: {
      width: moderateWidthScale(48),
      height: moderateWidthScale(48),
      borderRadius: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderNormal,
    },
    stepperValue: {
      minWidth: moderateWidthScale(70),
      textAlign: "center",
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size16,
      color: theme.darkGreen,
    },
    columnWrap: { flexDirection: "row", flexWrap: "wrap", gap: moderateWidthScale(6) },
    columnChip: {
      maxWidth: "100%",
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.lightGreen1,
    },
    columnText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size12,
      color: theme.darkGreen,
    },
    mapRow: { marginBottom: moderateHeightScale(10) },
    permissionCard: {
      marginTop: moderateHeightScale(16),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
      gap: moderateHeightScale(6),
    },
    permissionTitle: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
    },
    checkText: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
      lineHeight: fontSize.size13 * 1.45,
    },
    tiles: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(12),
    },
    tile: {
      flexGrow: 1,
      flexBasis: "45%",
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tileValue: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size22,
      color: theme.darkGreen,
    },
    tileLabel: {
      marginTop: 2,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
    },
    toneGreen: { color: theme.successGreen },
    toneRed: { color: theme.red },
    toneAmber: { color: theme.accentAmber },
    tabs: {
      flexDirection: "row",
      gap: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(14),
    },
    tab: {
      minHeight: moderateHeightScale(38),
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(14),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
    },
    tabOn: { backgroundColor: theme.darkGreen, borderColor: theme.darkGreen },
    tabText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    tabTextOn: { color: theme.white },
    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
      padding: moderateWidthScale(14),
      marginBottom: moderateHeightScale(10),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    rowNumber: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size11,
      color: theme.lightGreen,
    },
    rowAction: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size11,
      color: theme.successGreen,
    },
    rowName: {
      marginTop: 2,
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    rowContact: {
      marginTop: 2,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.textMuted,
    },
    msgRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4 },
    msgText: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      lineHeight: fontSize.size12 * 1.4,
    },
    emptyRows: {
      textAlign: "center",
      marginVertical: moderateHeightScale(16),
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.lightGreen,
    },
    doneScroll: {
      alignItems: "stretch",
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(24),
      paddingBottom: moderateHeightScale(32),
    },
    halo: {
      alignSelf: "center",
      width: moderateWidthScale(96),
      height: moderateWidthScale(96),
      borderRadius: moderateWidthScale(48),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.mintTint,
    },
    haloInner: {
      width: moderateWidthScale(68),
      height: moderateWidthScale(68),
      borderRadius: moderateWidthScale(34),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.successGreen,
    },
    doneTitle: {
      marginTop: moderateHeightScale(16),
      textAlign: "center",
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size22,
      color: theme.darkGreen,
    },
    doneText: {
      marginTop: moderateHeightScale(6),
      marginBottom: moderateHeightScale(18),
      textAlign: "center",
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.lightGreen,
    },
  });
