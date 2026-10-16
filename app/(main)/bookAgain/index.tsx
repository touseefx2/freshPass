import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FlowHeader from "@/src/components/reelFlow/flowHeader";
import FlowFooter from "@/src/components/reelFlow/flowFooter";
import FlowButton from "@/src/components/reelFlow/flowButton";
import {
  FlowCard,
  FlowTitle,
  InfoNote,
  SectionLabel,
} from "@/src/components/reelFlow/flowParts";
import {
  PersonRow,
  RowDivider,
  formatVisitMoney,
} from "@/src/components/afterVisit/afterVisitParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  fetchBookAgain,
  getApiErrorMessage,
} from "@/src/services/afterVisitService";
import { formatTipRecipientName } from "@/src/services/tipService";
import type { BookAgainData, BookAgainService } from "@/src/types/afterVisit";

/**
 * Book Again: shows what will be prefilled (same shop, pro and services at
 * today's prices), then opens the normal booking flow to pick a new time.
 * Nothing is booked here.
 */

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(24),
      gap: moderateHeightScale(16),
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(28),
      gap: moderateHeightScale(20),
    },
    card: {
      padding: moderateWidthScale(18),
      gap: moderateHeightScale(12),
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    serviceText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    serviceName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    serviceNameOff: { color: theme.lightGreen5 },
    serviceMeta: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    serviceMetaWarn: { color: theme.orangeBrownText },
    priceCol: { alignItems: "flex-end", gap: moderateHeightScale(2) },
    price: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    oldPrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      textDecorationLine: "line-through",
      fontVariant: ["tabular-nums"],
    },
    actions: { gap: moderateHeightScale(12), alignSelf: "stretch" },
  });

function formatDuration(
  duration: BookAgainService["duration"],
): string | null {
  if (!duration) return null;
  const { hours = 0, minutes = 0 } = duration;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return null;
}

export default function BookAgainScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showBanner } = useNotificationContext();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [data, setData] = useState<BookAgainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setLoadError(t("baLoadError"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setData(await fetchBookAgain(appointmentId));
    } catch (error) {
      setLoadError(getApiErrorMessage(error, t("baLoadError")));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/dashboard/(home)" as any);
  };

  const availableServices = (data?.services ?? []).filter((s) => s.available);
  const staffAvailable = !!data?.staff && data.staff.available;
  const isMembership = data?.subscriptionId != null;

  /** The booking flow needs the whole membership row to book a plan visit. */
  const findMembership = async (subscriptionId: number) => {
    const response = await ApiService.get<{
      success: boolean;
      data?: { data?: Array<{ id: number } & Record<string, unknown>> };
    }>(`${businessEndpoints.subscriptions(undefined, "user")}&page=1&per_page=100`);
    const rows = response?.data?.data ?? [];
    return rows.find((row) => Number(row.id) === subscriptionId) ?? null;
  };

  const openBooking = async () => {
    if (!data || opening) return;
    const params: Record<string, string> = {
      business_id: String(data.business.id),
      staff_id: staffAvailable && data.staff ? String(data.staff.id) : "anyone",
    };
    if (data.subscriptionId != null) {
      setOpening(true);
      try {
        const membership = await findMembership(data.subscriptionId);
        if (!membership) {
          showBanner(t("bookAgain"), t("baMembershipUnavailable"), "error", 4000);
          return;
        }
        params.subscription_id = String(data.subscriptionId);
        params.item = JSON.stringify(membership);
      } catch (error) {
        showBanner(
          t("bookAgain"),
          getApiErrorMessage(error, t("baLoadError")),
          "error",
          4000,
        );
        return;
      } finally {
        setOpening(false);
      }
    } else if (availableServices.length > 0) {
      params.service_ids = JSON.stringify(availableServices.map((s) => s.id));
    }
    router.push({ pathname: "/(main)/bookingNow", params });
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.darkGreen} />
      </View>
    );
  } else if (loadError || !data) {
    body = (
      <View style={styles.centered}>
        <InfoNote
          tone="error"
          icon="error-outline"
          text={loadError || t("baLoadError")}
          style={{ alignSelf: "stretch" }}
        />
        <View style={styles.actions}>
          <FlowButton label={t("retry")} onPress={() => void load()} />
        </View>
      </View>
    );
  } else {
    const priceChanged = data.services.some(
      (s) =>
        s.available &&
        s.previousPrice != null &&
        Math.abs(s.previousPrice - s.price) >= 0.01,
    );
    body = (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FlowTitle
            title={t("baTitle")}
            subtitle={data.canBookAgain ? t("baSubtitle") : null}
          />

          {!data.canBookAgain ? (
            <InfoNote
              tone="error"
              icon="event-busy"
              text={data.message || t("baCantBook")}
            />
          ) : data.message ? (
            <InfoNote tone="warm" text={data.message} />
          ) : null}

          <FlowCard style={styles.card}>
            <PersonRow
              name={data.business.title}
              subtitle={t("baShop")}
              image={data.business.logoUrl}
            />
            {data.staff ? (
              <>
                <RowDivider />
                <PersonRow
                  name={formatTipRecipientName(data.staff.name) || data.staff.name}
                  subtitle={
                    data.staff.available
                      ? t("baSamePro")
                      : t("baProUnavailable")
                  }
                  image={data.staff.image}
                />
              </>
            ) : null}
          </FlowCard>

          {data.services.length > 0 ? (
            <View style={{ gap: moderateHeightScale(10) }}>
              <SectionLabel
                label={isMembership ? t("baPlanServices") : t("baServices")}
              />
              <FlowCard style={styles.card}>
                {data.services.map((service, index) => {
                  const changed =
                    service.previousPrice != null &&
                    Math.abs(service.previousPrice - service.price) >= 0.01;
                  const duration = formatDuration(service.duration);
                  return (
                    <React.Fragment key={service.id}>
                      {index > 0 ? <RowDivider /> : null}
                      <View style={styles.serviceRow}>
                        <View style={styles.serviceText}>
                          <Text
                            style={[
                              styles.serviceName,
                              !service.available && styles.serviceNameOff,
                            ]}
                          >
                            {service.name}
                          </Text>
                          {!service.available ? (
                            <Text
                              style={[styles.serviceMeta, styles.serviceMetaWarn]}
                            >
                              {t("baServiceUnavailable")}
                            </Text>
                          ) : duration ? (
                            <Text style={styles.serviceMeta}>{duration}</Text>
                          ) : null}
                        </View>
                        {service.available && !isMembership ? (
                          <View style={styles.priceCol}>
                            <Text style={styles.price}>
                              {formatVisitMoney(service.price)}
                            </Text>
                            {changed ? (
                              <Text
                                style={styles.oldPrice}
                                accessibilityLabel={t("baWasPrice", {
                                  amount: formatVisitMoney(service.previousPrice),
                                })}
                              >
                                {formatVisitMoney(service.previousPrice)}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </React.Fragment>
                  );
                })}
              </FlowCard>
              {priceChanged && !isMembership ? (
                <InfoNote icon="sell" text={t("baPriceChanged")} />
              ) : null}
            </View>
          ) : null}

          {data.canBookAgain && !isMembership && availableServices.length === 0 ? (
            <InfoNote tone="warm" text={t("baNoServicesLeft")} />
          ) : null}
        </ScrollView>
        <FlowFooter
          primary={
            data.canBookAgain
              ? {
                  label: t("baChooseTime"),
                  onPress: openBooking,
                  loading: opening,
                  icon: "event",
                }
              : { label: t("done"), onPress: leave }
          }
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <FlowHeader title={t("bookAgain")} onBack={leave} />
      {body}
    </View>
  );
}
