import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import {
  fetchMyRecommendations,
  type GivesBackRecommendation,
  type GivesBackStatus,
} from "@/src/services/givesBackService";

/** Customer / owner's own Gives Back recommendations, newest first. */

// pending gray · contacted blue · supported green · rejected red (guide)
const STATUS_STYLE: Record<
  GivesBackStatus,
  { bg: string; fg: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }
> = {
  pending: { bg: "#ECECEA", fg: "#4A4A48", icon: "schedule" },
  contacted: { bg: "#E3EEFB", fg: "#1D5FA8", icon: "call" },
  supported: { bg: "#E4F1DF", fg: "#2F7A34", icon: "volunteer-activism" },
  rejected: { bg: "#FBE6E4", fg: "#B3261E", icon: "block" },
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    list: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(12),
      flexGrow: 1,
    },
    card: {
      padding: moderateWidthScale(16),
      borderRadius: moderateWidthScale(16),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      backgroundColor: theme.white,
      gap: moderateHeightScale(10),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    titleCol: { flex: 1, minWidth: 0, gap: moderateHeightScale(2) },
    name: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    date: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(4),
      borderRadius: 999,
    },
    badgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    details: {
      gap: moderateHeightScale(8),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    label: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    value: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.45,
    },
    doc: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(36),
    },
    docName: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyIcon: {
      width: widthScale(80),
      height: widthScale(80),
      borderRadius: widthScale(40),
      backgroundColor: theme.tileMint,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function MyRecommendationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [items, setItems] = useState<GivesBackRecommendation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const pageRef = useRef(1);
  const lastPageRef = useRef(1);

  const load = useCallback(async (page: number) => {
    const result = await fetchMyRecommendations(page);
    pageRef.current = page;
    lastPageRef.current = result.lastPage;
    setItems((prev) =>
      page === 1 ? result.items : [...(prev ?? []), ...result.items],
    );
  }, []);

  const loadFirst = useCallback(async () => {
    setFailed(false);
    try {
      await load(1);
    } catch {
      setFailed(true);
    }
  }, [load]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const refresh = async () => {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || pageRef.current >= lastPageRef.current) return;
    setLoadingMore(true);
    try {
      await load(pageRef.current + 1);
    } catch {
      // Stays on the loaded pages; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  };

  const statusLabel = (status: GivesBackStatus) =>
    t(`givesBackStatus_${status}`, { defaultValue: status });

  const renderItem = ({ item }: { item: GivesBackRecommendation }) => {
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
    const open = openId === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => setOpenId(open ? null : item.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.row}>
          <View style={styles.titleCol}>
            <Text style={styles.name} numberOfLines={open ? undefined : 1}>
              {item.family_name}
            </Text>
            <Text style={styles.date}>
              {dayjs(item.created_at).format("MMM D, YYYY")}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <MaterialIcons
              name={status.icon}
              size={moderateWidthScale(14)}
              color={status.fg}
            />
            <Text style={[styles.badgeText, { color: status.fg }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
          <MaterialIcons
            name={open ? "expand-less" : "expand-more"}
            size={moderateWidthScale(24)}
            color={theme.darkGreen}
          />
        </View>

        {open ? (
          <View style={styles.details}>
            <View>
              <Text style={styles.label}>{t("givesBackDescription")}</Text>
              <Text style={styles.value}>{item.description}</Text>
            </View>
            <View>
              <Text style={styles.label}>{t("givesBackContactNumber")}</Text>
              <Text style={styles.value}>{item.contact_number}</Text>
            </View>
            {item.relationship ? (
              <View>
                <Text style={styles.label}>{t("givesBackRelationship")}</Text>
                <Text style={styles.value}>{item.relationship}</Text>
              </View>
            ) : null}
            {item.documents?.length ? (
              <View>
                <Text style={styles.label}>{t("givesBackProof")}</Text>
                {item.documents.map((doc) => (
                  <View key={doc.id} style={styles.doc}>
                    <MaterialIcons
                      name={
                        doc.mime_type === "application/pdf"
                          ? "picture-as-pdf"
                          : "image"
                      }
                      size={moderateWidthScale(20)}
                      color={theme.darkGreen}
                    />
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  let body: React.ReactNode;
  if (items == null && !failed) {
    body = (
      <View style={styles.empty}>
        <ActivityIndicator color={theme.darkGreen} />
      </View>
    );
  } else if (failed && !items?.length) {
    body = (
      <View style={styles.empty}>
        <InfoNote
          tone="error"
          icon="error-outline"
          text={t("givesBackListFailed")}
        />
        <FlowButton
          label={t("tryAgain")}
          variant="outline"
          icon="refresh"
          onPress={() => {
            setItems(null);
            void loadFirst();
          }}
        />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.darkGreen}
            colors={[theme.darkGreen]}
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={theme.darkGreen} /> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="volunteer-activism"
                size={moderateWidthScale(36)}
                color={theme.darkGreen}
              />
            </View>
            <Text style={styles.emptyTitle}>{t("givesBackEmptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("givesBackEmptyBody")}</Text>
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("givesBackMyRecommendations")}
        onBack={() => router.back()}
      />
      {body}
    </View>
  );
}
