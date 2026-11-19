import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
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
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import AppImage from "@/src/components/AppImage";
import FlowButton from "@/src/components/reelFlow/flowButton";
import { InfoNote } from "@/src/components/reelFlow/flowParts";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { resolveApiImageUrl } from "@/src/utils/media";
import { IMAGES } from "@/src/constant/images";
import { GIVES_BACK_COLORS } from "@/src/components/givesBack/GivesBackBanner";
import {
  fetchMyRecommendations,
  type GivesBackDocument,
  type GivesBackRecommendation,
  type GivesBackStatus,
} from "@/src/services/givesBackService";

/**
 * The user's own Gives Back recommendations, newest first. Tap a card for
 * the details; photos open full screen here, PDFs in the phone's viewer.
 */

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

// pending gray · contacted blue · supported green · rejected red (guide)
const STATUS_STYLE: Record<
  GivesBackStatus,
  { bg: string; fg: string; icon: IconName }
> = {
  pending: { bg: "#EEEDE8", fg: "#4A4A48", icon: "schedule" },
  contacted: { bg: "#E3EEFB", fg: "#1D5FA8", icon: "call" },
  supported: { bg: "#E4F1DF", fg: "#2F7A34", icon: "volunteer-activism" },
  rejected: { bg: "#FBE6E4", fg: "#B3261E", icon: "block" },
};

const C = GIVES_BACK_COLORS;

