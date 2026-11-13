import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import EmptyState from "@/src/components/emptyState";
import RetryButton from "@/src/components/retryButton";
import BusinessCustomerAvatar from "@/src/components/businessCustomerAvatar";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import {
  EditorFieldError,
  EditorPickerBox,
  EditorTextInput,
} from "@/src/components/masterClasses/editorFields";
import PastDateSheet from "@/src/components/businessCustomers/PastDateSheet";
import {
  emailStatusInfo,
  formatCustomerDate,
  lastVisitLine,
  sourceLabel,
} from "@/src/components/businessCustomers/customerDisplay";
import {
  customerErrorText,
  customerFieldErrors,
  getBusinessCustomerRecord,
  isForbiddenError,
  updateBusinessCustomerRecord,
} from "@/src/services/businessCustomerService";
import type {
  BusinessCustomerDetail,
  BusinessCustomerUpdate,
} from "@/src/types/businessCustomer";

type Panel = null | "edit" | "subscribe";

export default function CustomerRecordScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<BusinessCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [panel, setPanel] = useState<Panel>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Edit (imported customers only)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Subscribe (record permission)
  const [consentOn, setConsentOn] = useState<string | null>(null);
  const [consentSource, setConsentSource] = useState("");
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);

  const [datePick, setDatePick] = useState<null | "visit" | "consent">(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const data = await getBusinessCustomerRecord(id);
        setCustomer(data);
        setForbidden(false);
      } catch (err: any) {
        if (isForbiddenError(err)) setForbidden(true);
        else setError(customerErrorText(err, t("bcuLoadError")));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  const canEditContact = !!customer && !customer.hasAccount && customer.userId == null;

  const openEdit = () => {
    if (!customer) return;
    setFirstName(customer.firstName ?? "");
    setLastName(customer.lastName ?? "");
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setFieldErrors({});
    setFormError(null);
    setPanel("edit");
  };

  const openSubscribe = () => {
    setConsentOn(null);
    setConsentSource("");
    setPermissionConfirmed(false);
    setFieldErrors({});
    setFormError(null);
    setPanel("subscribe");
  };

  const save = async (key: string, body: BusinessCustomerUpdate, done?: string) => {
    if (!id) return;
    setSaving(key);
    setFieldErrors({});
    setFormError(null);
    try {
      const updated = await updateBusinessCustomerRecord(id, body);
      // A PATCH answer may leave out the lists; keep what we had then.
      setCustomer((prev) => ({
        ...updated,
        visits: updated.visits.length ? updated.visits : (prev?.visits ?? []),
        emailHistory: updated.emailHistory.length
          ? updated.emailHistory
          : (prev?.emailHistory ?? []),
        upcomingAppointment:
          updated.upcomingAppointment ?? prev?.upcomingAppointment ?? null,
      }));
      setPanel(null);
      if (done) setNotice(done);
      load(true);
    } catch (err: any) {
      const fields = customerFieldErrors(err);
      setFieldErrors(fields);
      if (!Object.keys(fields).length) setFormError(customerErrorText(err, t("bcuSaveError")));
      else if (fields.email_status) setFormError(fields.email_status);
    } finally {
      setSaving(null);
    }
  };

  const saveContact = () => {
    if (!customer) return;
    const body: BusinessCustomerUpdate = {};
    if (firstName.trim() !== (customer.firstName ?? "")) body.first_name = firstName.trim();
    if (lastName.trim() !== (customer.lastName ?? "")) body.last_name = lastName.trim();
    if (email.trim() !== (customer.email ?? "")) body.email = email.trim();
    if (phone.trim() !== (customer.phone ?? "")) body.phone = phone.trim();
    if (!Object.keys(body).length) {
      setPanel(null);
      return;
    }
    save("contact", body, t("bcuSaved"));
  };

  const saveSubscribe = () => {
    const errs: Record<string, string> = {};
    if (!consentOn) errs.email_consent_on = t("bcuConsentDateRequired");
    if (!consentSource.trim()) errs.email_consent_source = t("bcuConsentSourceRequired");
    if (!permissionConfirmed) errs.permission_confirmed = t("bcuPermissionRequired");
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    save(
      "subscribe",
      {
        email_status: "subscribed",
        email_consent_on: consentOn!,
        email_consent_source: consentSource.trim(),
        permission_confirmed: true,
      },
      t("bcuSubscribedDone"),
    );
  };

  const confirmUnsubscribe = () => {
    Alert.alert(t("bcuUnsubscribeTitle"), t("bcuUnsubscribeText"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("bcuUnsubscribe"),
        style: "destructive",
        onPress: () =>
          save("unsubscribe", { email_status: "unsubscribed" }, t("bcuUnsubscribedDone")),
      },
    ]);
  };

  const header = (
    <StackHeader
      title={t("bcuRecordTitle")}
      rightIcon={
        canEditContact && panel !== "edit" ? (
          <MaterialIcons name="edit" size={22} color={theme.white} />
        ) : undefined
      }
      onRightPress={canEditContact && panel !== "edit" ? openEdit : undefined}
      rightAccessibilityLabel={t("bcuEditContact")}
    />
  );

  if (loading && !customer) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <StatusBar barStyle="light-content" />
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.darkGreen} />
        </View>
      </SafeAreaView>
    );
  }

  if (forbidden || (!customer && error)) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <StatusBar barStyle="light-content" />
        {header}
        {forbidden ? (
          <EmptyState
            icon="lock-outline"
            title={t("bcuOwnerOnlyTitle")}
            subtitle={t("bcuOwnerOnlyText")}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <RetryButton onPress={() => load()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (!customer) return null;

  const emailInfo = emailStatusInfo(t, theme, customer);
  const suppressed = !!customer.suppression;
  const sources = customer.sources.length
    ? customer.sources
    : customer.source
      ? [customer.source]
      : [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" />
      {header}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        bottomOffset={moderateHeightScale(32)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {notice ? (
          <InfoNote icon="check-circle" text={notice} style={styles.gap} />
        ) : null}

        {/* Identity */}
        <View style={styles.card}>
          <View style={styles.identity}>
            <BusinessCustomerAvatar
              name={customer.name}
              profileImageUrl={customer.profileImageUrl}
              size={moderateWidthScale(56)}
              style={{ marginRight: moderateWidthScale(14) }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{customer.name || t("bcuUnnamed")}</Text>
              <View style={styles.pills}>
                {sources.map((s) => (
                  <View key={String(s)} style={styles.pill}>
                    <Text style={styles.pillText}>{sourceLabel(t, s)}</Text>
                  </View>
                ))}
                {customer.hasAccount ? (
                  <View style={[styles.pill, styles.pillGreen]}>
                    <Text style={[styles.pillText, { color: theme.successGreen }]}>
                      {t("bcuHasAccount")}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {panel === "edit" ? (
            <View style={styles.form}>
              <EditorTextInput
                label={t("bcuFirstName")}
                value={firstName}
                onChangeText={setFirstName}
                error={fieldErrors.first_name}
                autoCapitalize="words"
              />
              <EditorTextInput
                label={t("bcuLastName")}
                value={lastName}
                onChangeText={setLastName}
                error={fieldErrors.last_name}
                autoCapitalize="words"
              />
              <EditorTextInput
                label={t("bcuEmail")}
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <EditorTextInput
                label={t("bcuPhone")}
                value={phone}
                onChangeText={setPhone}
                error={fieldErrors.phone}
                keyboardType="phone-pad"
              />
              {formError ? <EditorFieldError message={formError} /> : null}
              <View style={styles.formButtons}>
                <FlowButton
                  label={t("cancel")}
                  variant="outline"
                  compact
                  style={{ flex: 1 }}
                  onPress={() => setPanel(null)}
                  disabled={saving === "contact"}
                />
                <FlowButton
                  label={t("bcuSave")}
                  compact
                  style={{ flex: 1.4 }}
                  onPress={saveContact}
                  loading={saving === "contact"}
                />
              </View>
            </View>
          ) : (
            <View style={styles.contact}>
              <InfoLine
                styles={styles}
                theme={theme}
                icon="mail-outline"
                text={customer.email || t("bcuNoEmail")}
                muted={!customer.email}
              />
              <InfoLine
                styles={styles}
                theme={theme}
                icon="call-outline"
                text={customer.phone || t("bcuNoPhone")}
                muted={!customer.phone}
              />
              {!canEditContact ? (
                <Text style={styles.hint}>{t("bcuManagedByCustomer")}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Visits summary */}
        <Text style={styles.section}>{t("bcuVisitsSection")}</Text>
        <View style={styles.card}>
          <InfoLine
            styles={styles}
            theme={theme}
            icon="time-outline"
            text={lastVisitLine(t, customer)}
            muted={!customer.lastVisitOn}
          />
          {customer.lastVisitOn && customer.lastVisitSource ? (
            <Text style={styles.hint}>
              {t("bcuLastVisitVia", { source: sourceLabel(t, customer.lastVisitSource) })}
            </Text>
          ) : null}
          {customer.upcomingAppointment || customer.nextAppointmentOn ? (
            <View style={styles.upcoming}>
              <Ionicons name="calendar" size={16} color={theme.selectCard} />
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingTitle}>
                  {t("bcuUpcomingOn", {
                    date: formatCustomerDate(
                      customer.upcomingAppointment?.date ?? customer.nextAppointmentOn,
                    ),
                  })}
                  {customer.upcomingAppointment?.time
                    ? ` · ${customer.upcomingAppointment.time}`
                    : ""}
                </Text>
                {customer.upcomingAppointment &&
                (customer.upcomingAppointment.services.length ||
                  customer.upcomingAppointment.staffName) ? (
                  <Text style={styles.hint}>
                    {[
                      customer.upcomingAppointment.services.join(", "),
                      customer.upcomingAppointment.staffName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {customer.history === "unknown" ? (
            <View style={styles.resolve}>
              <Text style={styles.resolveTitle}>{t("bcuResolveTitle")}</Text>
              <Text style={styles.hint}>{t("bcuResolveText")}</Text>
              {fieldErrors.history || fieldErrors.last_visit_on ? (
                <EditorFieldError
                  message={fieldErrors.history || fieldErrors.last_visit_on}
                />
              ) : null}
              <View style={styles.formButtons}>
                <FlowButton
                  label={t("bcuResolveNo")}
                  variant="outline"
                  compact
                  style={{ flex: 1 }}
                  loading={saving === "history_no"}
                  disabled={!!saving}
                  onPress={() => save("history_no", { history: "no" }, t("bcuSaved"))}
                />
                <FlowButton
                  label={t("bcuResolveYes")}
                  compact
                  style={{ flex: 1.2 }}
                  loading={saving === "history_yes"}
                  disabled={!!saving}
                  onPress={() => setDatePick("visit")}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Offer emails */}
        <Text style={styles.section}>{t("bcuEmailSection")}</Text>
        <View style={styles.card}>
          <View style={styles.emailRow}>
            <View style={[styles.dot, { backgroundColor: emailInfo.color }]} />
            <Text style={styles.emailLabel}>{emailInfo.label}</Text>
          </View>
          <Text style={styles.hint}>
            {customer.canReceiveOffers ? t("bcuCanReceive") : t("bcuCannotReceive")}
          </Text>

          {panel === "subscribe" ? (
            <View style={styles.form}>
              <EditorPickerBox
                label={t("bcuConsentDate")}
                required
                icon="calendar-outline"
                value={consentOn ? formatCustomerDate(consentOn) : null}
                placeholder={t("bcuPickDate")}
                onPress={() => setDatePick("consent")}
                error={fieldErrors.email_consent_on}
              />
              <EditorTextInput
                label={t("bcuConsentSource")}
                required
                value={consentSource}
                onChangeText={setConsentSource}
                placeholder={t("bcuConsentSourcePlaceholder")}
                error={fieldErrors.email_consent_source}
              />
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
                <Text style={styles.checkText}>{t("bcuPermissionConfirm")}</Text>
              </TouchableOpacity>
              {fieldErrors.permission_confirmed ? (
                <EditorFieldError message={fieldErrors.permission_confirmed} />
              ) : null}
              {formError ? <EditorFieldError message={formError} /> : null}
              <View style={styles.formButtons}>
                <FlowButton
                  label={t("cancel")}
                  variant="outline"
                  compact
                  style={{ flex: 1 }}
                  onPress={() => setPanel(null)}
                  disabled={saving === "subscribe"}
                />
                <FlowButton
                  label={t("bcuSave")}
                  compact
                  style={{ flex: 1.4 }}
                  onPress={saveSubscribe}
                  loading={saving === "subscribe"}
                />
              </View>
            </View>
          ) : (
            <View style={styles.emailActions}>
              {customer.emailStatus === "subscribed" ? (
                <FlowButton
                  label={t("bcuUnsubscribe")}
                  variant="outline"
                  compact
                  danger
                  loading={saving === "unsubscribe"}
                  onPress={confirmUnsubscribe}
                />
              ) : customer.email && !suppressed ? (
                <FlowButton
                  label={t("bcuRecordPermission")}
                  variant="outline"
                  compact
                  icon="mark-email-read"
                  onPress={openSubscribe}
                />
              ) : null}
              {panel === null && formError ? <EditorFieldError message={formError} /> : null}
            </View>
          )}

          {customer.emailHistory.length ? (
            <View style={styles.historyList}>
              {customer.emailHistory.map((h, i) => (
                <View key={`h${i}`} style={styles.historyRow}>
                  <View style={styles.historyDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>
                      {[h.status ? emailWord(t, h.status) : null, h.date ? formatCustomerDate(h.date) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {h.source || h.note ? (
                      <Text style={styles.hint}>
                        {[h.source, h.note].filter(Boolean).join(" — ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Visit list */}
        {customer.visits.length ? (
          <>
            <Text style={styles.section}>
              {t("bcuVisitList", { count: customer.visits.length })}
            </Text>
            <View style={styles.card}>
              {customer.visits.map((v, i) => (
                <View
                  key={`v${v.id ?? i}`}
                  style={[styles.visitRow, i > 0 && styles.visitDivider]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitDate}>
                      {[formatCustomerDate(v.date), v.time].filter(Boolean).join(" · ")}
                    </Text>
                    {v.services.length ? (
                      <Text style={styles.visitText} numberOfLines={2}>
                        {v.services.join(", ")}
                      </Text>
                    ) : null}
                    <Text style={styles.hint}>
                      {[v.staffName, sourceLabel(t, v.source), v.status ? humanize(v.status) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {!v.countsAsVisit ? (
                      <Text style={styles.notCounted}>{t("bcuNotCounted")}</Text>
                    ) : null}
                  </View>
                  {v.amount != null ? (
                    <Text style={styles.amount}>${v.amount.toFixed(2)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {customer.userId != null ? (
          <TouchableOpacity
            style={[styles.card, styles.linkRow]}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/(main)/businessCustomerDetail",
                params: { id: String(customer.userId) },
              } as any)
            }
            accessibilityRole="button"
          >
            <Ionicons name="card-outline" size={20} color={theme.darkGreen} />
            <Text style={styles.linkText}>{t("bcuMembershipsPurchases")}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.lightGreen} />
          </TouchableOpacity>
        ) : null}
      </KeyboardAwareScrollView>

      <PastDateSheet
        visible={datePick != null}
        title={datePick === "consent" ? t("bcuConsentDate") : t("bcuLastVisitDate")}
        value={datePick === "consent" ? consentOn : null}
        onClose={() => setDatePick(null)}
        onConfirm={(date) => {
          const which = datePick;
          setDatePick(null);
          if (which === "consent") setConsentOn(date);
          else save("history_yes", { history: "yes", last_visit_on: date }, t("bcuSaved"));
        }}
      />
    </SafeAreaView>
  );
}

function humanize(value: string) {
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function emailWord(t: (k: string) => string, status: string) {
  if (status === "subscribed") return t("bcuEmailSubscribedShort");
  if (status === "unsubscribed") return t("bcuEmailUnsubscribed");
  if (status === "unknown") return t("bcuEmailUnknownShort");
  return humanize(status);
}

function InfoLine({
  styles,
  theme,
  icon,
  text,
  muted,
}: {
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={17} color={theme.lightGreen} />
      <Text style={[styles.infoText, muted && { color: theme.lightGreen }]} selectable>
        {text}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    errorText: {
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    scroll: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(40),
    },
    gap: { marginBottom: moderateHeightScale(12) },
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderLight,
      padding: moderateWidthScale(16),
      marginBottom: moderateHeightScale(12),
    },
    identity: { flexDirection: "row", alignItems: "center" },
    name: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size18,
      color: theme.darkGreen,
    },
    pills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(6),
    },
    pill: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.lightGreen1,
    },
    pillGreen: { backgroundColor: theme.mintTint },
    pillText: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size11,
      color: theme.darkGreen,
    },
    contact: { marginTop: moderateHeightScale(14), gap: moderateHeightScale(8) },
    infoLine: { flexDirection: "row", alignItems: "center", gap: moderateWidthScale(10) },
    infoText: {
      flex: 1,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    hint: {
      marginTop: moderateHeightScale(4),
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size12,
      color: theme.lightGreen,
      lineHeight: fontSize.size12 * 1.45,
    },
    section: {
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(8),
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size15,
      color: theme.darkGreen,
    },
    upcoming: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(12),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.noticeCream,
    },
    upcomingTitle: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    resolve: {
      marginTop: moderateHeightScale(14),
      padding: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.goldBorder,
      backgroundColor: theme.noticeCream,
    },
    resolveTitle: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    form: { marginTop: moderateHeightScale(14), gap: moderateHeightScale(10) },
    formButtons: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      marginTop: moderateHeightScale(12),
    },
    emailRow: { flexDirection: "row", alignItems: "center", gap: moderateWidthScale(8) },
    emailLabel: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    emailActions: { marginTop: moderateHeightScale(12), gap: moderateHeightScale(8) },
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
    historyList: {
      marginTop: moderateHeightScale(14),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: moderateHeightScale(10),
      gap: moderateHeightScale(10),
    },
    historyRow: { flexDirection: "row", gap: moderateWidthScale(10) },
    historyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      backgroundColor: theme.lightGreen2,
    },
    historyTitle: {
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size13,
      color: theme.darkGreen,
    },
    visitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(10),
    },
    visitDivider: { borderTopWidth: 1, borderTopColor: theme.borderLight },
    visitDate: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    visitText: {
      marginTop: 2,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size13,
      color: theme.textMuted,
    },
    notCounted: {
      marginTop: 4,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size11,
      color: theme.accentAmber,
    },
    amount: {
      fontFamily: fonts.fontBold,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: moderateHeightScale(56),
    },
    linkText: {
      flex: 1,
      fontFamily: fonts.fontMedium,
      fontSize: fontSize.size14,
      color: theme.darkGreen,
    },
  });