const isPdfDocument = (doc: GivesBackDocument) =>
  doc.mime_type === "application/pdf" || /\.pdf$/i.test(doc.name ?? "");

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    list: {
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(32),
      gap: moderateHeightScale(14),
      flexGrow: 1,
    },
    // ── Intro strip
    intro: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      borderRadius: moderateWidthScale(16),
      backgroundColor: C.header,
    },
    introIcon: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(37),
    },
    introText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: C.white,
      lineHeight: fontSize.size14 * 1.4,
    },
    introCount: { fontFamily: fonts.fontBold, color: C.tag },
    // ── Card
    card: {
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.white,
      padding: moderateWidthScale(16),
      shadowColor: "#1E2A10",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    avatar: {
      width: widthScale(46),
      height: widthScale(46),
      borderRadius: widthScale(23),
      backgroundColor: C.header,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: C.tag,
    },
    headText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
    name: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(4),
    },
    meta: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      marginHorizontal: moderateWidthScale(4),
      backgroundColor: theme.lightGreen,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
      borderRadius: 999,
    },
    badgeText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
    },
    preview: {
      marginTop: moderateHeightScale(12),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size14 * 1.45,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(4),
      marginTop: moderateHeightScale(12),
      paddingTop: moderateHeightScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderNormal,
    },
    toggleText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // ── Details
    details: {
      marginTop: moderateHeightScale(14),
      gap: moderateHeightScale(14),
    },
    sectionLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: moderateHeightScale(6),
    },
    description: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size15 * 1.5,
    },
    infoBox: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.tileMint,
      paddingHorizontal: moderateWidthScale(12),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(11),
    },
    infoDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    infoIcon: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    infoText: { flex: 1, minWidth: 0 },
    infoLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    infoValue: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    // ── Files grid
    files: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    tile: {
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.tileMint,
    },
    tileExpand: {
      position: "absolute",
      right: moderateWidthScale(6),
      bottom: moderateWidthScale(6),
      width: widthScale(24),
      height: widthScale(24),
      borderRadius: widthScale(12),
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    pdfTile: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.borderNormal,
      borderRadius: moderateWidthScale(12),
      backgroundColor: "#FFF4F2",
    },
    pdfBadge: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: "#B3261E",
    },
    pdfName: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textAlign: "center",
    },
    // ── Full-screen photo
    viewer: { flex: 1, backgroundColor: "#000" },
    viewerImage: { flex: 1 },
    viewerClose: {
      position: "absolute",
      right: moderateWidthScale(16),
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: widthScale(22),
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Empty / error
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(24),
    },
    emptyIcon: {
      width: widthScale(96),
      height: widthScale(96),
      borderRadius: widthScale(48),
      backgroundColor: C.header,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyImage: {
      width: widthScale(62),
      height: widthScale(52),
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
  const insets = useSafeAreaInsets();
  const { showBanner } = useNotificationContext();

  const [items, setItems] = useState<GivesBackRecommendation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  // Measured once: % width + aspectRatio collapses inside a wrapping row
  const [filesWidth, setFilesWidth] = useState(0);
  const FILE_GAP = moderateWidthScale(10);
  const tileSize = filesWidth > 0 ? Math.floor((filesWidth - FILE_GAP * 2) / 3) : 0;
  const pageRef = useRef(1);
  const lastPageRef = useRef(1);

  const load = useCallback(async (page: number) => {
    const result = await fetchMyRecommendations(page);
    pageRef.current = page;
    lastPageRef.current = result.lastPage;
    setItems((prev) => {
      const next = page === 1 ? result.items : [...(prev ?? []), ...result.items];
      setTotal(Math.max(result.total ?? 0, next.length));
      return next;
    });
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

  /** Photos open full screen here; PDFs in the phone's own viewer. */
  const openDocument = (url: string, isPdf: boolean) => {
    if (!isPdf) {
      setPreviewUrl(url);
      return;
    }
    Linking.openURL(url).catch(() =>
      showBanner(t("error"), t("givesBackOpenFileFailed"), "error"),
    );
  };

  const statusLabel = (status: GivesBackStatus) =>
    t(`givesBackStatus_${status}`, { defaultValue: status });

  const renderFile = (doc: GivesBackDocument, index: number) => {
    const url = resolveApiImageUrl(doc.path);
    const isPdf = isPdfDocument(doc);
    return (
      <TouchableOpacity
        key={doc.id ?? index}
        style={[styles.tile, { width: tileSize, height: tileSize }]}
        onPress={() => (url ? openDocument(url, isPdf) : undefined)}
        disabled={!url}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${t("givesBackOpenFile")} ${
          isPdf ? doc.name : `${t("reportPhoto")} ${index + 1}`
        }`}
      >
        {isPdf ? (
          <View style={styles.pdfTile}>
            <MaterialIcons
              name="picture-as-pdf"
              size={moderateWidthScale(30)}
              color="#B3261E"
            />
            <Text style={styles.pdfBadge}>PDF</Text>
            <Text style={styles.pdfName} numberOfLines={1}>
              {doc.name}
            </Text>
          </View>
        ) : (
          <>
            {url ? (
              <AppImage
                uri={url}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.tileExpand}>
              <MaterialIcons
                name="open-in-full"
                size={moderateWidthScale(13)}
                color="#FFFFFF"
              />
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderInfoRow = (icon: IconName, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialIcons
          name={icon}
          size={moderateWidthScale(17)}
          color={theme.darkGreen}
        />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: GivesBackRecommendation }) => {
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
    const open = openId === item.id;
    const files = item.documents ?? [];
    const initial = (item.family_name?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => setOpenId(open ? null : item.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${item.family_name}, ${statusLabel(item.status)}`}
      >
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={open ? undefined : 1}>
              {item.family_name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {dayjs(item.created_at).format("MMM D, YYYY")}
              </Text>
              {files.length ? (
                <>
                  <View style={styles.metaDot} />
                  <MaterialIcons
                    name="attach-file"
                    size={moderateWidthScale(14)}
                    color={theme.lightGreen}
                  />
                  <Text style={styles.meta}>
                    {t("givesBackFilesCount", { count: files.length })}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <MaterialIcons
              name={status.icon}
              size={moderateWidthScale(13)}
              color={status.fg}
            />
            <Text style={[styles.badgeText, { color: status.fg }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        {open ? (
          <View style={styles.details}>
            <View>
              <Text style={styles.sectionLabel}>
                {t("givesBackDescription")}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>

            <View style={styles.infoBox}>
              {renderInfoRow(
                "call",
                t("givesBackContactNumber"),
                item.contact_number,
              )}
              {item.relationship ? (
                <>
                  <View style={styles.infoDivider} />
                  {renderInfoRow(
                    "people-outline",
                    t("givesBackRelationship"),
                    item.relationship,
                  )}
                </>
              ) : null}
            </View>

            {files.length ? (
              <View>
                <Text style={styles.sectionLabel}>
                  {t("givesBackProof")} · {files.length}
                </Text>
                <View
                  style={[styles.files, { gap: FILE_GAP }]}
                  onLayout={(e) => {
                    const w = Math.round(e.nativeEvent.layout.width);
                    if (w > 0 && w !== filesWidth) setFilesWidth(w);
                  }}
                >
                  {tileSize > 0 ? files.map(renderFile) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.preview} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.toggle}>
          <Text style={styles.toggleText}>
            {open ? t("givesBackHideDetails") : t("givesBackViewDetails")}
          </Text>
          <MaterialIcons
            name={open ? "expand-less" : "expand-more"}
            size={moderateWidthScale(20)}
            color={theme.darkGreen}
          />
        </View>
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
        ListHeaderComponent={
          items?.length ? (
            <View style={styles.intro}>
              <Image
                source={IMAGES.givesBackIcon}
                style={styles.introIcon}
                contentFit="contain"
                accessible={false}
              />
              <Text style={styles.introText}>
                {t("givesBackListIntroPrefix")}{" "}
                <Text style={styles.introCount}>
                  {t("givesBackFamiliesCount", { count: total })}
                </Text>
                {t("givesBackListIntroSuffix")}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={theme.darkGreen} /> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Image
                source={IMAGES.givesBackIcon}
                style={styles.emptyImage}
                contentFit="contain"
                accessible={false}
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

      <Modal
        visible={!!previewUrl}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={styles.viewerImage}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <TouchableOpacity
            style={[
              styles.viewerClose,
              { top: insets.top + moderateHeightScale(8) },
            ]}
            onPress={() => setPreviewUrl(null)}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            hitSlop={8}
          >
            <MaterialIcons
              name="close"
              size={moderateWidthScale(24)}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
